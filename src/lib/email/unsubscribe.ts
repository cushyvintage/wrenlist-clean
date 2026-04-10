import crypto from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Unsubscribe token helpers.
 *
 * We generate an opaque 32-byte hex token per user and bake it into every
 * email's unsubscribe link. Clicking the link hits /api/email/unsubscribe
 * which sets profiles.unsubscribed_at. The drip cron filters out anyone
 * with unsubscribed_at set.
 *
 * Transactional emails (verification, password reset, admin notifications
 * sent to Dom) are NOT affected by unsubscribe — those always send.
 * Only drip / follow-up emails honour the flag.
 */

/**
 * Creates a service-role Supabase client. Used by unsubscribe-related code
 * because the target rows must be writable without a user session.
 */
function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Get the unsubscribe token for a user, generating one lazily if absent.
 * Returns null if the DB write fails or Supabase isn't configured — the
 * caller should then fall back to omitting the unsubscribe link from the
 * email rather than blocking the send.
 */
export async function getOrCreateUnsubscribeToken(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient()
  if (!admin) return null

  try {
    const { data: profile, error: readErr } = await admin
      .from('profiles')
      .select('unsubscribe_token')
      .eq('user_id', userId)
      .single()

    if (readErr || !profile) return null

    if (profile.unsubscribe_token) {
      return profile.unsubscribe_token
    }

    const token = crypto.randomBytes(32).toString('hex')
    const { error: writeErr } = await admin
      .from('profiles')
      .update({ unsubscribe_token: token })
      .eq('user_id', userId)
      .is('unsubscribe_token', null)

    if (writeErr) return null
    return token
  } catch {
    return null
  }
}

/**
 * Build the public unsubscribe URL for a given token. Safe to embed in
 * plain-text or HTML emails. Token is opaque and only valid for the user
 * it was generated for.
 */
export function buildUnsubscribeUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || 'https://app.wrenlist.com'
  return `${base}/api/email/unsubscribe?token=${encodeURIComponent(token)}`
}

/**
 * Mark a user as unsubscribed by their token. Returns the user id on
 * success, null if the token is unknown or the write fails.
 */
export async function unsubscribeByToken(
  token: string,
): Promise<string | null> {
  if (!token || token.length < 16) return null

  const admin = createAdminClient()
  if (!admin) return null

  try {
    const { data, error } = await admin
      .from('profiles')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .is('unsubscribed_at', null)
      .select('user_id')
      .maybeSingle()

    if (error || !data) return null
    return data.user_id as string
  } catch {
    return null
  }
}
