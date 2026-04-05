import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'

/**
 * GET /api/marketplace/publish-queue
 * Returns finds where any marketplace has status = "needs_publish".
 * Extension polls this to find listings to publish.
 */
export const GET = withAuth(async (_req, user) => {
  const supabase = await createSupabaseServerClient()

  // Single query: get all needs_publish marketplace data with find details via join
  const { data: queueItems, error } = await supabase
    .from('product_marketplace_data')
    .select(`
      find_id,
      marketplace,
      fields,
      listing_price,
      platform_category_id,
      finds!inner (
        id,
        name,
        description,
        category,
        brand,
        condition,
        asking_price_gbp,
        photos,
        sku,
        colour,
        size,
        shipping_weight_grams
      )
    `)
    .eq('status', 'needs_publish')
    .eq('finds.user_id', user.id)

  if (error) {
    console.error('[PublishQueue] Query failed:', error)
    return ApiResponseHelper.internalError()
  }

  // If any Shopify items, fetch the user's Shopify store domain
  const items = queueItems || []
  const hasShopify = items.some((item) => item.marketplace === 'shopify')
  let shopifyStoreDomain: string | null = null
  if (hasShopify) {
    const { data: conn } = await supabase
      .from('shopify_connections')
      .select('store_domain')
      .eq('user_id', user.id)
      .single()
    shopifyStoreDomain = conn?.store_domain || null
  }

  const queue = items.map((item) => {
    // Supabase returns the join as an object (not array) for !inner joins
    const find = (item as any).finds as Record<string, any> | null
    return {
      find_id: item.find_id,
      marketplace: item.marketplace,
      find: find || null,
      listing_price: item.listing_price || null,
      platform_category_id: item.platform_category_id || null,
      ...(item.marketplace === 'shopify' && shopifyStoreDomain
        ? { settings: { shopifyShopUrl: shopifyStoreDomain } }
        : {}),
    }
  })

  return ApiResponseHelper.success(queue)
})

/**
 * POST /api/marketplace/publish-queue
 * Called by extension after successfully publishing.
 * Updates status to "listed" and sets platform_listing_id/url.
 *
 * Body: { find_id, marketplace, platform_listing_id?, platform_listing_url? }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { find_id: findId, marketplace, platform_listing_id, platform_listing_url } = body

  if (!findId || !marketplace) {
    return ApiResponseHelper.badRequest('find_id and marketplace are required')
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership
  const { data: find, error: findError } = await supabase
    .from('finds')
    .select('id')
    .eq('id', findId)
    .eq('user_id', user.id)
    .single()

  if (findError || !find) {
    return ApiResponseHelper.notFound('Find not found')
  }

  // Update marketplace data
  const { error } = await supabase
    .from('product_marketplace_data')
    .update({
      status: 'listed',
      platform_listing_id: platform_listing_id || null,
      platform_listing_url: platform_listing_url || null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('find_id', findId)
    .eq('marketplace', marketplace)

  if (error) {
    return ApiResponseHelper.internalError()
  }

  logMarketplaceEvent(supabase, user.id, { findId, marketplace, eventType: 'listed', source: 'extension', details: { platform_listing_id, platform_listing_url } })

  return ApiResponseHelper.success({ message: 'Publish status updated' })
})
