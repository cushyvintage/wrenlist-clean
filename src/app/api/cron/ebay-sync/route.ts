import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { enrichEbaySoldItem, createFindFromEbaySale } from '@/lib/ebay-sale-enrichment'

/**
 * Reconcile cancelled eBay orders - marks as cancelled, deletes after 24h
 */
async function reconcileCancelledOrders(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  ebayClient: Awaited<ReturnType<typeof getEbayClientForUser>>
): Promise<{ cancelledCount: number; permanentlyDeletedCount: number }> {
  let cancelledCount = 0
  let permanentlyDeletedCount = 0

  try {
    // Fetch all sold finds with eBay listings for this user
    const { data: soldFinds } = (await supabaseAdmin
      .from('finds')
      .select(`
        id,
        name,
        cancelled_at,
        product_marketplace_data(
          id,
          platform_listing_id,
          marketplace
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'sold')) as any

    if (!soldFinds || soldFinds.length === 0) return { cancelledCount: 0, permanentlyDeletedCount: 0 }

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
          // Try to fetch orders with this item ID - if empty, it's cancelled
          const existingOrders = await ebayClient.getAllOrders({
            filter: `lineItems.legacyItemId:${listing.platform_listing_id}`,
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
                const { data: otherListings } = await supabaseAdmin
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
            }
          }
        } catch (error) {
          // Silently skip on error
          console.warn(`[cron:ebay-sync] Error checking item ${listing.platform_listing_id}:`, error)
        }
      }
    }
  } catch (error) {
    console.warn(`[cron:ebay-sync] Error reconciling cancelled orders for user ${userId}:`, error)
  }

  return { cancelledCount, permanentlyDeletedCount }
}

/**
 * GET /api/cron/ebay-sync
 * Vercel Cron job that polls eBay for sold orders across all users.
 * Enriches with buyer info, fees, shipment data in fields.sale.
 * Also removes cancelled orders from Wrenlist.
 * Protected by CRON_SECRET environment variable.
 *
 * Schedule: Every 15 minutes
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Cron has no user session — use service role for all DB queries
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all users with eBay tokens
    const { data: ebayTokens, error: tokensError } = await supabaseAdmin
      .from('ebay_tokens')
      .select('user_id')
      .eq('marketplace_id', 'EBAY_GB')
      .order('user_id')

    if (tokensError || !ebayTokens) {
      return NextResponse.json(
        { error: 'Failed to fetch eBay tokens', details: tokensError },
        { status: 500 }
      )
    }

    const results = {
      usersProcessed: 0,
      totalOrdersChecked: 0,
      totalItemsSold: 0,
      totalEnriched: 0,
      totalAutoCreated: 0,
      totalCancelled: 0,
      totalPermanentlyDeleted: 0,
      errors: [] as string[],
    }

    for (const tokenRecord of ebayTokens) {
      const userId = tokenRecord.user_id

      try {
        const ebayClient = await getEbayClientForUser(userId, supabaseAdmin, 'EBAY_GB')

        // Look back 90 days (eBay max) to catch all historical orders
        const since = new Date(Date.now() - 90 * 86400000).toISOString()
        const ordersResponse = await ebayClient.getOrders({
          limit: 100,
          filter: `creationdate:[${since}..]`,
        })

        const orders = ordersResponse.orders || []
        let itemsSoldForUser = 0
        let enrichedForUser = 0
        let autoCreatedForUser = 0

        // Fetch user's find IDs once per user (not per line item)
        const { data: userFinds } = await supabaseAdmin
          .from('finds')
          .select('id')
          .eq('user_id', userId)

        const userFindIds = (userFinds || []).map(f => f.id)

        for (const order of orders) {
          if (!order.lineItems || order.lineItems.length === 0) continue

          for (const lineItem of order.lineItems) {
            const legacyItemId = lineItem.legacyItemId
            if (!legacyItemId) continue

            // Try to match by platform_listing_id
            const { data: marketplaceData } = userFindIds.length > 0
              ? await supabaseAdmin
                  .from('product_marketplace_data')
                  .select('find_id')
                  .eq('marketplace', 'ebay')
                  .eq('platform_listing_id', legacyItemId)
                  .in('find_id', userFindIds)
                  .maybeSingle()
              : { data: null }

            if (!marketplaceData) {
              // Check if we already auto-created a find for this listing ID
              const { data: existingPmd } = await supabaseAdmin
                .from('product_marketplace_data')
                .select('find_id')
                .eq('marketplace', 'ebay')
                .eq('platform_listing_id', legacyItemId)
                .eq('user_id', userId)
                .maybeSingle()

              if (existingPmd) {
                // Already auto-created on a previous run — skip
                continue
              }

              // Auto-create find from unmatched sale
              const autoResult = await createFindFromEbaySale(supabaseAdmin, userId, order, lineItem)
              if (autoResult.created) autoCreatedForUser++
              continue
            }

            const result = await enrichEbaySoldItem(
              supabaseAdmin, supabaseAdmin, userId,
              marketplaceData.find_id, order, lineItem
            )

            if (result.enriched) {
              if (result.isNewSale) itemsSoldForUser++
              else enrichedForUser++
            }
          }
        }

        // Reconcile cancelled orders for this user
        const { cancelledCount: cancelledForUser, permanentlyDeletedCount: deletedForUser } = await reconcileCancelledOrders(
          supabaseAdmin,
          userId,
          ebayClient
        )

        // Log sync completion for this user
        if (orders.length > 0 || itemsSoldForUser > 0 || cancelledForUser > 0 || deletedForUser > 0) {
          await supabaseAdmin
            .from('ebay_sync_log')
            .insert({
              user_id: userId,
              orders_checked: orders.length,
              items_sold: itemsSoldForUser,
              synced_at: new Date().toISOString(),
            })

          results.totalOrdersChecked += orders.length
          results.totalItemsSold += itemsSoldForUser
          results.totalEnriched += enrichedForUser
          results.totalAutoCreated += autoCreatedForUser
          results.totalCancelled += cancelledForUser
          results.totalPermanentlyDeleted += deletedForUser
        }

        results.usersProcessed++
      } catch (userError) {
        const msg = userError instanceof Error ? userError.message : 'Unknown error'
        results.errors.push(`User ${userId}: ${msg}`)
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Cron job failed', details: message },
      { status: 500 }
    )
  }
}
