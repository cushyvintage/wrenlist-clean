import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'

interface DelistQueueItem {
  find_id: string
  marketplace: string
  platform_listing_id: string
  platform_listing_url: string | null
}

/**
 * GET /api/marketplace/delist-queue
 * Returns all finds where any marketplace has status = "needs_delist"
 * Extension polls this to get listings to delist
 *
 * Response: Array of { find_id, marketplace, platform_listing_id, platform_listing_url }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    // Get all user's find IDs first
    const { data: userFinds, error: findsError } = await supabase
      .from('finds')
      .select('id')
      .eq('user_id', user.id)

    if (findsError || !userFinds) {
      return ApiResponseHelper.internalError()
    }

    const findIds = userFinds.map((f: any) => f.id)

    // Find all marketplace data with needs_delist status for this user's finds
    const { data, error } = await supabase
      .from('product_marketplace_data')
      .select('find_id, marketplace, platform_listing_id, platform_listing_url')
      .eq('status', 'needs_delist')
      .in('find_id', findIds)

    if (error) {
      console.error('[Delist Queue] Failed to fetch queue:', error)
      return ApiResponseHelper.internalError()
    }

    // Filter out items without platform_listing_id (can't delist without an ID)
    const validItems = (data || []).filter(
      (item): item is DelistQueueItem => !!item.platform_listing_id
    )

    // If any Shopify items, fetch the user's Shopify store domain
    const hasShopify = validItems.some((item) => item.marketplace === 'shopify')
    let shopifyStoreDomain: string | null = null
    if (hasShopify) {
      const { data: conn } = await supabase
        .from('shopify_connections')
        .select('store_domain')
        .eq('user_id', user.id)
        .single()
      shopifyStoreDomain = conn?.store_domain || null
    }

    const queue = validItems.map((item) => ({
      ...item,
      ...(item.marketplace === 'shopify' && shopifyStoreDomain
        ? { settings: { shopifyShopUrl: shopifyStoreDomain } }
        : {}),
    }))

    return ApiResponseHelper.success(queue)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Delist Queue] GET error:', msg)
    return ApiResponseHelper.internalError()
  }
}

/**
 * POST /api/marketplace/delist-queue
 * Called by extension after successfully delisting an item
 *
 * Body: { find_id, marketplace }
 * Updates marketplace data status from "needs_delist" to "delisted"
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()
    const { find_id: findId, marketplace } = body

    if (!findId || !marketplace) {
      return ApiResponseHelper.badRequest(
        'find_id and marketplace are required'
      )
    }

    const supabase = await createSupabaseServerClient()

    // Verify user owns this find
    const { data: find, error: findError } = await supabase
      .from('finds')
      .select('id')
      .eq('id', findId)
      .eq('user_id', user.id)
      .single()

    if (findError || !find) {
      return ApiResponseHelper.notFound('Find not found')
    }

    // Update marketplace data status to "delisted"
    const { error } = await supabase
      .from('product_marketplace_data')
      .update({
        status: 'delisted',
        updated_at: new Date().toISOString(),
      })
      .eq('find_id', findId)
      .eq('marketplace', marketplace)

    if (error) {
      console.error('[Delist Queue] Failed to update status:', error)
      return ApiResponseHelper.internalError()
    }

    logMarketplaceEvent(supabase, user.id, { findId, marketplace, eventType: 'delisted', source: 'extension' })

    return ApiResponseHelper.success({ message: 'Delist status updated' })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Delist Queue] POST error:', msg)
    return ApiResponseHelper.internalError()
  }
}
