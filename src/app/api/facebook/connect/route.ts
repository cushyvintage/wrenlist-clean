import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/facebook/connect
 * Returns connection status for current user
 */
export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()

  const { data: connection, error } = await supabase
    .from('facebook_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !connection) {
    return ApiResponseHelper.success({
      connected: false,
      facebookUsername: null,
      facebookUserId: null,
    })
  }

  return ApiResponseHelper.success({
    connected: true,
    facebookUsername: connection.facebook_username,
    facebookUserId: connection.facebook_user_id,
  })
})

/**
 * POST /api/facebook/connect
 * Save Facebook connection (called after extension detects login)
 *
 * Body: { facebookUserId }
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { facebookUserId } = body

  if (!facebookUserId) {
    return ApiResponseHelper.badRequest('Missing facebookUserId')
  }

  const supabase = await createSupabaseServerClient()

  const { data: connection, error } = await supabase
    .from('facebook_connections')
    .upsert(
      {
        user_id: user.id,
        facebook_user_id: facebookUserId,
        // Facebook doesn't have a public username API — display name would
        // need to be scraped from the profile page, which is fragile.
        // We store the user ID for now; username can be added later.
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
    facebookUsername: connection.facebook_username,
    facebookUserId: connection.facebook_user_id,
  })
})

/**
 * DELETE /api/facebook/connect
 * Remove Facebook connection
 */
export const DELETE = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('facebook_connections')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return ApiResponseHelper.internalError(`Failed to delete connection: ${error.message}`)
  }

  return ApiResponseHelper.success({ message: 'Connection removed' })
})
