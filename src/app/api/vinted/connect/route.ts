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
  const incomingIsBusiness: boolean | null =
    typeof body.isBusiness === 'boolean' ? body.isBusiness : null

  if (!vintedUserId || !vintedUsername) {
    return ApiResponseHelper.badRequest('Missing vintedUserId or vintedUsername')
  }

  const supabase = await createSupabaseServerClient()

  // If incoming username is numeric, try to preserve a previously resolved
  // display name from the DB (the extension sometimes sends the numeric id
  // before bootstrap resolves the login).
  if (/^\d+$/.test(vintedUsername)) {
    const { data: existing } = await supabase
      .from('vinted_connections')
      .select('vinted_username')
      .eq('user_id', user.id)
      .single()
    if (existing?.vinted_username && !/^\d+$/.test(existing.vinted_username)) {
      vintedUsername = existing.vinted_username
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
