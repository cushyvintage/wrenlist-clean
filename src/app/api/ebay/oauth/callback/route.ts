import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { eBayClient } from '@/lib/ebay-client'
import { encryptEbayToken } from '@/lib/ebay-token-crypto'
import { config } from '@/lib/config'

/**
 * GET /api/ebay/oauth/callback
 *
 * OAuth callback handler:
 * 1. Validates state parameter (CSRF check)
 * 2. Exchanges authorization code for tokens
 * 3. Stores tokens in database
 * 4. Redirects to success page
 *
 * Note: This route validates state parameter for CSRF protection
 * since OAuth callback comes from external provider
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.wrenlist.com'

  try {
    const supabase = await createSupabaseServerClient()

    // Extract query parameters
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Check for eBay errors
    if (error) {
      return NextResponse.redirect(
        new URL(`${appUrl}/platform-connect?error=${encodeURIComponent(error)}`)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`${appUrl}/platform-connect?error=missing_params`)
      )
    }

    // Validate state parameter (CSRF protection) — no session needed, state record contains user_id
    const { data: stateRecord, error: stateError } = await supabase
      .from('ebay_oauth_states')
      .select('*')
      .eq('state', state)
      .single()

    if (stateError || !stateRecord) {
      return NextResponse.redirect(
        new URL(`${appUrl}/platform-connect?error=invalid_state`)
      )
    }

    // Check state expiration
    if (new Date(stateRecord.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL(`${appUrl}/platform-connect?error=state_expired`)
      )
    }

    const marketplace = stateRecord.marketplace_id || 'EBAY_GB'

    // Mark state as used
    await supabase
      .from('ebay_oauth_states')
      .update({ used_at: new Date().toISOString() })
      .eq('state', state)

    // Exchange code for tokens
    if (!config.ebay.clientId || !config.ebay.clientSecret) {
      return NextResponse.redirect(
        new URL(`${appUrl}/platform-connect?error=server_error`)
      )
    }

    const client = new eBayClient({
      environment: config.ebay.environment,
      marketplaceId: marketplace as 'EBAY_US' | 'EBAY_GB',
      clientId: config.ebay.clientId,
      clientSecret: config.ebay.clientSecret,
      // Token exchange also requires the RuName as redirect_uri
      redirectUrl: process.env.EBAY_RUNAME!,
    })

    // Exchange authorization code for tokens
    const tokens = await client.exchangeCodeForTokens(code)

    // Fetch eBay username
    const ebayUsername = await client.fetchUsername()

    // Upsert tokens — insert or update (encrypt before storing)
    const { error: upsertError } = await supabase
      .from('ebay_tokens')
      .upsert({
        user_id: stateRecord.user_id,
        marketplace_id: marketplace,
        access_token: encryptEbayToken(tokens.accessToken),
        refresh_token: encryptEbayToken(tokens.refreshToken),
        token_encrypted: true,
        expires_at: tokens.expiresAt.toISOString(),
        scope: tokens.scope?.join(' ') || 'sell.inventory sell.account',
        ebay_user: ebayUsername,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,marketplace_id' })

    if (upsertError) {
      return NextResponse.redirect(
        new URL(`${appUrl}/platform-connect?error=db_error`)
      )
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`${appUrl}/platform-connect?success=ebay`)
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown'
    console.error('[eBay callback error]', msg)
    return NextResponse.redirect(
      new URL(`${appUrl}/platform-connect?error=callback_error&detail=${encodeURIComponent(msg)}`)
    )
  }
}
