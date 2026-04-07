import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { createPublishJob } from '@/lib/publish-jobs'

/**
 * GET /api/ebay/sync-orders
 * Returns last sync status for the user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

    // Get last sync from log
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
}

/**
 * POST /api/ebay/sync-orders
 * Polls eBay Fulfillment API for recent sold orders.
 * For each sold item, marks find as sold and other marketplaces for delist.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()

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

    // Get eBay client
    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
    } catch (e) {
      return ApiResponseHelper.badRequest('Your eBay connection has expired. Please reconnect.')
    }

    // Fetch orders with status NOT_STARTED or IN_PROGRESS (unsold/partially fulfilled)
    // We're looking for orders that exist but NOT in these states = completed/sold
    const ordersResponse = await ebayClient.getOrders({
      limit: 50,
      filter: 'orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS}',
    })

    const orders = ordersResponse.orders || []
    let itemsSold = 0

    // Process each order to find sold items
    for (const order of orders) {
      if (!order.lineItems || order.lineItems.length === 0) continue

      for (const lineItem of order.lineItems) {
        const legacyItemId = lineItem.legacyItemId

        if (!legacyItemId) continue

        // Find product_marketplace_data by platform_listing_id
        const { data: marketplaceData } = await supabase
          .from('product_marketplace_data')
          .select('find_id')
          .eq('user_id', user.id)
          .eq('marketplace', 'ebay')
          .eq('platform_listing_id', legacyItemId)
          .single()

        if (!marketplaceData) continue

        const findId = marketplaceData.find_id

        // Get find and user_id for audit
        const { data: find } = await supabase
          .from('finds')
          .select('id, user_id, status')
          .eq('id', findId)
          .eq('user_id', user.id)
          .single()

        if (!find || find.status === 'sold') continue

        // Mark find as sold
        await supabase
          .from('finds')
          .update({
            status: 'sold',
            sold_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', findId)
          .eq('user_id', user.id)

        // Mark eBay marketplace data as sold
        await supabase
          .from('product_marketplace_data')
          .update({
            status: 'sold',
            updated_at: new Date().toISOString(),
          })
          .eq('find_id', findId)
          .eq('marketplace', 'ebay')

        // Fetch other listed marketplaces (for delist job creation)
        const { data: otherListings } = await supabase
          .from('product_marketplace_data')
          .select('marketplace, platform_listing_id')
          .eq('find_id', findId)
          .neq('marketplace', 'ebay')
          .in('status', ['listed', 'needs_publish'])

        // Mark other marketplaces for delist
        await supabase
          .from('product_marketplace_data')
          .update({
            status: 'needs_delist',
            updated_at: new Date().toISOString(),
          })
          .eq('find_id', findId)
          .neq('marketplace', 'ebay')

        // Dual-write: create delist jobs
        if (otherListings && otherListings.length > 0) {
          for (const listing of otherListings) {
            await createPublishJob(supabase, {
              user_id: user.id,
              find_id: findId,
              platform: listing.marketplace,
              action: 'delist',
              payload: { platform_listing_id: listing.platform_listing_id },
            })
          }
        }

        // Log to sync audit
        await supabase
          .from('ebay_sync_log')
          .insert({
            user_id: user.id,
            find_id: findId,
            platform_listing_id: legacyItemId,
            synced_at: new Date().toISOString(),
          })

        itemsSold++
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
      message: `Synced ${orders.length} orders, found ${itemsSold} sold items`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync eBay orders'
    return ApiResponseHelper.internalError(message)
  }
}
