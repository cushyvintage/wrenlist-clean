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
    let { depopUsername } = body
    const { depopUserId } = body

    if (!depopUserId) {
      return ApiResponseHelper.badRequest('Missing depopUserId')
    }

    const supabase = await createSupabaseServerClient()

    // Preserve a previously-resolved display handle if the incoming value
    // is numeric (or falsy). Matches the Vinted route's protection — if
    // the client's user-detail lookup fails, we'd rather keep "cushyvintage"
    // than clobber it with "396908643".
    const looksNumeric = (v: string | null | undefined) =>
      !v || /^\d+$/.test(String(v))
    if (looksNumeric(depopUsername)) {
      const { data: existing } = await supabase
        .from('depop_connections')
        .select('depop_username')
        .eq('user_id', user.id)
        .single()
      if (existing?.depop_username && !looksNumeric(existing.depop_username)) {
        depopUsername = existing.depop_username
      }

      // Last resort: another user account on this same Depop seller may
      // have resolved the real handle. Borrow it instead of persisting the
      // numeric ID, which renders as "@396908643" in the UI.
      if (looksNumeric(depopUsername)) {
        const { data: shared } = await supabase
          .from('depop_connections')
          .select('depop_username')
          .eq('depop_user_id', depopUserId)
          .neq('user_id', user.id)
          .not('depop_username', 'is', null)
          .limit(1)
          .maybeSingle()
        if (shared?.depop_username && !looksNumeric(shared.depop_username)) {
          depopUsername = shared.depop_username
        }
      }
    }

    // Persist null rather than the numeric user_id when no real handle
    // resolved. The UI must show a placeholder ("Depop seller") instead
    // of rendering "@<numeric>".
    const finalUsername = looksNumeric(depopUsername) ? null : depopUsername

    const { data: connection, error } = await supabase
      .from('depop_connections')
      .upsert(
        {
          user_id: user.id,
          depop_user_id: depopUserId,
          depop_username: finalUsername,
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
