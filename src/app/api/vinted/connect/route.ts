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
 * Save Vinted connection (called by extension after user logs in)
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  let { vintedUserId, vintedUsername } = body

  if (!vintedUserId || !vintedUsername) {
    return ApiResponseHelper.badRequest('Missing vintedUserId or vintedUsername')
  }

  const supabase = await createSupabaseServerClient()
  const tld = body.tld || 'co.uk'

  // If incoming username is numeric, try to resolve to login via Vinted API.
  // We *also* opportunistically pull the business flag here for the numeric case.
  let isBusiness: boolean | null = null
  let businessAccountType: string | null = null

  if (/^\d+$/.test(vintedUsername)) {
    const { data: existing } = await supabase
      .from('vinted_connections')
      .select('vinted_username')
      .eq('user_id', user.id)
      .single()
    if (existing?.vinted_username && !/^\d+$/.test(existing.vinted_username)) {
      vintedUsername = existing.vinted_username
    } else {
      try {
        const res = await fetch(`https://www.vinted.${tld}/api/v2/users/${vintedUsername}`, {
          headers: { 'Accept': 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          if (data?.user?.login) {
            vintedUsername = data.user.login
          }
          if (typeof data?.user?.business === 'boolean') {
            isBusiness = data.user.business
            businessAccountType = data.user.business ? 'pro' : null
          }
        }
      } catch {
        // Keep numeric ID as fallback
      }
    }
  }

  // Always try to fetch the business flag by numeric id when we have one.
  // The numeric id is the most reliable lookup; `vintedUserId` is the id
  // reported by the extension cookie.
  if (isBusiness === null && vintedUserId && /^\d+$/.test(String(vintedUserId))) {
    try {
      const res = await fetch(`https://www.vinted.${tld}/api/v2/users/${vintedUserId}`, {
        headers: { 'Accept': 'application/json' },
      })
      if (res.ok) {
        const data = await res.json()
        if (typeof data?.user?.business === 'boolean') {
          isBusiness = data.user.business
          businessAccountType = data.user.business ? 'pro' : null
        }
      }
    } catch {
      // Non-fatal — leave is_business null and we'll preserve existing value on upsert.
    }
  }

  // Build upsert payload. Only overwrite business fields when we successfully
  // resolved them — otherwise keep any previously stored value.
  const payload: Record<string, unknown> = {
    user_id: user.id,
    vinted_user_id: vintedUserId,
    vinted_username: vintedUsername,
    updated_at: new Date().toISOString(),
  }
  if (isBusiness !== null) {
    payload.is_business = isBusiness
    payload.business_account_type = businessAccountType
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
