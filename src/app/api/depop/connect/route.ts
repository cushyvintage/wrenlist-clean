import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/depop/connect
 * Returns Depop connection status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()

    const { data: connection, error } = await supabase
      .from('depop_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error || !connection) {
      return ApiResponseHelper.success({
        connected: false,
        depopUsername: null,
        depopUserId: null,
      })
    }

    return ApiResponseHelper.success({
      connected: true,
      depopUsername: connection.depop_username,
      depopUserId: connection.depop_user_id,
    })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/depop/connect
 * Save Depop connection (called by extension after user logs in)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const body = await request.json()
    const { depopUserId, depopUsername } = body

    if (!depopUserId) {
      return ApiResponseHelper.badRequest('Missing depopUserId')
    }

    const supabase = await createSupabaseServerClient()

    const { data: connection, error } = await supabase
      .from('depop_connections')
      .upsert(
        {
          user_id: user.id,
          depop_user_id: depopUserId,
          depop_username: depopUsername || depopUserId,
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
      depopUsername: connection.depop_username,
      depopUserId: connection.depop_user_id,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return ApiResponseHelper.internalError(msg)
  }
}

/**
 * DELETE /api/depop/connect
 * Remove Depop connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('depop_connections')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      return ApiResponseHelper.internalError(`Failed to delete connection: ${error.message}`)
    }

    return ApiResponseHelper.success({ message: 'Connection removed' })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
