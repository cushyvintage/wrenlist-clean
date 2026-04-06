import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/vinted/connect
 * Returns connection status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

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

    // If stored username is still numeric, try to resolve the display name
    let vintedUsername = connection.vinted_username
    if (vintedUsername && /^\d+$/.test(vintedUsername)) {
      try {
        const res = await fetch(`https://www.vinted.co.uk/api/v2/users/${vintedUsername}`, {
          headers: { 'Accept': 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.user?.login) {
            vintedUsername = data.user.login
            // Persist resolved name so we don't re-fetch next time
            await supabase
              .from('vinted_connections')
              .update({ vinted_username: vintedUsername })
              .eq('user_id', user.id)
          }
        }
      } catch {
        // Keep numeric ID as fallback
      }
    }

    return ApiResponseHelper.success({
      connected: true,
      vintedUsername,
      vintedUserId: connection.vinted_user_id,
    })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/vinted/connect
 * Save Vinted connection (called by extension after user logs in)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()
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
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return ApiResponseHelper.internalError(msg)
  }
}

/**
 * DELETE /api/vinted/connect
 * Remove Vinted connection
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    const { error } = await supabase
      .from('vinted_connections')
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
