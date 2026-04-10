import { NextRequest, NextResponse } from 'next/server'
import { sendSignupEmails } from '@/lib/email/send-signup-emails'

/**
 * POST /api/auth/signup-notification
 *
 * Fire-and-forget dispatch for welcome email + admin notification, called
 * from two places:
 *
 *   1. The register page client, right after supabase.auth.signUp()
 *      succeeds (before the user is redirected to /verify-email).
 *   2. The /auth/callback route, right after OAuth exchange succeeds
 *      (before redirecting to /onboarding or /dashboard).
 *
 * Body: { userId, email, fullName, signupMethod }
 *
 * ### Why a public endpoint?
 *
 * Email signups don't have a session until email verification completes,
 * so there's no cookie-based auth available at the call site. We could
 * use the service role key to look up user data from the DB, but that
 * adds another required env var and a round-trip. Instead this route
 * trusts the caller-supplied payload.
 *
 * ### Abuse surface
 *
 * An unauthenticated caller could POST arbitrary payloads. The blast
 * radius:
 *   - Admin notification email can be triggered for arbitrary data
 *   - Welcome email can be sent to arbitrary addresses
 *
 * Mitigated by:
 *   - In-process dedup (per-userId cooldown, 5 minutes). A replay from
 *     the same userId is a no-op until the cooldown expires.
 *   - Rate limiting via Vercel/middleware (not added here, but can be)
 *   - The admin email address is NOT taken from the payload; it's
 *     hardcoded via ADMIN_NOTIFICATION_EMAIL env var
 *
 * For beta with low signup volume this is acceptable. Worst case dom
 * gets a couple of extra "new user" pings in his inbox.
 */

interface SignupNotificationBody {
  userId?: string
  email?: string
  fullName?: string | null
  signupMethod?: string
}

// Cold-start-scoped dedup. Persists for the lifetime of a single serverless
// instance. Not perfect across instances, but catches the common case of a
// client replay (browser back button, retry, stuck request).
const recentSends = new Map<string, number>()
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function shouldSkip(userId: string): boolean {
  const last = recentSends.get(userId)
  if (!last) return false
  const age = Date.now() - last
  return age < DEDUP_WINDOW_MS
}

function markSent(userId: string) {
  recentSends.set(userId, Date.now())

  // Lazy cleanup: drop entries older than 1 hour so the map doesn't grow
  // unbounded on long-lived instances.
  if (recentSends.size > 1000) {
    const cutoff = Date.now() - 60 * 60 * 1000
    for (const [key, timestamp] of recentSends.entries()) {
      if (timestamp < cutoff) recentSends.delete(key)
    }
  }
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

    if (shouldSkip(userId)) {
      return NextResponse.json(
        { ok: true, skipped: true, reason: 'dedup_cooldown' },
        { status: 200 },
      )
    }

    const results = await sendSignupEmails({
      userId,
      email,
      fullName: body?.fullName?.trim() || null,
      signupMethod: body?.signupMethod || 'email',
    })

    // Only mark the userId as sent if the welcome actually went through.
    // An admin-only failure shouldn't prevent a retry from sending the
    // welcome; a welcome failure shouldn't prevent a retry either.
    if (results.welcome.ok) {
      markSent(userId)
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
