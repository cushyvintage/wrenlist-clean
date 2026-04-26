import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { config } from '@/lib/config'
import { eBayClient } from '@/lib/ebay-client'
import { encryptEbayToken, maybeDecryptEbayToken } from '@/lib/ebay-token-crypto'

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

    // Track whether the access token is currently usable. If it expired and
    // we couldn't refresh, the UI must show "Reconnect required" instead of
    // a misleading green tick. Default to "expired if past expires_at".
    let tokenUsable = new Date(tokens.expires_at) > new Date()
    let ebayUsername = tokens.ebay_user

    // Lazily fetch eBay username if not yet stored. As a side effect, this
    // also attempts a token refresh — keep tokenUsable in sync with that.
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

        // Decrypt tokens (handles both encrypted + legacy plaintext rows)
        let accessToken = maybeDecryptEbayToken(tokens.access_token, tokens.token_encrypted)
        const refreshTokenPlain = maybeDecryptEbayToken(tokens.refresh_token, tokens.token_encrypted)

        // Refresh access token first — stored token is likely expired (2hr lifetime)
        if (refreshTokenPlain && new Date(tokens.expires_at) <= new Date()) {
          try {
            const newTokens = await client.refreshAccessToken(refreshTokenPlain)
            accessToken = newTokens.accessToken
            tokenUsable = true
            await supabase
              .from('ebay_tokens')
              .update({
                access_token: encryptEbayToken(newTokens.accessToken),
                refresh_token: encryptEbayToken(newTokens.refreshToken || refreshTokenPlain),
                token_encrypted: true,
                expires_at: newTokens.expiresAt.toISOString(),
              })
              .eq('user_id', user.id)
              .eq('marketplace_id', 'EBAY_GB')
          } catch {
            // Token refresh failed — token is dead. Surface to UI.
            tokenUsable = false
          }
        }

        if (tokenUsable) {
          client.setTokens({
            accessToken,
            refreshToken: refreshTokenPlain,
            expiresAt: new Date(Date.now() + 7200000), // treat as valid after refresh
          })
          ebayUsername = await client.fetchUsername()
          if (ebayUsername) {
            await supabase
              .from('ebay_tokens')
              .update({ ebay_user: ebayUsername })
              .eq('user_id', user.id)
              .eq('marketplace_id', 'EBAY_GB')
          }
        }
      } catch {
        // Non-critical — username will show as null
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
      // needsReconnect lets the UI distinguish "row exists in DB" from
      // "actually usable" — the green tick had been lying when the token
      // was dead and refresh kept failing.
      needsReconnect: !tokenUsable,
      setupComplete: sellerConfig?.setup_complete || false,
      username: ebayUsername || null,
      expiresAt: connectionExpiresAt,
    })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
