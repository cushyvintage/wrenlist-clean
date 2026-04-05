import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { config } from '@/lib/config'
import { eBayClient } from '@/lib/ebay-client'

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

    // Lazily fetch eBay username if not yet stored
    let ebayUsername = tokens.ebay_user
    if (!ebayUsername) {
      try {
        const ebayConfig = config
        const client = new eBayClient({
          environment: ebayConfig.ebay.environment,
          marketplaceId: 'EBAY_GB',
          clientId: ebayConfig.ebay.clientId,
          clientSecret: ebayConfig.ebay.clientSecret,
          redirectUrl: process.env.EBAY_REDIRECT_URI!,
        })
        client.setTokens({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(tokens.expires_at),
        })
        ebayUsername = await client.fetchUsername()
        if (ebayUsername) {
          await supabase
            .from('ebay_tokens')
            .update({ ebay_user: ebayUsername })
            .eq('user_id', user.id)
            .eq('marketplace_id', 'EBAY_GB')
        }
      } catch {
        // Non-critical
      }
    }

    // Check setup completion
    const { data: sellerConfig } = await supabase
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
      setupComplete: sellerConfig?.setup_complete || false,
      username: ebayUsername || 'eBay account',
      expiresAt: connectionExpiresAt,
    })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
