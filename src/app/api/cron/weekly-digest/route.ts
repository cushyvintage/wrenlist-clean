import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/client'
import { buildWeeklyDigestEmail } from '@/lib/email/templates/weekly-digest'
import {
  getOrCreateUnsubscribeToken,
  buildUnsubscribeUrl,
} from '@/lib/email/unsubscribe'
import { loadContext } from '@/lib/insights/context'
import { runRules } from '@/lib/insights/engine'

/**
 * GET /api/cron/weekly-digest
 *
 * Runs every Sunday morning via Vercel cron. For each active (opted-in)
 * user who has at least 3 finds:
 *
 *   1. Compute last-7-day stats (items added, sold, revenue, profit)
 *      directly from the `finds` table (fast, no joins).
 *   2. Run the insight engine to get the top 3 insights right now.
 *   3. Build + send the digest via Resend.
 *   4. Record in `email_sends` with a weekly-unique template slug
 *      (`weekly-digest-{ISO week}`) so re-runs in the same week dedup.
 *
 * Auth: Vercel sends Authorization: Bearer $CRON_SECRET.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.wrenlist.com'

interface Candidate {
  user_id: string
  email: string
  full_name: string | null
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/**
 * ISO week stamp like `2026-W15`. Used to make the email_sends template
 * slug week-unique so the UNIQUE(user_id, template) constraint dedupes
 * re-runs within the same week but allows the next week through.
 */
function isoWeekStamp(d: Date): string {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const dayNum = (target.getUTCDay() + 6) % 7
  target.setUTCDate(target.getUTCDate() - dayNum + 3)
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4))
  const weekNum =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    )
  return `${target.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

async function loadCandidates(admin: SupabaseClient): Promise<Candidate[]> {
  // Get all opted-in profiles with a finds count check.
  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, full_name')
    .is('unsubscribed_at', null)

  if (!profiles) return []

  const candidates: Candidate[] = []
  for (const profile of profiles) {
    // Require at least 3 finds — below that the new-user drip emails
    // are the right channel, not a digest.
    const { count } = await admin
      .from('finds')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.user_id)
    if (!count || count < 3) continue

    // Fetch the user's email via auth.admin.getUserById — profiles
    // doesn't store it directly.
    const { data: userResult } = await admin.auth.admin.getUserById(profile.user_id)
    const email = userResult?.user?.email
    if (!email) continue

    candidates.push({ user_id: profile.user_id, email, full_name: profile.full_name })
  }
  return candidates
}

interface WeekActivitySnapshot {
  itemsAdded: number
  itemsSold: number
  revenue: number
  profit: number
  listedCount: number
}

/**
 * Lightweight week snapshot — three parallel `head:true` count queries
 * for added/sold/listed and one small row-read for revenue/profit. Used
 * BEFORE loadContext so we can skip dead accounts without pulling every
 * find into memory.
 *
 * The revenue/profit still row-reads `sold_price_gbp, cost_gbp` because
 * PostgREST doesn't expose aggregate functions. Supabase RPC would be
 * the clean fix — flagged for a follow-up migration. For today (weekly
 * sales per user are typically ≤50 rows), the payload is negligible.
 */
async function loadWeekSnapshot(
  admin: SupabaseClient,
  userId: string,
): Promise<WeekActivitySnapshot> {
  const since = new Date(Date.now() - WEEK_MS).toISOString()

  const [addedResult, soldRowsResult, listedResult] = await Promise.all([
    admin
      .from('finds')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since),
    admin
      .from('finds')
      .select('cost_gbp,sold_price_gbp')
      .eq('user_id', userId)
      .eq('status', 'sold')
      .gte('sold_at', since),
    admin
      .from('finds')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'listed'),
  ])

  const soldRows = (soldRowsResult.data ?? []) as Array<{
    cost_gbp: number | null
    sold_price_gbp: number | null
  }>
  const revenue = soldRows.reduce((sum, r) => sum + (r.sold_price_gbp ?? 0), 0)
  const profit = soldRows.reduce(
    (sum, r) => sum + ((r.sold_price_gbp ?? 0) - (r.cost_gbp ?? 0)),
    0,
  )

  return {
    itemsAdded: addedResult.count ?? 0,
    itemsSold: soldRows.length,
    revenue,
    profit,
    listedCount: listedResult.count ?? 0,
  }
}

function getFirstName(fullName: string | null): string | null {
  return fullName?.trim().split(/\s+/)[0] || null
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const expected = process.env.CRON_SECRET
  if (!expected) {
    console.error('[cron/weekly-digest] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Supabase service role not configured' },
      { status: 500 },
    )
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const weekStamp = isoWeekStamp(new Date())
  const templateSlug = `weekly-digest-${weekStamp}`

  const stats = { considered: 0, sent: 0, skipped: 0, errors: 0 }

  try {
    const candidates = await loadCandidates(admin)
    stats.considered = candidates.length

    for (const candidate of candidates) {
      // Dedup via insert into email_sends with UNIQUE(user_id, template).
      // If the user already received this week's digest, the insert
      // 23505s and we skip.
      const { data: insertResult, error: insertErr } = await admin
        .from('email_sends')
        .insert({
          user_id: candidate.user_id,
          template: templateSlug,
          resend_message_id: null,
        })
        .select('id')
        .maybeSingle()

      if (insertErr) {
        if (insertErr.code === '23505') {
          stats.skipped++
          continue
        }
        console.error(
          `[cron/weekly-digest] insert failed for ${candidate.user_id}:`,
          insertErr,
        )
        stats.errors++
        continue
      }
      if (!insertResult) {
        stats.skipped++
        continue
      }

      try {
        // Cheap gate first — three small count queries. If the user has
        // no activity AND no live stock, skip without pulling loadContext's
        // ~5 heavy queries.
        const snapshot = await loadWeekSnapshot(admin, candidate.user_id)
        if (
          snapshot.itemsAdded === 0 &&
          snapshot.itemsSold === 0 &&
          snapshot.listedCount === 0
        ) {
          await admin.from('email_sends').delete().eq('id', insertResult.id)
          stats.skipped++
          continue
        }

        const ctx = await loadContext(admin, candidate.user_id)

        // logEvents:false — this is a background cron, not a UI surface.
        // Logging these runs would pollute /insights history with events
        // the user never actually saw.
        const insights = await runRules(admin, ctx, { limit: 3, logEvents: false })

        const weekStats = {
          itemsAdded: snapshot.itemsAdded,
          itemsSold: snapshot.itemsSold,
          revenue: snapshot.revenue,
          profit: snapshot.profit,
        }

        const unsubToken = await getOrCreateUnsubscribeToken(candidate.user_id)
        const unsubscribeUrl = unsubToken ? buildUnsubscribeUrl(unsubToken) : null

        const tpl = buildWeeklyDigestEmail({
          firstName: getFirstName(candidate.full_name),
          appUrl: APP_URL,
          weekStats,
          insights: insights.map((i) => ({
            key: i.key,
            type: i.type,
            text: i.text,
            cta: i.cta,
          })),
          unsubscribeUrl,
        })

        const sendResult = await sendEmail({
          to: candidate.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          replyTo: 'dom@wrenlist.com',
          tags: [
            { name: 'category', value: 'digest' },
            { name: 'template', value: 'weekly-digest' },
            { name: 'week', value: weekStamp },
          ],
        })

        if (sendResult.ok) {
          await admin
            .from('email_sends')
            .update({ resend_message_id: sendResult.id })
            .eq('id', insertResult.id)
          stats.sent++
        } else {
          await admin.from('email_sends').delete().eq('id', insertResult.id)
          stats.errors++
          console.error(
            `[cron/weekly-digest] send failed for ${candidate.user_id}:`,
            sendResult.error,
          )
        }
      } catch (innerErr) {
        console.error(
          `[cron/weekly-digest] build/send threw for ${candidate.user_id}:`,
          innerErr,
        )
        // Roll back so a retry can re-send.
        await admin.from('email_sends').delete().eq('id', insertResult.id)
        stats.errors++
      }
    }
  } catch (err) {
    console.error('[cron/weekly-digest] top-level failure:', err)
    return NextResponse.json({ error: 'Cron failed', stats }, { status: 500 })
  }

  return NextResponse.json({ ok: true, weekStamp, stats })
}
