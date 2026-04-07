import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { enrichEbaySoldItem } from '@/lib/ebay-sale-enrichment'

/**
 * GET /api/cron/ebay-sync
 * Vercel Cron job that polls eBay for sold orders across all users.
 * Enriches with buyer info, fees, shipment data in fields.sale.
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
    const supabase = await createSupabaseServerClient()
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
      totalEnriched: 0,
      errors: [] as string[],
    }

    for (const tokenRecord of ebayTokens) {
      const userId = tokenRecord.user_id

      try {
        const ebayClient = await getEbayClientForUser(userId, supabase, 'EBAY_GB')

        const ordersResponse = await ebayClient.getOrders({
          limit: 100,
          filter: 'orderfulfillmentstatus:{NOT_STARTED|IN_PROGRESS|COMPLETED}',
        })

        const orders = ordersResponse.orders || []
        let itemsSoldForUser = 0
        let enrichedForUser = 0

        for (const order of orders) {
          if (!order.lineItems || order.lineItems.length === 0) continue

          for (const lineItem of order.lineItems) {
            const legacyItemId = lineItem.legacyItemId
            if (!legacyItemId) continue

            // Scope PMD lookup to this user's finds
            const { data: userFinds } = await supabase
              .from('finds')
              .select('id')
              .eq('user_id', userId)

            const userFindIds = (userFinds || []).map(f => f.id)
            if (userFindIds.length === 0) continue

            const { data: marketplaceData } = await supabase
              .from('product_marketplace_data')
              .select('find_id')
              .eq('marketplace', 'ebay')
              .eq('platform_listing_id', legacyItemId)
              .in('find_id', userFindIds)
              .maybeSingle()

            if (!marketplaceData) continue

            const result = await enrichEbaySoldItem(
              supabase, supabaseAdmin, userId,
              marketplaceData.find_id, order, lineItem
            )

            if (result.enriched) {
              if (result.isNewSale) itemsSoldForUser++
              else enrichedForUser++
            }
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
          results.totalEnriched += enrichedForUser
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
