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
        username: null,
      })
    }

    return ApiResponseHelper.success({
      connected: true,
      username: tokens.ebay_user || 'eBay account',
      expiresAt: tokens.expires_at,
    })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
