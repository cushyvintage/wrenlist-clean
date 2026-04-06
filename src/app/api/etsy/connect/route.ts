import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/etsy/connect
 * Returns Etsy connection status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

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
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/etsy/connect
 * Save Etsy connection (called by extension after user logs in)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const body = await request.json()
    const { etsyUserId, etsyUsername } = body

    if (!etsyUserId) {
      return ApiResponseHelper.badRequest('Missing etsyUserId')
    }

    const supabase = await createSupabaseServerClient()

    const { data: connection, error } = await supabase
      .from('etsy_connections')
      .upsert(
        {
          user_id: user.id,
          etsy_user_id: etsyUserId,
          etsy_username: etsyUsername || etsyUserId,
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return ApiResponseHelper.internalError(msg)
  }
}

/**
 * DELETE /api/etsy/connect
 * Remove Etsy connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('etsy_connections')
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
