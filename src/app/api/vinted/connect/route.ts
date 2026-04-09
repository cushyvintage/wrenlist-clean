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
    })
  }

  return ApiResponseHelper.success({
    connected: true,
    vintedUsername: connection.vinted_username,
    vintedUserId: connection.vinted_user_id,
  })
})

/**
 * POST /api/vinted/connect
 * Save Vinted connection (called by extension after user logs in)
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  let { vintedUserId, vintedUsername } = body

  if (!vintedUserId || !vintedUsername) {
    return ApiResponseHelper.badRequest('Missing vintedUserId or vintedUsername')
  }

  const supabase = await createSupabaseServerClient()

  // If incoming username is numeric, check if DB already has a resolved name
  if (/^\d+$/.test(vintedUsername)) {
    const { data: existing } = await supabase
      .from('vinted_connections')
      .select('vinted_username')
      .eq('user_id', user.id)
      .single()
    if (existing?.vinted_username && !/^\d+$/.test(existing.vinted_username)) {
      vintedUsername = existing.vinted_username
    } else {
      // Try to resolve via Vinted public API
      try {
        const tld = body.tld || 'co.uk'
        const res = await fetch(`https://www.vinted.${tld}/api/v2/users/${vintedUsername}`, {
          headers: { 'Accept': 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.user?.login) {
            vintedUsername = data.user.login
          }
        }
      } catch {
        // Keep numeric ID as fallback
      }
    }
  }

  // Upsert connection
  const { data: connection, error } = await supabase
    .from('vinted_connections')
    .upsert(
      {
        user_id: user.id,
        vinted_user_id: vintedUserId,
        vinted_username: vintedUsername,
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
    vintedUsername: connection.vinted_username,
    vintedUserId: connection.vinted_user_id,
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
