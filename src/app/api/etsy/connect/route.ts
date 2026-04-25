import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/etsy/connect
 * Returns Etsy connection status for current user
 */
export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()

  const { data: connection, error } = await supabase
    .from('etsy_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !connection) {
    return ApiResponseHelper.success({
      connected: false,
      etsyUsername: null,
      etsyUserId: null,
    })
  }

  return ApiResponseHelper.success({
    connected: true,
    etsyUsername: connection.etsy_username,
    etsyUserId: connection.etsy_user_id,
  })
})

/**
 * POST /api/etsy/connect
 * Save Etsy connection (called by extension after user logs in)
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { etsyUserId } = body
  let { etsyUsername } = body

  if (!etsyUserId) {
    return ApiResponseHelper.badRequest('Missing etsyUserId')
  }

  const supabase = await createSupabaseServerClient()

  // Preserve a previously-resolved shop name when the incoming value is
  // the generic fallback ("etsy"), the opaque etsy_user_id, or empty.
  // check_marketplace_login returns an empty username for Etsy, so clients
  // fall back to "etsy" unless they've done a follow-up SSR scrape.
  // We'd rather show no username than a misleading placeholder.
  const isFallback = (v: string | null | undefined) =>
    !v || v === 'etsy' || v === etsyUserId
  if (isFallback(etsyUsername)) {
    const { data: existing } = await supabase
      .from('etsy_connections')
      .select('etsy_username')
      .eq('user_id', user.id)
      .single()
    if (existing?.etsy_username && !isFallback(existing.etsy_username)) {
      etsyUsername = existing.etsy_username
    }
  }

  // Persist null when no real shop name was resolved. The UI must handle
  // this with a placeholder ("Etsy shop") rather than rendering "@etsy"
  // or "@<opaque-blob>". The shop-stats / SSR scrape will fill it in later.
  const finalUsername = isFallback(etsyUsername) ? null : etsyUsername

  const { data: connection, error } = await supabase
    .from('etsy_connections')
    .upsert(
      {
        user_id: user.id,
        etsy_user_id: etsyUserId,
        etsy_username: finalUsername,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    return ApiResponseHelper.internalError(`Failed to save connection: ${error.message}`)
  }

  return ApiResponseHelper.success({
    connected: true,
    etsyUsername: connection.etsy_username,
    etsyUserId: connection.etsy_user_id,
  })
})

/**
 * DELETE /api/etsy/connect
 * Remove Etsy connection
 */
export const DELETE = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('etsy_connections')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return ApiResponseHelper.internalError(`Failed to delete connection: ${error.message}`)
  }

  return ApiResponseHelper.success({ message: 'Connection removed' })
})
