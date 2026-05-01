import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/vinted/connect
 * Returns connection status for current user
 */
export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()

  const { data: connection, error } = await supabase
    .from('vinted_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !connection) {
    return ApiResponseHelper.success({
      connected: false,
      vintedUsername: null,
      vintedUserId: null,
      isBusiness: false,
      businessAccountType: null,
    })
  }

  return ApiResponseHelper.success({
    connected: true,
    vintedUsername: connection.vinted_username,
    vintedUserId: connection.vinted_user_id,
    isBusiness: connection.is_business ?? false,
    businessAccountType: connection.business_account_type ?? null,
  })
})

/**
 * Best-effort server-side resolution of a Vinted numeric id to a login name.
 *
 * The extension's authenticated path (`fetch_vinted_api`) is the primary
 * resolver, but it can fail on a fresh signup if Vinted's CSRF bootstrap is
 * blocked by Cloudflare and the extension's tab fallback is disabled. This
 * fallback gives the connect a second chance from the server side.
 *
 *  1. Try the public JSON API (`/api/v2/users/:id`). May 401 from Vercel IPs
 *     without session cookies, but sometimes still works depending on edge
 *     state — costs nothing to attempt.
 *  2. Fall back to scraping the public profile page (`/member/:id`). The
 *     marketing-facing profile HTML doesn't require auth and surfaces the
 *     login in the og:title meta tag and the page <title>.
 *
 * Returns null if both attempts fail or return numeric/empty values.
 */
async function resolveVintedLoginServerSide(
  numericId: string,
  tld: string,
): Promise<string | null> {
  try {
    const apiRes = await fetch(`https://www.vinted.${tld}/api/v2/users/${numericId}`, {
      headers: { Accept: 'application/json' },
    })
    if (apiRes.ok) {
      const data = await apiRes.json()
      const login = data?.user?.login
      if (typeof login === 'string' && login && !/^\d+$/.test(login)) {
        return login
      }
    }
  } catch {
    // Non-fatal — try HTML fallback below.
  }

  try {
    const htmlRes = await fetch(`https://www.vinted.${tld}/member/${numericId}`, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (compatible; WrenlistBot/1.0)',
      },
      redirect: 'follow',
    })
    if (htmlRes.ok) {
      const html = await htmlRes.text()
      const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']@?([^"'<>|]+?)["']/i)
      const ogLogin = ogMatch?.[1]?.trim()
      if (ogLogin && !/^\d+$/.test(ogLogin)) return ogLogin
      const titleMatch = html.match(/<title>\s*@?([^|<]+?)\s*\|/i)
      const titleLogin = titleMatch?.[1]?.trim()
      if (titleLogin && !/^\d+$/.test(titleLogin) && !/vinted/i.test(titleLogin)) {
        return titleLogin
      }
    }
  } catch {
    // Non-fatal — caller will keep the numeric id.
  }

  return null
}

/**
 * POST /api/vinted/connect
 * Save Vinted connection (called by extension after user logs in).
 *
 * Body: { vintedUserId, vintedUsername, tld?, isBusiness? }
 *
 * Note on business detection: the Vinted user detail API (`/api/v2/users/:id`)
 * returns a `business` flag that indicates Pro/business sellers. That endpoint
 * requires an authenticated Vinted session cookie, which lives in the
 * extension — not on our server. The extension therefore fetches it via
 * `fetch_vinted_api` and forwards the resolved boolean as `isBusiness` in this
 * POST body. When `isBusiness` is absent/null we preserve the existing value.
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  let { vintedUserId, vintedUsername } = body
  const tld: string = typeof body.tld === 'string' && body.tld ? body.tld : 'co.uk'
  const incomingIsBusiness: boolean | null =
    typeof body.isBusiness === 'boolean' ? body.isBusiness : null

  if (!vintedUserId || !vintedUsername) {
    return ApiResponseHelper.badRequest('Missing vintedUserId or vintedUsername')
  }

  const supabase = await createSupabaseServerClient()

  // If incoming username is numeric, try to recover a real login.
  // Order: previously-resolved DB value → server-side public lookup →
  // give up and store the numeric id (caller will retry on next page load).
  if (/^\d+$/.test(vintedUsername)) {
    const { data: existing } = await supabase
      .from('vinted_connections')
      .select('vinted_username')
      .eq('user_id', user.id)
      .single()
    if (existing?.vinted_username && !/^\d+$/.test(existing.vinted_username)) {
      vintedUsername = existing.vinted_username
    } else {
      const numericId = String(vintedUserId).match(/^\d+$/) ? String(vintedUserId) : vintedUsername
      const resolved = await resolveVintedLoginServerSide(numericId, tld)
      if (resolved) {
        vintedUsername = resolved
      }
    }
  }

  // Build upsert payload. Only overwrite business fields when the extension
  // resolved them for us — otherwise keep any previously stored value.
  const payload: Record<string, unknown> = {
    user_id: user.id,
    vinted_user_id: vintedUserId,
    vinted_username: vintedUsername,
    updated_at: new Date().toISOString(),
  }
  if (incomingIsBusiness !== null) {
    payload.is_business = incomingIsBusiness
    payload.business_account_type = incomingIsBusiness ? 'pro' : null
  }

  const { data: connection, error } = await supabase
    .from('vinted_connections')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()

  if (error) {
    return ApiResponseHelper.internalError(`Failed to save connection: ${error.message}`)
  }

  return ApiResponseHelper.success({
    connected: true,
    vintedUsername: connection.vinted_username,
    vintedUserId: connection.vinted_user_id,
    isBusiness: connection.is_business ?? false,
    businessAccountType: connection.business_account_type ?? null,
  })
})

/**
 * DELETE /api/vinted/connect
 * Remove Vinted connection
 */
export const DELETE = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('vinted_connections')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return ApiResponseHelper.internalError(`Failed to delete connection: ${error.message}`)
  }

  return ApiResponseHelper.success({ message: 'Connection removed' })
})
