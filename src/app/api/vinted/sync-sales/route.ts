import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { createPublishJob } from '@/lib/publish-jobs'
import { lookupVintedCategory } from '@/lib/vinted-category-lookup'
import { withAuth } from '@/lib/with-auth'

interface VintedSaleItem {
  itemId?: string
  title?: string
  price?: number
  thumbnailUrl?: string
  itemUrl?: string
}

interface VintedSalePayload {
  transactionId?: string
  items?: VintedSaleItem[]
  buyer?: { id?: string; username?: string; profileUrl?: string; location?: string }
  grossAmount?: number
  serviceFee?: number
  netAmount?: number
  currency?: string
  shippingAddress?: Record<string, unknown>
  trackingNumber?: string
  carrier?: string
  shipmentStatusTitle?: string
  orderDate?: string
  completedDate?: string
  isBundle?: boolean
  itemCount?: number
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
  const addr = sale.shippingAddress || {}
  const addressFields = {
    address_line1: (addr.line1 as string) || (addr.address1 as string) || (addr.street as string) || null,
    address_line2: (addr.line2 as string) || (addr.address2 as string) || null,
    city: (addr.city as string) || null,
    postcode: (addr.postalCode as string) || (addr.postal_code as string) || (addr.zip as string) || null,
    country: (addr.country as string) || (addr.country_title as string) || null,
  }

  // Extract name from shippingAddress or buyer
  const fullName = (addr.full_name as string) || (addr.name as string) || null
  const email = (addr.email as string) || null
  const phone = (addr.phone_number as string) || (addr.phone as string) || null

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
 * Recompute customer aggregate stats from linked PMD records.
 */
async function recomputeCustomerAggregates(
  supabase: SupabaseClient,
  customerId: string
): Promise<void> {
  const { data: pmds } = await supabase
    .from('product_marketplace_data')
    .select('fields')
    .eq('customer_id', customerId)
    .eq('status', 'sold')

  if (!pmds || pmds.length === 0) return

  let totalSpent = 0
  let firstOrder: string | null = null
  let lastOrder: string | null = null

  for (const pmd of pmds) {
    const sale = (pmd.fields as Record<string, unknown>)?.sale as Record<string, unknown> | undefined
    if (!sale) continue
    const amount = (sale.grossAmount as number) || 0
    totalSpent += amount
    const orderDate = (sale.orderDate as string) || null
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

            // If already sold AND already enriched with this transaction, skip find update
            // but still link customer if missing
            const existingFields = existingPmd.fields as Record<string, unknown> | null
            const existingSale = existingFields?.sale as Record<string, unknown> | undefined
            if (find.status === 'sold' && existingSale?.transactionId === transactionId) {
              // Link customer to PMD if not yet linked
              if (customerId && !existingPmd.fields) {
                await supabase.from('product_marketplace_data').update({
                  customer_id: customerId,
                }).eq('find_id', find.id).eq('marketplace', 'vinted')
              }
              if (customerId) {
                // Always ensure customer_id is set
                await supabase.from('product_marketplace_data').update({
                  customer_id: customerId,
                }).eq('find_id', find.id).eq('marketplace', 'vinted')
                await recomputeCustomerAggregates(supabase, customerId)
              }
              skipped++; continue
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
              .in('status', ['listed', 'needs_publish'])

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
      needsPhotoBackfill,
      message: `Synced ${synced} sold items, created ${created} new finds in ${(durationMs / 1000).toFixed(1)}s`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    return ApiResponseHelper.internalError(message)
  }
})
