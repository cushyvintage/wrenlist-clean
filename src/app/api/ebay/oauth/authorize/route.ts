import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { eBayClient } from '@/lib/ebay-client'
import { config } from '@/lib/config'
import { checkRateLimit } from '@/lib/rate-limit'
import crypto from 'crypto'

/**
 * POST /api/ebay/oauth/authorize
 *
 * Initiates eBay OAuth flow by:
 * 1. Generating CSRF state parameter
 * 2. Storing state in database (with TTL)
 * 3. Generating authorization URL
 * 4. Returning URL to client
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    // Rate limiting: 5 per minute per user
    const { success } = await checkRateLimit(`user:${user.id}:ebay-oauth`, 5)
    if (!success) {
      return ApiResponseHelper.badRequest("Too many requests. Please wait a moment.")
    }

    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const { marketplace = 'EBAY_GB' } = body

    // Generate CSRF state parameter
    const state = crypto.randomBytes(32).toString('hex')

    // Store state in database (expires in 60 minutes)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    const { error: stateError } = await supabase
      .from('ebay_oauth_states')
      .insert({
        user_id: user.id,
        state,
        marketplace_id: marketplace,
        expires_at: expiresAt.toISOString(),
      })

    if (stateError) {
      return ApiResponseHelper.internalError('Failed to initialize OAuth flow')
    }

    // Create eBayClient config
    if (!config.ebay.clientId || !process.env.EBAY_RUNAME) {
      return ApiResponseHelper.internalError('eBay not configured on server')
    }

    const client = new eBayClient({
      environment: config.ebay.environment,
      marketplaceId: marketplace as 'EBAY_US' | 'EBAY_GB',
      clientId: config.ebay.clientId,
      clientSecret: config.ebay.clientSecret,
      // eBay OAuth requires the RuName as the redirect_uri in the authorize URL
      redirectUrl: process.env.EBAY_RUNAME,
    })

    // Generate authorization URL
    const authUrl = client.getAuthorizationUrl(state)

    return ApiResponseHelper.success({
      authUrl,
      state,
    })
  } catch (error) {
    return ApiResponseHelper.internalError('Failed to initiate OAuth flow')
  }
}
