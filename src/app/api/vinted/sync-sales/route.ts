import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { createPublishJob } from '@/lib/publish-jobs'
import { lookupVintedCategory } from '@/lib/vinted-category-lookup'
import { withAuth } from '@/lib/with-auth'
import { isRefundedStatus } from '@/lib/refund-detection'

interface VintedSaleItem {
  itemId?: string
  title?: string
  price?: number
  thumbnailUrl?: string
  itemUrl?: string
}

interface VintedSalePayload {
  transactionId?: string
  shipmentId?: string
  items?: VintedSaleItem[]
  buyer?: { id?: string; username?: string; profileUrl?: string; location?: string; realName?: string; countryCode?: string }
  grossAmount?: number
  serviceFee?: number
  netAmount?: number
  currency?: string
  shippingAddress?: Record<string, unknown>
  trackingNumber?: string
  carrier?: string
  shipmentStatusTitle?: string
  statusCode?: number
  labelUrl?: string
  orderDate?: string
  completedDate?: string
  isBundle?: boolean
  itemCount?: number
  conversationId?: string
}

/**
 * Upsert a customer record from Vinted sale data.
 * Match priority: marketplace_user_id first, then username.
 * Returns the customer ID.
 */
async function upsertVintedCustomer(
  supabase: SupabaseClient,
  userId: string,
  sale: VintedSalePayload
): Promise<string | null> {
  const buyer = sale.buyer
  if (!buyer?.id && !buyer?.username) return null

  const marketplaceUserId = buyer.id ? String(buyer.id) : null
  const username = buyer.username || null

  // Try to find existing customer
  let existingId: string | null = null
  if (marketplaceUserId) {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('marketplace', 'vinted')
      .eq('marketplace_user_id', marketplaceUserId)
      .maybeSingle()
    existingId = data?.id || null
  }
  if (!existingId && username) {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('marketplace', 'vinted')
      .eq('username', username)
      .maybeSingle()
    existingId = data?.id || null
  }

  // Extract address from shippingAddress
  // Vinted getOrderDetails returns: { name, line1, line2, city, postalCode, country, email }
  const addr = sale.shippingAddress || {}
  const addressFields = {
    address_line1: (addr.line1 as string) || (addr.line_1 as string) || (addr.street as string) || null,
    address_line2: (addr.line2 as string) || (addr.line_2 as string) || null,
    city: (addr.city as string) || (addr.town as string) || null,
    postcode: (addr.postalCode as string) || (addr.postal_code as string) || (addr.postcode as string) || null,
    country: (addr.country as string) || (addr.country_name as string) || null,
  }

  // Extract name/email/phone from shippingAddress
  const fullName = (addr.name as string) || (addr.full_name as string) || null
  const email = (addr.email as string) || null
  const phone = (addr.phone as string) || (addr.phone_number as string) || null

  const customerData = {
    user_id: userId,
    marketplace: 'vinted' as const,
    marketplace_user_id: marketplaceUserId,
    username,
    full_name: fullName,
    email,
    phone,
    ...addressFields,
    updated_at: new Date().toISOString(),
  }

  if (existingId) {
    // Update existing — only overwrite address/name if we have new data
    const updateData: Record<string, unknown> = { updated_at: customerData.updated_at }
    if (marketplaceUserId) updateData.marketplace_user_id = marketplaceUserId
    if (username) updateData.username = username
    if (fullName) updateData.full_name = fullName
    if (email) updateData.email = email
    if (phone) updateData.phone = phone
    if (addressFields.address_line1) Object.assign(updateData, addressFields)

    await supabase.from('customers').update(updateData).eq('id', existingId)
    return existingId
  } else {
    // Insert new customer
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select('id')
      .single()
    if (error || !data) {
      console.error('[upsertVintedCustomer] Insert failed:', error)
      return null
    }
    return data.id
  }
}

/**
 * When a refund is detected, three things need to happen beyond just flipping
 * find.status back to 'listed':
 *   1. Recompute the buyer's customer aggregate totals so this sale doesn't
 *      keep inflating their lifetime spend.
 *   2. Re-queue any sibling PMDs that were auto-delisted when the sale
 *      originally fired (delisted → needs_publish). The user's other
 *      marketplaces may have been taken down weeks ago; refunded item is
 *      theirs again, so re-list.
 *   3. Do NOT touch sibling PMDs that are in 'sold' (user may have also sold
 *      this item elsewhere — unlikely but possible in multi-listing flows).
 */
async function handleRefundAftermath(
  supabase: SupabaseClient,
  userId: string,
  findId: string,
  refundedMarketplace: string,
): Promise<void> {
  // (1) Recompute customer aggregates for the buyer of the refunded sale.
  // customer_id sits on the PMD row that just got refunded.
  const { data: refundedPmd } = await supabase
    .from('product_marketplace_data')
    .select('customer_id')
    .eq('find_id', findId)
    .eq('marketplace', refundedMarketplace)
    .maybeSingle()

  if (refundedPmd?.customer_id) {
    await recomputeCustomerAggregates(supabase, refundedPmd.customer_id)
  }

  // (2) Re-list siblings that were auto-delisted. Flip them to needs_publish
  // so the extension puts the listing back up on the other marketplaces.
  // We use updated_at > created_at as a proxy for "was previously active" —
  // PMDs that were never listed (never crosslisted) will never have been
  // auto-delisted here, so they're naturally excluded.
  const { data: siblingPmds } = await supabase
    .from('product_marketplace_data')
    .select('id, marketplace, platform_listing_id')
    .eq('find_id', findId)
    .neq('marketplace', refundedMarketplace)
    .in('status', ['delisted', 'needs_delist', 'error'])

  if (siblingPmds && siblingPmds.length > 0) {
    await supabase
      .from('product_marketplace_data')
      .update({
        status: 'needs_publish',
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('find_id', findId)
      .neq('marketplace', refundedMarketplace)
      .in('status', ['delisted', 'needs_delist', 'error'])

    // Dual-write: enqueue publish jobs so the Jobs page reflects them.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    for (const sib of siblingPmds) {
      await createPublishJob(supabaseAdmin, {
        user_id: userId,
        find_id: findId,
        platform: sib.marketplace,
        action: 'publish',
        payload: { platform_listing_id: sib.platform_listing_id },
      })
    }
  }
}

/**
 * Recompute customer aggregate stats from linked PMD records.
 */
async function recomputeCustomerAggregates(
  supabase: SupabaseClient,
  customerId: string
): Promise<void> {
  const { data: pmds } = await supabase
    .from('product_marketplace_data')
    .select('find_id, fields')
    .eq('customer_id', customerId)
    .eq('status', 'sold')

  if (!pmds || pmds.length === 0) return

  // Fetch sold_at from finds as fallback for missing orderDate
  const findIds = pmds.map(p => p.find_id)
  const { data: finds } = await supabase
    .from('finds')
    .select('id, sold_at')
    .in('id', findIds)

  const findDates = new Map((finds || []).map(f => [f.id, f.sold_at]))

  let totalSpent = 0
  let firstOrder: string | null = null
  let lastOrder: string | null = null

  for (const pmd of pmds) {
    const sale = (pmd.fields as Record<string, unknown>)?.sale as Record<string, unknown> | undefined
    const amount = (sale?.grossAmount as number) || 0
    totalSpent += amount
    const orderDate = (sale?.orderDate as string) || findDates.get(pmd.find_id) || null
    if (orderDate) {
      if (!firstOrder || orderDate < firstOrder) firstOrder = orderDate
      if (!lastOrder || orderDate > lastOrder) lastOrder = orderDate
    }
  }

  await supabase.from('customers').update({
    total_orders: pmds.length,
    total_spent_gbp: totalSpent,
    first_order_at: firstOrder,
    last_order_at: lastOrder,
    updated_at: new Date().toISOString(),
  }).eq('id', customerId)
}

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
export const POST = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await req.json()
    const sales: VintedSalePayload[] = body.sales || []

    if (!sales.length) return ApiResponseHelper.badRequest('No sales provided')

    // Create admin client once for delist jobs (needs service role for RLS bypass)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const startTime = Date.now()
    let synced = 0, skipped = 0, created = 0, errors = 0
    const needsPhotoBackfill: Array<{ findId: string; photos: string[] }> = []

    for (const sale of sales) {
      try {
        const transactionId = String(sale.transactionId || '')
        const saleItems = sale.items || []

        // Empty items but with transactionId: this is the bundle placeholder
        // path (ext v0.9.2 strips synthetic items from `/my_orders` bundle
        // summaries). We can still refresh shipmentStatus + sale metadata on
        // any existing PMDs that already point at this transactionId.
        // Without this, bundle orders never get their shipment status updated
        // after the initial sync because we skip the whole sale.
        if (!saleItems.length) {
          if (!transactionId) { skipped++; continue }

          // Build refreshed sale metadata (same shape as below)
          const refreshSaleData: Record<string, unknown> = {
            transactionId,
            conversationId: sale.conversationId || null,
            shipmentId: sale.shipmentId || null,
            buyer: sale.buyer || null,
            grossAmount: sale.grossAmount,
            serviceFee: sale.serviceFee,
            netAmount: sale.netAmount,
            currency: sale.currency || 'GBP',
            shippingAddress: sale.shippingAddress || null,
            trackingNumber: sale.trackingNumber || null,
            carrier: sale.carrier || null,
            shipmentStatus: sale.shipmentStatusTitle || null,
            statusCode: sale.statusCode || null,
            labelUrl: sale.labelUrl || null,
            orderDate: sale.orderDate || null,
            completedDate: sale.completedDate || null,
            isBundle: sale.isBundle || false,
            itemCount: sale.itemCount || 0,
          }

          // Find all this user's PMDs matching this transactionId
          const { data: bundlePmds } = await supabase
            .from('product_marketplace_data')
            .select('id, find_id, fields, finds!inner(user_id, status)')
            .eq('marketplace', 'vinted')
            .eq('finds.user_id', user.id)
            .filter('fields->sale->>transactionId', 'eq', transactionId)

          if (!bundlePmds || bundlePmds.length === 0) {
            // Nothing to refresh and no items to create — safe to skip
            skipped++
            continue
          }

          // Refresh each matching PMD's shipmentStatus + sale metadata
          for (const pmd of bundlePmds as Array<{
            id: string; find_id: string; fields: Record<string, unknown> | null;
            finds: { user_id: string; status: string } | { user_id: string; status: string }[] | null;
          }>) {
            const existingFields = pmd.fields || {}
            const existingSale = (existingFields.sale as Record<string, unknown> | undefined) || {}

            // Refund detection on the bundle path: same check as the main branch
            const find = Array.isArray(pmd.finds) ? pmd.finds[0] : pmd.finds
            const isNowRefunded = isRefundedStatus(sale.shipmentStatusTitle)
            const wasRefunded = (existingSale?.refundedAt as string | undefined) != null
            if (isNowRefunded && !wasRefunded && find?.status === 'sold') {
              await supabase.from('finds').update({
                status: 'listed',
                sold_price_gbp: null,
                sold_at: null,
                updated_at: new Date().toISOString(),
              }).eq('id', pmd.find_id).eq('user_id', user.id)

              const refundedSale = { ...existingSale, ...refreshSaleData, refundedAt: new Date().toISOString() }
              await supabase.from('product_marketplace_data').update({
                status: 'listed',
                fields: { ...existingFields, sale: refundedSale },
                updated_at: new Date().toISOString(),
              }).eq('id', pmd.id)

              await handleRefundAftermath(supabase, user.id, pmd.find_id, 'vinted')
              continue
            }

            const refreshedSale = { ...existingSale, ...refreshSaleData }
            await supabase.from('product_marketplace_data').update({
              fields: { ...existingFields, sale: refreshedSale },
              updated_at: new Date().toISOString(),
            }).eq('id', pmd.id)
          }
          synced += bundlePmds.length
          continue
        }

        // Sale metadata to store in PMD fields
        const saleData = {
          transactionId,
          conversationId: sale.conversationId || null,
          shipmentId: sale.shipmentId || null,
          buyer: sale.buyer || null,
          grossAmount: sale.grossAmount,
          serviceFee: sale.serviceFee,
          netAmount: sale.netAmount,
          currency: sale.currency || 'GBP',
          shippingAddress: sale.shippingAddress || null,
          trackingNumber: sale.trackingNumber || null,
          carrier: sale.carrier || null,
          shipmentStatus: sale.shipmentStatusTitle || null,
          statusCode: sale.statusCode || null,
          labelUrl: sale.labelUrl || null,
          orderDate: sale.orderDate || null,
          completedDate: sale.completedDate || null,
          isBundle: sale.isBundle || false,
          itemCount: sale.itemCount || saleItems.length,
        }

        for (const item of saleItems) {
          const itemId = String(item.itemId || '')
          if (!itemId) continue

          // Upsert customer before processing find/PMD (runs even for already-synced sales)
          const customerId = await upsertVintedCustomer(supabase, user.id, sale)

          // Try to match to existing find via product_marketplace_data
          const { data: existingPmd } = await supabase
            .from('product_marketplace_data')
            .select('find_id, status, fields')
            .eq('marketplace', 'vinted')
            .eq('platform_listing_id', itemId)
            .maybeSingle()

          let findId: string
          let isNewSale = true

          if (existingPmd) {
            // Verify this find belongs to the user
            const { data: find } = await supabase
              .from('finds')
              .select('id, status')
              .eq('id', existingPmd.find_id)
              .eq('user_id', user.id)
              .maybeSingle()

            if (!find) { skipped++; continue }

            // If already sold AND already enriched with this transaction,
            // still refresh sold_at + shipmentStatus (may have changed since last sync)
            const existingFields = existingPmd.fields as Record<string, unknown> | null
            const existingSale = existingFields?.sale as Record<string, unknown> | undefined
            if (find.status === 'sold' && existingSale?.transactionId === transactionId) {
              // Refund detection: Vinted's shipmentStatus changed to a refund string
              // since last sync. Revert the find to 'listed' so revenue / metrics
              // don't count a sale the seller didn't actually get paid for.
              // We intentionally do NOT auto re-list on other marketplaces here —
              // their listings may have been manually deleted, replaced, or the
              // item may genuinely be gone. The failed-delist banner surfaces
              // what needs manual attention.
              const isNowRefunded = isRefundedStatus(sale.shipmentStatusTitle)
              const wasRefunded = (existingSale?.refundedAt as string | undefined) != null
              if (isNowRefunded && !wasRefunded) {
                console.log(`[Vinted Sync Sales] Refund detected for tx=${transactionId}, reverting find ${find.id}`)
                await supabase.from('finds').update({
                  status: 'listed',
                  sold_price_gbp: null,
                  sold_at: null,
                  updated_at: new Date().toISOString(),
                }).eq('id', find.id).eq('user_id', user.id)

                const refundedSale = {
                  ...existingSale,
                  ...saleData,
                  refundedAt: new Date().toISOString(),
                }
                await supabase.from('product_marketplace_data').update({
                  status: 'listed',
                  fields: { ...(existingFields || {}), sale: refundedSale },
                  updated_at: new Date().toISOString(),
                }).eq('find_id', find.id).eq('marketplace', 'vinted')

                await handleRefundAftermath(supabase, user.id, find.id, 'vinted')

                await logMarketplaceEvent(supabase, user.id, {
                  findId: find.id,
                  marketplace: 'vinted',
                  eventType: 'refund_detected',
                  source: 'api',
                  details: {
                    transactionId,
                    shipmentStatus: sale.shipmentStatusTitle,
                    revertedSoldPrice: existingSale?.grossAmount,
                  },
                })
                synced++; continue
              }

              // Link customer if missing
              if (customerId) {
                await supabase.from('product_marketplace_data').update({
                  customer_id: customerId,
                }).eq('find_id', find.id).eq('marketplace', 'vinted')
                await recomputeCustomerAggregates(supabase, customerId)
              }
              // Refresh sold_at if we have a real orderDate and current sold_at looks like import time
              if (sale.orderDate) {
                await supabase.from('finds').update({
                  sold_at: sale.orderDate,
                  updated_at: new Date().toISOString(),
                }).eq('id', find.id).eq('user_id', user.id)
              }
              // Refresh shipmentStatus + sale metadata
              const refreshedSale = { ...existingSale, ...saleData }
              await supabase.from('product_marketplace_data').update({
                fields: { ...(existingFields || {}), sale: refreshedSale },
                updated_at: new Date().toISOString(),
              }).eq('find_id', find.id).eq('marketplace', 'vinted')
              synced++; continue
            }

            findId = find.id
            isNewSale = find.status !== 'sold'

            // Mark find as sold (or update sold data if re-enriching)
            await supabase.from('finds').update({
              status: 'sold',
              sold_price_gbp: item.price || sale.grossAmount,
              sold_at: sale.orderDate || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', findId).eq('user_id', user.id)

            // Update PMD status + store sale metadata (preserve existing fields)
            await supabase.from('product_marketplace_data').update({
              status: 'sold',
              fields: { ...(existingFields || {}), sale: saleData },
              customer_id: customerId,
              updated_at: new Date().toISOString(),
            }).eq('find_id', findId).eq('marketplace', 'vinted')

            synced++
          } else {
            // No existing find — create new one from sale data
            const category = await lookupVintedCategory(null)
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
              customer_id: customerId,
            })

            created++
          }

          // Recompute customer aggregates after linking
          if (customerId) {
            await recomputeCustomerAggregates(supabase, customerId)
          }

          // Check if photos need mirroring to Supabase Storage
          const { data: findPhotos } = await supabase
            .from('finds')
            .select('photos')
            .eq('id', findId)
            .single()

          if (findPhotos?.photos?.length) {
            const hasExternalUrl = findPhotos.photos.some(
              (url: string) => !url.includes('supabase') && (url.includes('vinted.net') || url.includes('vinted.com'))
            )
            if (hasExternalUrl) {
              needsPhotoBackfill.push({ findId, photos: findPhotos.photos })
            }
          }

          // Auto-delist other marketplaces (only for new sales, not re-enrichment)
          if (isNewSale) {
            const { data: otherListings } = await supabase
              .from('product_marketplace_data')
              .select('marketplace, platform_listing_id')
              .eq('find_id', findId)
              .neq('marketplace', 'vinted')
              .in('status', ['listed', 'needs_publish', 'draft', 'hidden'])

            if (otherListings && otherListings.length > 0) {
              await supabase.from('product_marketplace_data').update({
                status: 'needs_delist',
                updated_at: new Date().toISOString(),
              }).eq('find_id', findId).neq('marketplace', 'vinted')

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
          }

          // Log event
          await logMarketplaceEvent(supabase, user.id, {
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
      needsPhotoBackfill,
      message: `Synced ${synced} sold items, created ${created} new finds in ${(durationMs / 1000).toFixed(1)}s`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    return ApiResponseHelper.internalError(message)
  }
})
