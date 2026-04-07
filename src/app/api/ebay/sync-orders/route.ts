import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { enrichEbaySoldItem } from '@/lib/ebay-sale-enrichment'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/ebay/sync-orders
 * Returns last sync status for the user
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: lastSync } = await supabase
      .from('ebay_sync_log')
      .select('*')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .single()

    return ApiResponseHelper.success({
      lastSync: lastSync ? {
        syncedAt: lastSync.synced_at,
        ordersChecked: lastSync.orders_checked,
        itemsSold: lastSync.items_sold,
      } : null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get sync status'
    return ApiResponseHelper.internalError(message)
  }
})

/**
 * POST /api/ebay/sync-orders
 * Polls eBay Fulfillment API for recent sold orders.
 * Enriches with buyer info, fees, shipment data in fields.sale.
 */
export const POST = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check if user has eBay connection
    const { data: ebayToken } = await supabase
      .from('ebay_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('marketplace_id', 'EBAY_GB')
      .single()

    if (!ebayToken) {
      return ApiResponseHelper.badRequest('No eBay connection found. Please connect to eBay first.')
    }

    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
    } catch {
      return ApiResponseHelper.badRequest('Your eBay connection has expired. Please reconnect.')
    }

    // Fetch orders — include COMPLETED to re-enrich already-sold items
    const ordersResponse = await ebayClient.getOrders({
      limit: 50,
      filter: 'orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS|COMPLETED}',
    })

    const orders = ordersResponse.orders || []
    let itemsSold = 0
    let enriched = 0

    for (const order of orders) {
      if (!order.lineItems || order.lineItems.length === 0) continue

      for (const lineItem of order.lineItems) {
        const legacyItemId = lineItem.legacyItemId
        if (!legacyItemId) continue

        // Find PMD by platform_listing_id
        const { data: marketplaceData } = await supabase
          .from('product_marketplace_data')
          .select('find_id')
          .eq('marketplace', 'ebay')
          .eq('platform_listing_id', legacyItemId)
          .maybeSingle()

        if (!marketplaceData) continue

        const result = await enrichEbaySoldItem(
          supabase, supabaseAdmin, user.id,
          marketplaceData.find_id, order, lineItem
        )

        if (result.enriched) {
          if (result.isNewSale) itemsSold++
          else enriched++
        }
      }
    }

    // Log sync completion
    await supabase
      .from('ebay_sync_log')
      .insert({
        user_id: user.id,
        orders_checked: orders.length,
        items_sold: itemsSold,
        synced_at: new Date().toISOString(),
      })

    return ApiResponseHelper.success({
      ordersChecked: orders.length,
      itemsSold,
      enriched,
      message: `Synced ${orders.length} orders, found ${itemsSold} new sold items, enriched ${enriched} existing`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync eBay orders'
    return ApiResponseHelper.internalError(message)
  }
})
