import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { createPublishJob } from '@/lib/publish-jobs'
import { lookupVintedCategory } from '@/lib/vinted-category-lookup'

/**
 * POST /api/vinted/sync-sales
 * Receives VintedSale[] from the extension and syncs into Wrenlist.
 * For each sale:
 *   - Matches to existing find by platform_listing_id
 *   - If matched: marks as sold, stores sale metadata
 *   - If not matched: creates new find from sale data with status=sold
 *   - Auto-delists other marketplaces
 * Works for both import page (batch) and future real-time cron sync.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const sales: any[] = body.sales || []

    if (!sales.length) return ApiResponseHelper.badRequest('No sales provided')

    const startTime = Date.now()
    let synced = 0, skipped = 0, created = 0, errors = 0

    for (const sale of sales) {
      try {
        const transactionId = String(sale.transactionId || '')
        const saleItems = sale.items || []
        if (!saleItems.length) { skipped++; continue }

        // Sale metadata to store in PMD fields
        const saleData = {
          transactionId,
          buyer: sale.buyer || null,
          grossAmount: sale.grossAmount,
          serviceFee: sale.serviceFee,
          netAmount: sale.netAmount,
          currency: sale.currency || 'GBP',
          shippingAddress: sale.shippingAddress || null,
          trackingNumber: sale.trackingNumber || null,
          carrier: sale.carrier || null,
          shipmentStatus: sale.shipmentStatusTitle || null,
          orderDate: sale.orderDate || null,
          completedDate: sale.completedDate || null,
          isBundle: sale.isBundle || false,
          itemCount: sale.itemCount || saleItems.length,
        }

        for (const item of saleItems) {
          const itemId = String(item.itemId || '')
          if (!itemId) continue

          // Try to match to existing find via product_marketplace_data
          const { data: existingPmd } = await supabase
            .from('product_marketplace_data')
            .select('find_id, status')
            .eq('marketplace', 'vinted')
            .eq('platform_listing_id', itemId)
            .maybeSingle()

          let findId: string

          if (existingPmd) {
            // Verify this find belongs to the user
            const { data: find } = await supabase
              .from('finds')
              .select('id, status')
              .eq('id', existingPmd.find_id)
              .eq('user_id', user.id)
              .maybeSingle()

            if (!find) { skipped++; continue }
            if (find.status === 'sold') { skipped++; continue }

            findId = find.id

            // Mark find as sold
            await supabase.from('finds').update({
              status: 'sold',
              sold_price_gbp: item.price || sale.grossAmount,
              sold_at: sale.orderDate || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', findId).eq('user_id', user.id)

            // Update PMD status + store sale metadata
            await supabase.from('product_marketplace_data').update({
              status: 'sold',
              fields: { sale: saleData },
              updated_at: new Date().toISOString(),
            }).eq('find_id', findId).eq('marketplace', 'vinted')

            synced++
          } else {
            // No existing find — create new one from sale data
            const category = lookupVintedCategory(null)
            const catPrefix = category.slice(0, 3).toUpperCase()
            const sku = `VT-${catPrefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`

            const { data: newFind, error: findError } = await supabase
              .from('finds')
              .insert({
                user_id: user.id,
                name: item.title || 'Untitled',
                category,
                asking_price_gbp: item.price || sale.grossAmount,
                sold_price_gbp: item.price || sale.grossAmount,
                sold_at: sale.orderDate || new Date().toISOString(),
                photos: item.thumbnailUrl ? [item.thumbnailUrl] : [],
                sku,
                status: 'sold',
                platform_fields: {
                  selectedPlatforms: ['vinted'],
                  vinted: { originalListingId: itemId },
                },
                selected_marketplaces: ['vinted'],
              })
              .select('id')
              .single()

            if (findError || !newFind) { errors++; continue }

            findId = newFind.id

            // Create PMD row
            await supabase.from('product_marketplace_data').insert({
              find_id: findId,
              marketplace: 'vinted',
              platform_listing_id: itemId,
              platform_listing_url: `https://www.vinted.co.uk/items/${itemId}`,
              listing_price: item.price || sale.grossAmount,
              status: 'sold',
              fields: { sale: saleData },
            })

            created++
          }

          // Auto-delist other marketplaces
          const { data: otherListings } = await supabase
            .from('product_marketplace_data')
            .select('marketplace, platform_listing_id')
            .eq('find_id', findId)
            .neq('marketplace', 'vinted')
            .in('status', ['listed', 'needs_publish'])

          if (otherListings && otherListings.length > 0) {
            await supabase.from('product_marketplace_data').update({
              status: 'needs_delist',
              updated_at: new Date().toISOString(),
            }).eq('find_id', findId).neq('marketplace', 'vinted')

            const supabaseAdmin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.SUPABASE_SERVICE_ROLE_KEY!
            )
            for (const listing of otherListings) {
              await createPublishJob(supabaseAdmin, {
                user_id: user.id,
                find_id: findId,
                platform: listing.marketplace,
                action: 'delist',
                payload: { platform_listing_id: listing.platform_listing_id },
              })
            }
          }

          // Log event
          logMarketplaceEvent(supabase, user.id, {
            findId,
            marketplace: 'vinted',
            eventType: 'sold',
            source: 'api',
            details: { transactionId, itemId, grossAmount: sale.grossAmount, netAmount: sale.netAmount, buyer: sale.buyer?.username },
          })
        }
      } catch (err) {
        errors++
        console.error('[Vinted Sync Sales] Error processing sale:', err)
      }
    }

    const durationMs = Date.now() - startTime
    return ApiResponseHelper.success({
      synced, skipped, created, errors,
      total: sales.length,
      durationMs,
      message: `Synced ${synced} sold items, created ${created} new finds in ${(durationMs / 1000).toFixed(1)}s`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    return ApiResponseHelper.internalError(message)
  }
}
