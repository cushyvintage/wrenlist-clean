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

  const [ebayResult, vintedResult, shopifyResult] = await Promise.all([
    supabase
      .from('ebay_tokens')
      .select('ebay_user')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('vinted_connections')
      .select('vinted_username')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('shopify_connections')
      .select('shop_name, store_domain')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return ApiResponseHelper.success({
    platforms: {
      ebay: {
        connected: !!ebayResult.data,
        username: ebayResult.data?.ebay_user ?? null,
      },
      vinted: {
        connected: !!vintedResult.data,
        username: vintedResult.data?.vinted_username ?? null,
      },
      shopify: {
        connected: !!shopifyResult.data,
        shopName: shopifyResult.data?.shop_name ?? null,
      },
      etsy: {
        connected: false,
        username: null,
      },
    },
  })
})
