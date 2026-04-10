import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/client'
import { buildDripDay2FirstFindEmail } from '@/lib/email/templates/drip-day2-first-find'
import { buildDripDay5ConnectPlatformEmail } from '@/lib/email/templates/drip-day5-connect-platform'
import { buildDripDay14FeedbackEmail } from '@/lib/email/templates/drip-day14-feedback'
import {
  getOrCreateUnsubscribeToken,
  buildUnsubscribeUrl,
} from '@/lib/email/unsubscribe'

/**
 * GET /api/cron/drip-emails
 *
 * Runs on a Vercel cron (see vercel.json). Each invocation:
 *   1. Finds users eligible for each drip template
 *   2. Skips users who've already received that template (email_sends dedup)
 *   3. Sends the email
 *   4. Records the send in email_sends
 *
 * ### Auth
 *
 * Vercel cron calls come with `Authorization: Bearer $CRON_SECRET`. We
 * reject anything else to prevent random internet traffic from triggering
 * sends. The secret must be set as `CRON_SECRET` in Vercel env vars.
 *
 * ### Adding more drip emails
 *
 * 1. Create a new template in src/lib/email/templates/drip-*.ts
 * 2. Add a new entry to the DRIP_TEMPLATES array below with:
 *    - slug (matches email_sends.template)
 *    - query (who should receive it)
 *    - build (template builder function)
 * 3. That's it.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.wrenlist.com'

interface DripCandidate {
  user_id: string
  email: string
  full_name: string | null
}

interface DripDefinition {
  slug: string
  description: string
  /**
   * Returns users eligible for this template. Must NOT filter out users
   * who already received it — the caller dedupes via email_sends.
   * Candidate queries SHOULD filter out users with profiles.unsubscribed_at
   * set so we never send to opted-out users.
   */
  findCandidates: (admin: SupabaseClient) => Promise<DripCandidate[]>
  build: (args: {
    firstName: string | null
    appUrl: string
    unsubscribeUrl: string | null
  }) => {
    subject: string
    html: string
    text: string
  }
}

/**
 * Shared: list user ids whose profiles are within a signup-age window AND
 * who are still opted in. Returns the joined user_id/full_name. Email is
 * fetched separately per candidate (see resolveEmails).
 */
async function findProfilesInSignupWindow(
  admin: SupabaseClient,
  minAgeHours: number,
  maxAgeHours: number,
): Promise<Array<{ user_id: string; full_name: string | null }>> {
  const lowerBound = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString()
  const upperBound = new Date(Date.now() - minAgeHours * 60 * 60 * 1000).toISOString()

  const { data } = await admin
    .from('profiles')
    .select('user_id, full_name, created_at, unsubscribed_at')
    .gte('created_at', lowerBound)
    .lt('created_at', upperBound)
    .is('unsubscribed_at', null)

  return (data || []).map((p: { user_id: string; full_name: string | null }) => ({
    user_id: p.user_id,
    full_name: p.full_name,
  }))
}

async function resolveEmail(
  admin: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId)
  return data?.user?.email || null
}

const DRIP_TEMPLATES: DripDefinition[] = [
  {
    slug: 'drip_day2_first_find',
    description:
      '48–96h after signup, sent to users who still have zero finds.',
    findCandidates: async (admin) => {
      const profiles = await findProfilesInSignupWindow(admin, 48, 96)
      const candidates: DripCandidate[] = []

      for (const p of profiles) {
        const { count: findCount } = await admin
          .from('finds')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.user_id)

        if ((findCount ?? 0) > 0) continue

        const email = await resolveEmail(admin, p.user_id)
        if (!email) continue

        candidates.push({ user_id: p.user_id, email, full_name: p.full_name })
      }

      return candidates
    },
    build: buildDripDay2FirstFindEmail,
  },

  {
    slug: 'drip_day5_connect_platform',
    description:
      '5–8 days after signup, sent to users with at least one find but no marketplace connected.',
    findCandidates: async (admin) => {
      const profiles = await findProfilesInSignupWindow(admin, 5 * 24, 8 * 24)
      const candidates: DripCandidate[] = []

      for (const p of profiles) {
        // Must have at least one find
        const { count: findCount } = await admin
          .from('finds')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', p.user_id)

        if ((findCount ?? 0) === 0) continue

        // Must have no connected marketplace. We treat "connected" as
        // "has at least one row in ebay_tokens OR shopify_connections".
        // The Vinted / extension-based platforms have no server-side
        // token storage, so we can't check them here — that's fine,
        // this template is still useful for API-based platforms.
        const [{ count: ebayCount }, { count: shopifyCount }] = await Promise.all([
          admin
            .from('ebay_tokens')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', p.user_id),
          admin
            .from('shopify_connections')
            .select('user_id', { count: 'exact', head: true })
            .eq('user_id', p.user_id),
        ])

        if ((ebayCount ?? 0) > 0 || (shopifyCount ?? 0) > 0) continue

        const email = await resolveEmail(admin, p.user_id)
        if (!email) continue

        candidates.push({ user_id: p.user_id, email, full_name: p.full_name })
      }

      return candidates
    },
    build: buildDripDay5ConnectPlatformEmail,
  },

  {
    slug: 'drip_day14_feedback',
    description:
      '14–18 days after signup, sent to everyone still opted in. Pure feedback ask, no CTA.',
    findCandidates: async (admin) => {
      const profiles = await findProfilesInSignupWindow(admin, 14 * 24, 18 * 24)
      const candidates: DripCandidate[] = []

      for (const p of profiles) {
        const email = await resolveEmail(admin, p.user_id)
        if (!email) continue
        candidates.push({ user_id: p.user_id, email, full_name: p.full_name })
      }

      return candidates
    },
    build: buildDripDay14FeedbackEmail,
  },
]

function getFirstName(fullName: string | null): string | null {
  return fullName?.trim().split(/\s+/)[0] || null
}

export async function GET(request: NextRequest) {
  // Auth
  const authHeader = request.headers.get('authorization') || ''
  const expected = process.env.CRON_SECRET
  if (!expected) {
    console.error('[cron/drip-emails] CRON_SECRET not configured')
    return NextResponse.json(
      { error: 'Cron not configured' },
      { status: 500 },
    )
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service role — cron endpoints need to read/write across all users
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

  const results: Record<string, { considered: number; sent: number; skipped: number; errors: number }> = {}

  for (const template of DRIP_TEMPLATES) {
    const stats = { considered: 0, sent: 0, skipped: 0, errors: 0 }
    try {
      const candidates = await template.findCandidates(admin)
      stats.considered = candidates.length

      for (const candidate of candidates) {
        // Dedup: insert into email_sends first with ON CONFLICT DO NOTHING.
        // If the row already exists (user has already received this
        // template), we skip without sending.
        const { data: insertResult, error: insertErr } = await admin
          .from('email_sends')
          .insert({
            user_id: candidate.user_id,
            template: template.slug,
            resend_message_id: null,
          })
          .select('id')
          .maybeSingle()

        if (insertErr) {
          // Conflict (already sent) — skip silently
          if (insertErr.code === '23505') {
            stats.skipped++
            continue
          }
          console.error(
            `[cron/drip-emails] insert failed for ${template.slug}/${candidate.user_id}:`,
            insertErr,
          )
          stats.errors++
          continue
        }

        if (!insertResult) {
          stats.skipped++
          continue
        }

        // Generate/lookup the user's unsubscribe token so the template
        // can embed a working unsubscribe link. If the token helper
        // fails for any reason we still send without the link — a
        // missing unsub link is better than a missed drip.
        const unsubToken = await getOrCreateUnsubscribeToken(candidate.user_id)
        const unsubscribeUrl = unsubToken ? buildUnsubscribeUrl(unsubToken) : null

        // Build + send
        const tpl = template.build({
          firstName: getFirstName(candidate.full_name),
          appUrl: APP_URL,
          unsubscribeUrl,
        })

        const sendResult = await sendEmail({
          to: candidate.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          replyTo: 'dom@wrenlist.com',
          tags: [
            { name: 'category', value: 'drip' },
            { name: 'template', value: template.slug },
          ],
        })

        if (sendResult.ok) {
          // Backfill the message id on the tracking row
          await admin
            .from('email_sends')
            .update({ resend_message_id: sendResult.id })
            .eq('id', insertResult.id)

          stats.sent++
        } else {
          // Roll back the tracking row so a retry can re-send
          await admin.from('email_sends').delete().eq('id', insertResult.id)
          stats.errors++
          console.error(
            `[cron/drip-emails] send failed for ${template.slug}/${candidate.user_id}:`,
            sendResult.error,
          )
        }
      }
    } catch (err) {
      console.error(
        `[cron/drip-emails] template ${template.slug} threw:`,
        err,
      )
      stats.errors++
    }

    results[template.slug] = stats
  }

  return NextResponse.json({ ok: true, results })
}
