import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/platforms/status
 * Returns connection status for all supported marketplaces.
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  const supabase = await createSupabaseServerClient()

  // For eBay we read from ebay_sync_log (every cron run inserts a row), so
  // lastSync is the time the *cron* last polled eBay — not the time the
  // OAuth token was last refreshed (which only happens every ~2 hours and
  // looked stale even when the 15-min cron was running fine).
  const [ebayTokenResult, ebaySyncLogResult, vintedResult, shopifyResult, depopResult, etsyResult, facebookResult] = await Promise.all([
    supabase
      .from('ebay_tokens')
      .select('ebay_user, expires_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('ebay_sync_log')
      .select('synced_at')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('vinted_connections')
      .select('vinted_username, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('shopify_connections')
      .select('shop_name, store_domain, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('depop_connections')
      .select('depop_username, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('etsy_connections')
      .select('etsy_username, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('facebook_connections')
      .select('facebook_username, updated_at')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  // eBay is the only OAuth-backed marketplace where we know the token
  // expiry server-side. If the access token has expired AND we have a
  // refresh token (the row still exists), surface "needs_reconnect" so the
  // UI doesn't show a misleading green "Connected" tick. Other marketplaces
  // are session-cookie based and the extension manages their freshness.
  const ebayHasRow = !!ebayTokenResult.data
  const ebayExpiresAt = ebayTokenResult.data?.expires_at
    ? new Date(ebayTokenResult.data.expires_at)
    : null
  const ebayExpired = !!ebayExpiresAt && ebayExpiresAt <= new Date()

  return ApiResponseHelper.success({
    platforms: {
      ebay: {
        connected: ebayHasRow,
        // Pre-launch: be honest. A connected-but-expired row is functionally
        // disconnected — every publish/delist/sync call will fail until the
        // user reconnects via Platform Connect.
        needsReconnect: ebayHasRow && ebayExpired,
        tokenExpiresAt: ebayExpiresAt?.toISOString() ?? null,
        username: ebayTokenResult.data?.ebay_user ?? null,
        lastSync: ebaySyncLogResult.data?.synced_at ?? null,
      },
      vinted: {
        connected: !!vintedResult.data,
        username: vintedResult.data?.vinted_username ?? null,
        lastSync: vintedResult.data?.updated_at ?? null,
      },
      shopify: {
        connected: !!shopifyResult.data,
        shopName: shopifyResult.data?.shop_name ?? null,
        storeDomain: shopifyResult.data?.store_domain ?? null,
        lastSync: shopifyResult.data?.updated_at ?? null,
      },
      depop: {
        connected: !!depopResult.data,
        username: depopResult.data?.depop_username ?? null,
        lastSync: depopResult.data?.updated_at ?? null,
      },
      etsy: {
        connected: !!etsyResult.data,
        username: etsyResult.data?.etsy_username ?? null,
        lastSync: etsyResult.data?.updated_at ?? null,
      },
      facebook: {
        connected: !!facebookResult.data,
        username: facebookResult.data?.facebook_username ?? null,
        lastSync: facebookResult.data?.updated_at ?? null,
      },
    },
  })
})
