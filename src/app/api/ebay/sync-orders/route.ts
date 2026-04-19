import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { enrichEbaySoldItem, createFindFromEbaySale, type EbayOrder } from '@/lib/ebay-sale-enrichment'
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
 * Reconcile cancelled eBay orders - marks finds as cancelled (soft-delete after 24h)
 */
async function reconcileCancelledOrders(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  ebayClient: Awaited<ReturnType<typeof getEbayClientForUser>>
): Promise<{ cancelledCount: number; cancelledItems: Array<{ title: string }>; permanentlyDeletedCount: number }> {
  const cancelledItems: Array<{ title: string }> = []
  let cancelledCount = 0
  let permanentlyDeletedCount = 0

  // Fetch all sold finds with eBay listings for this user
  const { data: soldFinds } = await supabase
    .from('finds')
    .select(`
      id,
      name,
      cancelled_at,
      product_marketplace_data(
        id,
        platform_listing_id
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'sold')

  if (!soldFinds || soldFinds.length === 0) return { cancelledCount: 0, cancelledItems: [], permanentlyDeletedCount: 0 }

  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Check each eBay listing to see if it still exists
  for (const find of soldFinds) {
    const ebaySales = (find.product_marketplace_data || []).filter(
      (pmd: any) => pmd.marketplace === 'ebay'
    )

    for (const listing of ebaySales) {
      if (!listing.platform_listing_id) continue

      try {
        // Try to fetch the item from eBay - if it fails or doesn't exist, it's cancelled
        const itemId = listing.platform_listing_id
        const existingOrders = await ebayClient.getAllOrders({
          filter: `lineItems.legacyItemId:${itemId}`,
        })

        // If no orders found with this item, it was cancelled/removed
        if (!existingOrders || existingOrders.length === 0) {
          // If already marked as cancelled, check if 24h has passed
          if (find.cancelled_at) {
            const cancelledTime = new Date(find.cancelled_at)
            if (cancelledTime <= oneDayAgo) {
              // 24h has passed - permanently delete
              await supabaseAdmin
                .from('product_marketplace_data')
                .delete()
                .eq('id', listing.id)

              // Check if this find has any other marketplace listings
              const { data: otherListings } = await supabase
                .from('product_marketplace_data')
                .select('id')
                .eq('find_id', find.id)
                .neq('marketplace', 'ebay')

              // Only delete the find if it has no other marketplace listings
              if (!otherListings || otherListings.length === 0) {
                await supabaseAdmin
                  .from('finds')
                  .delete()
                  .eq('id', find.id)

                permanentlyDeletedCount++
              }
            }
          } else {
            // First time seeing this as cancelled - mark it
            await supabaseAdmin
              .from('finds')
              .update({ cancelled_at: now.toISOString() })
              .eq('id', find.id)

            cancelledCount++
            cancelledItems.push({ title: find.name })
          }
        }
      } catch (error) {
        // Silently skip on error - don't want to delete valid finds due to API issues
        console.warn(`[reconcileCancelledOrders] Error checking item ${listing.platform_listing_id}:`, error)
      }
    }
  }

  return { cancelledCount, cancelledItems, permanentlyDeletedCount }
}

/**
 * POST /api/ebay/sync-orders
 * Polls eBay Fulfillment API for recent sold orders.
 * Enriches with buyer info, fees, shipment data in fields.sale.
 * Also reconciles cancelled orders from eBay.
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

    // Accept optional pre-fetched orders from import page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = await req.json().catch(() => ({} as any))
    const providedOrders = body?.orders as any[] | undefined

    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
    } catch {
      return ApiResponseHelper.badRequest('Your eBay connection has expired. Please reconnect.')
    }

    let orders: any[]
    if (Array.isArray(providedOrders) && providedOrders.length > 0) {
      // Use pre-fetched orders from import page (no eBay API call needed)
      orders = providedOrders
    } else {
      // Default: 30 days. Pass ?days=90 for historical backfill (eBay max is ~90 days)
      const { searchParams } = new URL(req.url)
      const days = Math.min(parseInt(searchParams.get('days') || '30') || 30, 90)
      const since = new Date(Date.now() - days * 86400000).toISOString()
      orders = await ebayClient.getAllOrders({ filter: `creationdate:[${since}..]` })
    }
    let itemsSold = 0
    let enriched = 0
    let autoCreated = 0
    const allDelistedFrom: string[] = []
    const autoCreatedItems: Array<{ title: string; price: string }> = []

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

        if (!marketplaceData) {
          // Check if already auto-created on a previous sync
          const { data: existingPmd } = await supabaseAdmin
            .from('product_marketplace_data')
            .select('find_id')
            .eq('marketplace', 'ebay')
            .eq('platform_listing_id', legacyItemId)
            .eq('user_id', user.id)
            .maybeSingle()

          if (existingPmd) continue

          // Auto-create find from unmatched sale
          const autoResult = await createFindFromEbaySale(supabaseAdmin, user.id, order, lineItem)
          if (autoResult.created) {
            autoCreated++
            autoCreatedItems.push({
              title: autoResult.title,
              price: `${lineItem.total?.value || '?'} ${lineItem.total?.currency || 'GBP'}`,
            })
          }
          continue
        }

        const result = await enrichEbaySoldItem(
          supabase, supabaseAdmin, user.id,
          marketplaceData.find_id, order, lineItem
        )

        if (result.enriched) {
          if (result.isNewSale) itemsSold++
          else enriched++
        }
        if (result.delistedFrom.length > 0) {
          allDelistedFrom.push(...result.delistedFrom)
        }
      }
    }

    // Reconcile cancelled orders
    const { cancelledCount, cancelledItems, permanentlyDeletedCount } = await reconcileCancelledOrders(
      supabase,
      supabaseAdmin,
      user.id,
      ebayClient
    )

    // Log sync completion
    await supabase
      .from('ebay_sync_log')
      .insert({
        user_id: user.id,
        orders_checked: orders.length,
        items_sold: itemsSold + autoCreated,
        synced_at: new Date().toISOString(),
      })

    const messageParts = [
      `Synced ${orders.length} orders, found ${itemsSold} new sold items, enriched ${enriched} existing`,
      autoCreated > 0 ? `auto-imported ${autoCreated} sold items not in Wrenlist` : null,
      cancelledCount > 0 ? `marked ${cancelledCount} cancelled orders` : null,
      permanentlyDeletedCount > 0 ? `deleted ${permanentlyDeletedCount} orders (24h after cancellation)` : null,
    ].filter(Boolean)

    const message = messageParts.join(', ')

    return ApiResponseHelper.success({
      ordersChecked: orders.length,
      itemsSold,
      enriched,
      autoCreated,
      autoCreatedItems,
      delistedFrom: [...new Set(allDelistedFrom)],
      cancelledCount,
      cancelledItems,
      permanentlyDeletedCount,
      message,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync eBay orders'
    return ApiResponseHelper.internalError(message)
  }
})
