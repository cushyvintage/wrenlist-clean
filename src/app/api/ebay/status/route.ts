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

    return ApiResponseHelper.success({
      connected: true,
      setupComplete: config?.setup_complete || false,
      username: tokens.ebay_user || 'eBay account',
      expiresAt: tokens.expires_at,
    })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
