import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/client'
import { buildDripDay2FirstFindEmail } from '@/lib/email/templates/drip-day2-first-find'

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
   */
  findCandidates: (admin: SupabaseClient) => Promise<DripCandidate[]>
  build: (args: { firstName: string | null; appUrl: string }) => {
    subject: string
    html: string
    text: string
  }
}

const DRIP_TEMPLATES: DripDefinition[] = [
  {
    slug: 'drip_day2_first_find',
    description: '48h after signup, if the user has no finds yet',
    findCandidates: async (admin) => {
      // Users who signed up between 48 and 96 hours ago and have zero finds.
      // The 96-hour upper bound prevents backfilling ancient inactive users
      // the first time the cron runs in production.
      const lowerBound = new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString()
      const upperBound = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

      // Fetch profiles + their email from auth.users via a left join.
      // We can't join directly from profiles to auth.users via PostgREST
      // (Supabase blocks that), so we do it in two queries.
      const { data: profiles } = await admin
        .from('profiles')
        .select('user_id, full_name, created_at')
        .gte('created_at', lowerBound)
        .lt('created_at', upperBound)

      if (!profiles || profiles.length === 0) return []

      const candidates: DripCandidate[] = []

      for (const profile of profiles as Array<{
        user_id: string
        full_name: string | null
      }>) {
        // Skip if they already have a find
        const { count: findCount } = await admin
          .from('finds')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.user_id)

        if ((findCount ?? 0) > 0) continue

        // Fetch the auth.users email
        const { data: userResp } = await admin.auth.admin.getUserById(
          profile.user_id,
        )
        const email = userResp?.user?.email
        if (!email) continue

        candidates.push({
          user_id: profile.user_id,
          email,
          full_name: profile.full_name,
        })
      }

      return candidates
    },
    build: buildDripDay2FirstFindEmail,
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

        // Build + send
        const tpl = template.build({
          firstName: getFirstName(candidate.full_name),
          appUrl: APP_URL,
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
