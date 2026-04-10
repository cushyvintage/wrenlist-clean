import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSignupEmails } from '@/lib/email/send-signup-emails'

/**
 * POST /api/auth/signup-notification
 *
 * Dispatches welcome + admin notification emails the first time a user
 * signs up. Called from two places:
 *
 *   1. The register page client, right after supabase.auth.signUp()
 *      succeeds (before the user is redirected to /verify-email).
 *   2. The /auth/callback route, right after an OAuth exchange succeeds
 *      (before redirecting to /onboarding or /dashboard).
 *
 * Body: { userId, email, fullName?, signupMethod? }
 *
 * ### Dedup
 *
 * The /auth/callback route fires on EVERY OAuth login, not just the
 * first one. Without persistent dedup, a returning Google user would
 * trigger an admin email on every single login. We use the email_sends
 * table as persistent per-user dedup: one `(userId, 'welcome')` row per
 * user, ever. The INSERT is the dedup check — if it hits the UNIQUE
 * constraint, we know this user has already been welcomed and we skip.
 *
 * ### Why a public endpoint?
 *
 * Email signups don't have a cookie session until email verification,
 * so there's no cookie-based auth at the call site. The endpoint trusts
 * the caller-supplied payload for userId/email/name. The abuse surface
 * is limited because:
 *   - The admin email address is hardcoded via ADMIN_NOTIFICATION_EMAIL,
 *     never taken from the payload
 *   - The email_sends dedup means an attacker can only ever trigger ONE
 *     admin ping per valid userId (first-touch wins)
 *   - Welcome emails go to the supplied address, so the abuse is
 *     "spam an arbitrary inbox once" — acceptable for beta
 */

interface SignupNotificationBody {
  userId?: string
  email?: string
  fullName?: string | null
  signupMethod?: string
}

const TEMPLATE_SLUG = 'welcome'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | SignupNotificationBody
      | null

    const userId = body?.userId?.trim()
    const email = body?.email?.trim()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'userId and email are required' },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    if (!admin) {
      console.error(
        '[signup-notification] Supabase service role not configured',
      )
      return NextResponse.json(
        { error: 'Server misconfigured' },
        { status: 500 },
      )
    }

    // Persistent dedup via email_sends. Insert first — if the row already
    // exists (UNIQUE(user_id, template)), this user has already received
    // the welcome flow and we exit without sending anything.
    //
    // We insert with resend_message_id: null and backfill on success.
    // If the email send itself fails later, we roll the row back so a
    // retry can re-send.
    const { data: insertResult, error: insertErr } = await admin
      .from('email_sends')
      .insert({
        user_id: userId,
        template: TEMPLATE_SLUG,
        resend_message_id: null,
      })
      .select('id')
      .maybeSingle()

    if (insertErr) {
      // 23505 = unique_violation = already sent. This is the common case
      // for every non-first-time login.
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { ok: true, skipped: true, reason: 'already_sent' },
          { status: 200 },
        )
      }

      console.error('[signup-notification] insert failed:', insertErr)
      return NextResponse.json(
        { error: 'Failed to record send' },
        { status: 500 },
      )
    }

    if (!insertResult) {
      // Defensive: maybeSingle returned null but no error. Treat as already
      // sent to avoid a double-send.
      return NextResponse.json(
        { ok: true, skipped: true, reason: 'already_sent' },
        { status: 200 },
      )
    }

    const results = await sendSignupEmails({
      userId,
      email,
      fullName: body?.fullName?.trim() || null,
      signupMethod: body?.signupMethod || 'email',
    })

    if (results.welcome.ok) {
      // Backfill the Resend message id for observability
      await admin
        .from('email_sends')
        .update({ resend_message_id: results.welcome.detail })
        .eq('id', insertResult.id)
    } else {
      // Send failed — roll back the dedup row so a future call can retry.
      // The admin email might have gone through; that's a tolerable
      // duplicate risk, better than never sending the welcome.
      await admin.from('email_sends').delete().eq('id', insertResult.id)
    }

    return NextResponse.json({ ok: true, skipped: false, results })
  } catch (err) {
    console.error('[signup-notification] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
