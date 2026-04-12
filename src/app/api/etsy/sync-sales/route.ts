import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { createPublishJob } from '@/lib/publish-jobs'
import { withAuth } from '@/lib/with-auth'

/**
 * Mirror a photo from an external CDN to Supabase Storage.
 */
async function mirrorPhotoToStorage(
  photoUrl: string,
  index: number,
  userId: string,
  listingId: string
): Promise<string | null> {
  try {
    if (!photoUrl || !photoUrl.startsWith('http')) return null

    const response = await fetch(photoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
    })

    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let extension = 'jpg'
    if (contentType.includes('png')) extension = 'png'
    else if (contentType.includes('webp')) extension = 'webp'

    const filename = `${userId}/etsy-${listingId}-${index}.${extension}`

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: uploadError } = await supabaseAdmin.storage
      .from('find-photos')
      .upload(filename, buffer, {
        contentType,
        cacheControl: '31536000',
        upsert: true,
      })

    if (uploadError) return null

    const { data: urlData } = supabaseAdmin.storage
      .from('find-photos')
      .getPublicUrl(filename)

    return urlData.publicUrl
  } catch {
    return null
  }
}

interface EtsySaleItem {
  itemId?: string
  title?: string
  price?: number
  thumbnailUrl?: string
  itemUrl?: string
}

interface EtsySalePayload {
  receiptId?: string
  items?: EtsySaleItem[]
  buyer?: { id?: string; username?: string; email?: string }
  grossAmount?: number
  transactionFee?: number
  processingFee?: number
  shippingCost?: number
  netAmount?: number
  currency?: string
  shippingAddress?: Record<string, unknown>
  trackingNumber?: string
  carrier?: string
  orderDate?: string
  paidDate?: string
  isBundle?: boolean
  itemCount?: number
}

async function upsertEtsyCustomer(
  supabase: SupabaseClient,
  userId: string,
  sale: EtsySalePayload
): Promise<string | null> {
  const buyer = sale.buyer
  if (!buyer?.id && !buyer?.username) return null

  const marketplaceUserId = buyer.id ? String(buyer.id) : null
  const username = buyer.username || null

  let existingId: string | null = null
  if (marketplaceUserId) {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('marketplace', 'etsy')
      .eq('marketplace_user_id', marketplaceUserId)
      .maybeSingle()
    existingId = data?.id || null
  }
  if (!existingId && username) {
    const { data } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .eq('marketplace', 'etsy')
      .eq('username', username)
      .maybeSingle()
    existingId = data?.id || null
  }

  const addr = sale.shippingAddress || {}
  const addressFields = {
    address_line1: (addr.line1 as string) || (addr.street as string) || null,
    address_line2: (addr.line2 as string) || null,
    city: (addr.city as string) || null,
    postcode: (addr.zip as string) || (addr.postal_code as string) || null,
    country: (addr.country as string) || null,
  }

  const fullName = (addr.name as string) || (addr.full_name as string) || null
  const email = buyer.email || (addr.email as string) || null

  const customerData = {
    user_id: userId,
    marketplace: 'etsy' as const,
    marketplace_user_id: marketplaceUserId,
    username,
    full_name: fullName,
    email,
    ...addressFields,
    updated_at: new Date().toISOString(),
  }

  if (existingId) {
    const updateData: Record<string, unknown> = { updated_at: customerData.updated_at }
    if (marketplaceUserId) updateData.marketplace_user_id = marketplaceUserId
    if (username) updateData.username = username
    if (fullName) updateData.full_name = fullName
    if (email) updateData.email = email
    if (addressFields.address_line1) Object.assign(updateData, addressFields)

    await supabase.from('customers').update(updateData).eq('id', existingId)
    return existingId
  } else {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select('id')
      .single()
    if (error || !data) {
      console.error('[upsertEtsyCustomer] Insert failed:', error)
      return null
    }
    return data.id
  }
}

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
 * POST /api/etsy/sync-sales
 * Receives EtsySale[] and syncs into Wrenlist.
 * For each sale:
 *   - Matches to existing find by platform_listing_id
 *   - If matched: marks as sold, stores sale metadata
 *   - If not matched: creates new find from sale data with status=sold
 *   - Auto-delists other marketplaces
 */
export const POST = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const body = await req.json()
    const sales: EtsySalePayload[] = body.sales || []

    if (!sales.length) return ApiResponseHelper.badRequest('No sales provided')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let synced = 0, skipped = 0, created = 0, errors = 0

    for (const sale of sales) {
      try {
        const receiptId = String(sale.receiptId || '')
        const saleItems = sale.items || []
        if (!saleItems.length) { skipped++; continue }

        const saleData = {
          receiptId,
          buyer: sale.buyer || null,
          grossAmount: sale.grossAmount,
          transactionFee: sale.transactionFee,
          processingFee: sale.processingFee,
          shippingCost: sale.shippingCost,
          netAmount: sale.netAmount,
          currency: sale.currency || 'GBP',
          shippingAddress: sale.shippingAddress || null,
          trackingNumber: sale.trackingNumber || null,
          carrier: sale.carrier || null,
          orderDate: sale.orderDate || null,
          paidDate: sale.paidDate || null,
          isBundle: sale.isBundle || false,
          itemCount: sale.itemCount || saleItems.length,
        }

        for (const item of saleItems) {
          const itemId = String(item.itemId || '')
          if (!itemId) continue

          const customerId = await upsertEtsyCustomer(supabase, user.id, sale)

          const { data: existingPmd } = await supabase
            .from('product_marketplace_data')
            .select('find_id, status, fields')
            .eq('marketplace', 'etsy')
            .eq('platform_listing_id', itemId)
            .maybeSingle()

          let findId: string
          let isNewSale = true

          if (existingPmd) {
            const { data: find } = await supabase
              .from('finds')
              .select('id, status')
              .eq('id', existingPmd.find_id)
              .eq('user_id', user.id)
              .maybeSingle()

            if (!find) { skipped++; continue }

            const existingFields = existingPmd.fields as Record<string, unknown> | null
            const existingSale = existingFields?.sale as Record<string, unknown> | undefined
            if (find.status === 'sold' && existingSale?.receiptId === receiptId) {
              if (customerId) {
                await supabase.from('product_marketplace_data').update({
                  customer_id: customerId,
                }).eq('find_id', find.id).eq('marketplace', 'etsy')
                await recomputeCustomerAggregates(supabase, customerId)
              }
              skipped++; continue
            }

            findId = find.id
            isNewSale = find.status !== 'sold'

            await supabase.from('finds').update({
              status: 'sold',
              sold_price_gbp: item.price || sale.grossAmount,
              sold_at: sale.orderDate || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq('id', findId).eq('user_id', user.id)

            await supabase.from('product_marketplace_data').update({
              status: 'sold',
              fields: { ...(existingFields || {}), sale: saleData },
              customer_id: customerId,
              updated_at: new Date().toISOString(),
            }).eq('find_id', findId).eq('marketplace', 'etsy')

            synced++
          } else {
            const sku = `ET-OTH-${Date.now().toString(36).toUpperCase().slice(-6)}`

            // Mirror photo to Supabase Storage
            let photos: string[] = []
            if (item.thumbnailUrl) {
              const mirrored = await mirrorPhotoToStorage(item.thumbnailUrl, 0, user.id, itemId)
              photos = [mirrored || item.thumbnailUrl]
            }

            const { data: newFind, error: findError } = await supabase
              .from('finds')
              .insert({
                user_id: user.id,
                name: item.title || 'Untitled',
                category: 'other',
                asking_price_gbp: item.price || sale.grossAmount,
                sold_price_gbp: item.price || sale.grossAmount,
                sold_at: sale.orderDate || new Date().toISOString(),
                photos,
                sku,
                status: 'sold',
                platform_fields: {
                  selectedPlatforms: ['etsy'],
                  etsy: { originalListingId: itemId },
                },
                selected_marketplaces: ['etsy'],
              })
              .select('id')
              .single()

            if (findError || !newFind) { errors++; continue }

            findId = newFind.id

            await supabase.from('product_marketplace_data').insert({
              find_id: findId,
              marketplace: 'etsy',
              platform_listing_id: itemId,
              platform_listing_url: `https://www.etsy.com/listing/${itemId}`,
              listing_price: item.price || sale.grossAmount,
              status: 'sold',
              fields: { sale: saleData },
              customer_id: customerId,
            })

            created++
          }

          if (customerId) {
            await recomputeCustomerAggregates(supabase, customerId)
          }

          // Auto-delist other marketplaces
          if (isNewSale) {
            const { data: otherListings } = await supabase
              .from('product_marketplace_data')
              .select('marketplace, platform_listing_id')
              .eq('find_id', findId)
              .neq('marketplace', 'etsy')
              .in('status', ['listed', 'needs_publish'])

            if (otherListings && otherListings.length > 0) {
              await supabase.from('product_marketplace_data').update({
                status: 'needs_delist',
                updated_at: new Date().toISOString(),
              }).eq('find_id', findId).neq('marketplace', 'etsy')

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

          logMarketplaceEvent(supabase, user.id, {
            findId,
            marketplace: 'etsy',
            eventType: 'sold',
            source: 'api',
            details: { receiptId, itemId, grossAmount: sale.grossAmount, netAmount: sale.netAmount },
          })
        }
      } catch (err) {
        errors++
        console.error('[Etsy Sync Sales] Error processing sale:', err)
      }
    }

    return ApiResponseHelper.success({
      synced, skipped, created, errors,
      total: sales.length,
      message: `Synced ${synced} sold items, created ${created} new finds`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    return ApiResponseHelper.internalError(message)
  }
})
