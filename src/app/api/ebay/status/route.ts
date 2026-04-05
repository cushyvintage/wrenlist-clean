import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/ebay/status
 *
 * Check if user has eBay connection
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    // Check for existing tokens
    const { data: tokens, error } = await supabase
      .from('ebay_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('marketplace_id', 'EBAY_GB')
      .single()

    if (error || !tokens) {
      return ApiResponseHelper.success({
        connected: false,
        setupComplete: false,
        username: null,
      })
    }

    // Check setup completion
    const { data: config } = await supabase
      .from('ebay_seller_config')
      .select('setup_complete')
      .eq('user_id', user.id)
      .eq('marketplace_id', 'EBAY_GB')
      .single()

    // Connection expiry = refresh token lifetime (18 months from creation)
    // expires_at in DB is the access token expiry (2hrs) used for auto-refresh
    const connectionExpiresAt = new Date(
      new Date(tokens.created_at).getTime() + 18 * 30 * 24 * 60 * 60 * 1000
    ).toISOString()

    return ApiResponseHelper.success({
      connected: true,
      setupComplete: config?.setup_complete || false,
      username: tokens.ebay_user || 'eBay account',
      expiresAt: connectionExpiresAt,
    })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
