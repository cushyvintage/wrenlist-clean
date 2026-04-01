import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { eBayClient } from '@/lib/ebay-client'

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
        new URL(`https://app.wrenlist.com/platform-connect?error=${encodeURIComponent(error)}`)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('https://app.wrenlist.com/platform-connect?error=missing_params')
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
        new URL('https://app.wrenlist.com/platform-connect?error=invalid_state')
      )
    }

    // Check state expiration
    if (new Date(stateRecord.expires_at) < new Date()) {
      return NextResponse.redirect(
        new URL('https://app.wrenlist.com/platform-connect?error=state_expired')
      )
    }

    const marketplace = stateRecord.marketplace_id || 'EBAY_GB'

    // Mark state as used
    await supabase
      .from('ebay_oauth_states')
      .update({ used_at: new Date().toISOString() })
      .eq('state', state)

    // Exchange code for tokens
    const environment = (process.env.EBAY_ENVIRONMENT || 'production') as
      | 'sandbox'
      | 'production'

    if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL('https://app.wrenlist.com/platform-connect?error=server_error')
      )
    }

    const client = new eBayClient({
      environment,
      marketplaceId: marketplace as 'EBAY_US' | 'EBAY_GB',
      clientId: process.env.EBAY_CLIENT_ID,
      clientSecret: process.env.EBAY_CLIENT_SECRET,
      // Token exchange also requires the RuName as redirect_uri
      redirectUrl: process.env.EBAY_RUNAME!,
    })

    // Exchange authorization code for tokens
    const tokens = await client.exchangeCodeForTokens(code)

    // Get user info from eBay to verify auth
    client.setTokens(tokens)
    const ebayUser = await client.getUser()

    // Check if tokens entry exists
    const { data: existingTokens } = await supabase
      .from('ebay_tokens')
      .select('id')
      .eq('user_id', stateRecord.user_id)
      .eq('marketplace_id', marketplace)
      .single()

    if (existingTokens) {
      // Update existing tokens
      const { error: updateError } = await supabase
        .from('ebay_tokens')
        .update({
          ebay_user: ebayUser.username,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', stateRecord.user_id)
        .eq('marketplace_id', marketplace)

      if (updateError) {
        return NextResponse.redirect(
          new URL('https://app.wrenlist.com/platform-connect?error=db_error')
        )
      }
    } else {
      // Create new tokens entry
      const { error: insertError } = await supabase
        .from('ebay_tokens')
        .insert({
          user_id: stateRecord.user_id,
          marketplace_id: marketplace,
          ebay_user: ebayUser.username,
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresAt.toISOString(),
          scope: tokens.scope.join(' '),
        })

      if (insertError) {
        return NextResponse.redirect(
          new URL('https://app.wrenlist.com/platform-connect?error=db_error')
        )
      }
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/platform-connect?success=ebay&marketplace=${marketplace}`,
        request.url
      )
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'unknown'
    console.error('[eBay callback error]', msg)
    return NextResponse.redirect(
      new URL(`https://app.wrenlist.com/platform-connect?error=callback_error&detail=${encodeURIComponent(msg)}`)
    )
  }
}
