import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { getEbayClientForUser } from '@/lib/ebay-client'

/**
 * GET /api/cron/ebay-sync
 * Vercel Cron job that polls eBay for sold orders across all users
 * Protected by CRON_SECRET environment variable
 *
 * Schedule: Every 15 minutes (at 15-minute intervals)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createSupabaseServerClient()

    // Get all users with eBay tokens
    const { data: ebayTokens, error: tokensError } = await supabase
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
      errors: [] as string[],
    }

    // Process each user
    for (const tokenRecord of ebayTokens) {
      const userId = tokenRecord.user_id

      try {
        const ebayClient = await getEbayClientForUser(userId, supabase, 'EBAY_GB')

        // Fetch recent orders (both pending and completed)
        const ordersResponse = await ebayClient.getOrders({
          limit: 100,
          filter: 'orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS|COMPLETED}',
        })

        const orders = ordersResponse.orders || []
        let itemsSoldForUser = 0

        // Process each order
        for (const order of orders) {
          if (!order.lineItems || order.lineItems.length === 0) continue

          for (const lineItem of order.lineItems) {
            const legacyItemId = lineItem.legacyItemId

            if (!legacyItemId) continue

            // Find product_marketplace_data by platform_listing_id
            const { data: marketplaceData } = await supabase
              .from('product_marketplace_data')
              .select('find_id')
              .eq('user_id', userId)
              .eq('marketplace', 'ebay')
              .eq('platform_listing_id', legacyItemId)
              .single()

            if (!marketplaceData) continue

            const findId = marketplaceData.find_id

            // Get find
            const { data: find } = await supabase
              .from('finds')
              .select('id, status')
              .eq('id', findId)
              .eq('user_id', userId)
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
              .eq('user_id', userId)

            // Mark eBay marketplace data as sold
            await supabase
              .from('product_marketplace_data')
              .update({
                status: 'sold',
                updated_at: new Date().toISOString(),
              })
              .eq('find_id', findId)
              .eq('marketplace', 'ebay')

            // Mark other marketplaces for delist
            await supabase
              .from('product_marketplace_data')
              .update({
                status: 'needs_delist',
                updated_at: new Date().toISOString(),
              })
              .eq('find_id', findId)
              .neq('marketplace', 'ebay')

            // Log to sync audit
            await supabase
              .from('ebay_sync_log')
              .insert({
                user_id: userId,
                find_id: findId,
                platform_listing_id: legacyItemId,
                synced_at: new Date().toISOString(),
              })

            itemsSoldForUser++
          }
        }

        // Log sync completion for this user
        if (orders.length > 0 || itemsSoldForUser > 0) {
          await supabase
            .from('ebay_sync_log')
            .insert({
              user_id: userId,
              orders_checked: orders.length,
              items_sold: itemsSoldForUser,
              synced_at: new Date().toISOString(),
            })

          results.totalOrdersChecked += orders.length
          results.totalItemsSold += itemsSoldForUser
        }

        results.usersProcessed++
      } catch (userError) {
        const msg = userError instanceof Error ? userError.message : 'Unknown error'
        results.errors.push(`User ${userId}: ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Cron job failed', details: message },
      { status: 500 }
    )
  }
}
