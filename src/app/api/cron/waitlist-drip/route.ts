import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/client'
import {
  buildWaitlistDripDay3,
  buildWaitlistDripDay7,
  buildWaitlistDripDay10,
  buildWaitlistDripDay14,
} from '@/lib/email/templates/waitlist-drip'

/**
 * GET /api/cron/waitlist-drip
 *
 * Runs daily on a Vercel cron. For each scheduled day (3 / 7 / 10 / 14 after
 * signup), find subscribers in the right window who haven't already received
 * that email, send it, and stamp the corresponding *_sent_at column.
 *
 * Auth: Bearer $CRON_SECRET — same convention as the user-side drip cron.
 */

const MARKETING_URL =
  process.env.NEXT_PUBLIC_MARKETING_URL || 'https://wrenlist.com'

interface DripStep {
  /** Days after signup that this email targets. */
  daysAfterSignup: number
  /** Column on waiting_list to stamp + check for prior sends. */
  sentAtColumn:
    | 'drip_day3_sent_at'
    | 'drip_day7_sent_at'
    | 'drip_day10_sent_at'
    | 'drip_day14_sent_at'
  /** For Resend tag analytics. */
  templateSlug: string
  build: (args: {
    firstName: string | null
    referralUrl: string
    unsubscribeUrl: string | null
  }) => { subject: string; html: string; text: string }
}

const STEPS: DripStep[] = [
  {
    daysAfterSignup: 3,
    sentAtColumn: 'drip_day3_sent_at',
    templateSlug: 'waitlist_drip_day3',
    build: buildWaitlistDripDay3,
  },
  {
    daysAfterSignup: 7,
    sentAtColumn: 'drip_day7_sent_at',
    templateSlug: 'waitlist_drip_day7',
    build: buildWaitlistDripDay7,
  },
  {
    daysAfterSignup: 10,
    sentAtColumn: 'drip_day10_sent_at',
    templateSlug: 'waitlist_drip_day10',
    build: buildWaitlistDripDay10,
  },
  {
    daysAfterSignup: 14,
    sentAtColumn: 'drip_day14_sent_at',
    templateSlug: 'waitlist_drip_day14',
    build: buildWaitlistDripDay14,
  },
]

interface Subscriber {
  id: string
  email: string
  name: string
  referral_code: string
}

async function findEligibleSubscribers(
  admin: SupabaseClient,
  step: DripStep,
): Promise<Subscriber[]> {
  // Window: signed up between (now - daysAfterSignup - 1) and (now - daysAfterSignup)
  // i.e. a 24h slice. Daily cron means each subscriber gets exactly one chance per step,
  // and the sentAtColumn check guards against duplicate sends if cron runs multiple times.
  const upper = new Date(Date.now() - step.daysAfterSignup * 24 * 60 * 60 * 1000).toISOString()
  const lower = new Date(Date.now() - (step.daysAfterSignup + 1) * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from('waiting_list')
    .select(`id, email, name, referral_code, ${step.sentAtColumn}, subscribed, unsubscribed_at, beta_invite_sent_at, created_at`)
    .gte('created_at', lower)
    .lt('created_at', upper)
    .eq('subscribed', true)
    .is('unsubscribed_at', null)
    .is(step.sentAtColumn, null)
    .is('beta_invite_sent_at', null) // Once they got the beta invite, stop the drip
    .limit(500)

  if (error) {
    console.error(`[cron/waitlist-drip] query failed for ${step.templateSlug}:`, error)
    return []
  }

  return (data || []) as unknown as Subscriber[]
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const expected = process.env.CRON_SECRET
  if (!expected) {
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

  const results: Record<string, { considered: number; sent: number; errors: number }> = {}

  for (const step of STEPS) {
    const stats = { considered: 0, sent: 0, errors: 0 }
    const subscribers = await findEligibleSubscribers(admin, step)
    stats.considered = subscribers.length

    for (const sub of subscribers) {
      // Stamp the sent_at column FIRST (with a conditional update so concurrent
      // runs can't double-send). If the update returns 0 rows we know another
      // run already claimed this subscriber.
      const sentAt = new Date().toISOString()
      const { data: claimed, error: claimErr } = await admin
        .from('waiting_list')
        .update({ [step.sentAtColumn]: sentAt })
        .eq('id', sub.id)
        .is(step.sentAtColumn, null)
        .select('id')
        .maybeSingle()

      if (claimErr || !claimed) {
        if (claimErr) console.error(`[cron/waitlist-drip] claim failed:`, claimErr)
        continue
      }

      const firstName = sub.name?.trim().split(/\s+/)[0] || null
      const referralUrl = `${MARKETING_URL}/?ref=${encodeURIComponent(sub.referral_code)}`

      const tpl = step.build({
        firstName,
        referralUrl,
        unsubscribeUrl: null, // TODO: per-subscriber unsubscribe token
      })

      const result = await sendEmail({
        to: sub.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        replyTo: 'dom@wrenlist.com',
        tags: [
          { name: 'category', value: 'waitlist_drip' },
          { name: 'template', value: step.templateSlug },
        ],
      })

      if (result.ok) {
        stats.sent++
      } else {
        // Roll back the sent_at stamp so the next run can retry.
        await admin
          .from('waiting_list')
          .update({ [step.sentAtColumn]: null })
          .eq('id', sub.id)
        stats.errors++
        console.error(
          `[cron/waitlist-drip] send failed for ${step.templateSlug}/${sub.id}:`,
          result.error,
        )
      }
    }

    results[step.templateSlug] = stats
  }

  return NextResponse.json({ ok: true, results })
}
