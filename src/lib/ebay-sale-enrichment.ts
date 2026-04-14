import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublishJob } from '@/lib/publish-jobs'
import { getEbayClientForUser } from '@/lib/ebay-client'

/**
 * eBay Fulfillment API order shape (relevant fields only)
 * See: https://developer.ebay.com/api-docs/sell/fulfillment/resources/order/methods/getOrders
 */
export interface EbayOrder {
  orderId: string
  creationDate?: string
  buyer?: {
    username?: string
    taxAddress?: { stateOrProvince?: string; postalCode?: string; countryCode?: string }
  }
  pricingSummary?: {
    total?: { value?: string; currency?: string }
    priceSubtotal?: { value?: string; currency?: string }
    deliveryCost?: { value?: string; currency?: string }
  }
  /** eBay Fulfillment API paymentSummary — contains real fee and net payout data */
  paymentSummary?: {
    totalDueSeller?: { value?: string; currency?: string }
    payments?: Array<{ amount?: { value?: string; currency?: string } }>
  }
  /** Total marketplace fee charged by eBay (final value fee + per-order fee) */
  totalMarketplaceFee?: { value?: string; currency?: string }
  fulfillmentStartInstructions?: Array<{
    shippingStep?: {
      shipTo?: {
        fullName?: string
        contactAddress?: {
          addressLine1?: string
          addressLine2?: string
          city?: string
          stateOrProvince?: string
          postalCode?: string
          countryCode?: string
        }
      }
      shippingCarrierCode?: string
      shippingServiceCode?: string
    }
  }>
  fulfillmentHrefs?: string[]
  lineItems?: EbayLineItem[]
}

export interface EbayLineItem {
  lineItemId?: string
  legacyItemId?: string
  title?: string
  quantity?: number
  total?: { value?: string; currency?: string }
  lineItemFulfillmentInstructions?: {
    shipByDate?: string
  }
  deliveryCost?: { value?: string; currency?: string }
}

interface EnrichResult {
  enriched: boolean
  findId: string
  isNewSale: boolean
  delistedFrom: string[]
}

interface AutoCreateResult {
  findId: string
  created: boolean
  title: string
}

/**
 * Auto-create a find + PMD from an unmatched eBay sold order.
 * Called when the sync finds an eBay order whose legacyItemId doesn't match
 * any existing product_marketplace_data record (i.e. item was sold on eBay
 * but never imported into Wrenlist).
 *
 * After creating the find, runs enrichEbaySoldItem to populate sale metadata.
 */
export async function createFindFromEbaySale(
  supabaseAdmin: SupabaseClient,
  userId: string,
  order: EbayOrder,
  lineItem: EbayLineItem
): Promise<AutoCreateResult> {
  const title = lineItem.title || 'Untitled eBay item'
  const legacyItemId = lineItem.legacyItemId || ''
  const price = parseFloat(lineItem.total?.value || '0')
  const sku = `EB-SALE-${Date.now().toString(36).toUpperCase().slice(-6)}`

  // Try to fetch item details from Browse API for photos/description/condition
  let photos: string[] = []
  let description: string | null = null
  let condition: string | null = null
  let brand: string | null = null
  let enrichedTitle = title

  try {
    const ebayClient = await getEbayClientForUser(userId, supabaseAdmin, 'EBAY_GB')
    const itemDetails = await ebayClient.getItemByLegacyId(legacyItemId)

    if (itemDetails) {
      // Collect all images
      if (itemDetails.image?.imageUrl) {
        photos.push(itemDetails.image.imageUrl)
      }
      if (itemDetails.additionalImages) {
        for (const img of itemDetails.additionalImages) {
          if (img.imageUrl) photos.push(img.imageUrl)
        }
      }

      // Use richer title/description if available
      if (itemDetails.title) enrichedTitle = itemDetails.title
      description = itemDetails.shortDescription || null
      brand = itemDetails.brand || null

      // Map eBay condition to Wrenlist condition
      const condStr = (itemDetails.condition || '').toLowerCase()
      if (condStr.includes('new')) condition = 'new_with_tags'
      else if (condStr.includes('excellent') || condStr.includes('like new')) condition = 'very_good'
      else if (condStr.includes('good')) condition = 'good'
      else if (condStr.includes('used')) condition = 'good'
    }
  } catch {
    // Non-critical — proceed with order data only
  }

  // Create find
  const { data: newFind, error: findError } = await supabaseAdmin
    .from('finds')
    .insert({
      user_id: userId,
      name: enrichedTitle,
      description,
      brand,
      condition,
      asking_price_gbp: price,
      sold_price_gbp: price,
      sold_at: order.creationDate || new Date().toISOString(),
      photos,
      sku,
      status: 'sold',
      platform_fields: {
        selectedPlatforms: ['ebay'],
        ebay_sale_auto_import: true,
      },
      selected_marketplaces: ['ebay'],
    })
    .select('id')
    .single()

  if (findError || !newFind) {
    console.error('[createFindFromEbaySale] Failed to create find:', findError)
    return { findId: '', created: false, title: enrichedTitle }
  }

  // Create PMD row
  const { error: pmdError } = await supabaseAdmin
    .from('product_marketplace_data')
    .insert({
      find_id: newFind.id,
      user_id: userId,
      marketplace: 'ebay',
      platform_listing_id: legacyItemId,
      platform_listing_url: `https://www.ebay.co.uk/itm/${legacyItemId}`,
      listing_price: price,
      status: 'sold',
      fields: {},
    })

  if (pmdError) {
    console.error('[createFindFromEbaySale] Failed to create PMD:', pmdError)
  }

  // Enrich with full sale metadata (buyer, fees, shipment)
  await enrichEbaySoldItem(supabaseAdmin, supabaseAdmin, userId, newFind.id, order, lineItem)

  return { findId: newFind.id, created: true, title: enrichedTitle }
}

/**
 * Enrich an eBay sold item with full sale metadata.
 * Used by both /api/ebay/sync-orders (manual) and /api/cron/ebay-sync (automated).
 *
 * - Marks find as sold if not already
 * - Stores buyer/fee/shipment data in product_marketplace_data.fields.sale
 * - Auto-delists other marketplaces
 * - Re-enriches already-sold items if fields.sale is missing
 */
export async function enrichEbaySoldItem(
  supabase: SupabaseClient,
  supabaseAdmin: SupabaseClient,
  userId: string,
  findId: string,
  order: EbayOrder,
  lineItem: EbayLineItem
): Promise<EnrichResult> {
  // Check current find status
  const { data: find } = await supabase
    .from('finds')
    .select('id, status')
    .eq('id', findId)
    .eq('user_id', userId)
    .single()

  if (!find) return { enriched: false, findId, isNewSale: false, delistedFrom: [] }

  // Check if already enriched with this order
  const { data: pmd } = await supabase
    .from('product_marketplace_data')
    .select('fields')
    .eq('find_id', findId)
    .eq('marketplace', 'ebay')
    .single()

  const existingFields = pmd?.fields as Record<string, unknown> | null
  const existingSale = existingFields?.sale as Record<string, unknown> | undefined
  if (existingSale?.transactionId === order.orderId) {
    // Allow re-enrichment if fees are still estimated or zero (eBay settles 1-2 days later)
    const existingFeeSource = existingSale?.feeSource as string | undefined
    const existingFee = existingSale?.serviceFee as number | undefined
    if (existingFeeSource !== 'estimated' && (existingFee ?? 0) > 0) {
      return { enriched: false, findId, isNewSale: false, delistedFrom: [] }
    }
  }

  const isNewSale = find.status !== 'sold'

  // Parse financial data
  const grossAmount = parseFloat(lineItem.total?.value || '0')
  const deliveryCost = parseFloat(lineItem.deliveryCost?.value || '0')

  // Use real fee from eBay order when available, fall back to ~12.8% estimate
  const lineItemCount = order.lineItems?.length || 1
  let serviceFee: number
  let netAmount: number
  let feeSource: 'actual' | 'estimated'

  const realFee = parseFloat(order.totalMarketplaceFee?.value || '')
  const realNet = parseFloat(order.paymentSummary?.totalDueSeller?.value || '')

  const orderTotal = parseFloat(order.pricingSummary?.total?.value || '0')

  if (!isNaN(realFee) && realFee > 0) {
    // Real fee available — split proportionally across line items if multi-item order
    serviceFee = (lineItemCount > 1 && orderTotal > 0)
      ? Math.round((realFee * (grossAmount / orderTotal)) * 100) / 100
      : realFee
    netAmount = Math.round((grossAmount - serviceFee) * 100) / 100
    feeSource = 'actual'
  } else if (!isNaN(realNet) && realNet > 0 && orderTotal > 0) {
    // No explicit fee but we have net payout — derive fee from gross minus net
    const totalFee = orderTotal - realNet
    serviceFee = lineItemCount > 1
      ? Math.round((totalFee * (grossAmount / orderTotal)) * 100) / 100
      : Math.round(totalFee * 100) / 100
    netAmount = Math.round((grossAmount - serviceFee) * 100) / 100
    feeSource = 'actual'
  } else {
    // Fallback: estimate at ~12.8% of item total
    serviceFee = Math.round(grossAmount * 0.128 * 100) / 100
    netAmount = Math.round((grossAmount - serviceFee) * 100) / 100
    feeSource = 'estimated'
  }

  // Build shipping address from fulfillment instructions
  const shipTo = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo
  const shippingAddress = shipTo ? {
    name: shipTo.fullName || null,
    line1: shipTo.contactAddress?.addressLine1 || null,
    line2: shipTo.contactAddress?.addressLine2 || null,
    city: shipTo.contactAddress?.city || null,
    postalCode: shipTo.contactAddress?.postalCode || null,
    country: shipTo.contactAddress?.countryCode || null,
  } : null

  const carrier = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shippingCarrierCode || null

  // Build sale data matching Vinted's fields.sale shape
  const saleData = {
    transactionId: order.orderId,
    buyer: order.buyer ? {
      username: order.buyer.username || null,
      location: order.buyer.taxAddress?.countryCode || null,
    } : null,
    grossAmount,
    serviceFee,
    netAmount,
    feeSource,
    currency: lineItem.total?.currency || 'GBP',
    shippingAddress,
    trackingNumber: null as string | null,
    carrier,
    shipmentStatus: isNewSale ? null : (existingSale?.shipmentStatus as string) || null,
    orderDate: order.creationDate || null,
    completedDate: null as string | null,
    deliveryCost,
    isBundle: (order.lineItems?.length || 1) > 1,
    itemCount: order.lineItems?.length || 1,
  }

  // Update find
  await supabase.from('finds').update({
    status: 'sold',
    sold_price_gbp: grossAmount,
    sold_at: order.creationDate || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', findId).eq('user_id', userId)

  // Update PMD with sale metadata
  await supabase.from('product_marketplace_data').update({
    status: 'sold',
    fields: { ...(existingFields || {}), sale: saleData },
    updated_at: new Date().toISOString(),
  }).eq('find_id', findId).eq('marketplace', 'ebay')

  // Auto-delist other marketplaces (only for new sales)
  const delistedFrom: string[] = []
  if (isNewSale) {
    const { data: otherListings } = await supabase
      .from('product_marketplace_data')
      .select('marketplace, platform_listing_id')
      .eq('find_id', findId)
      .neq('marketplace', 'ebay')
      .in('status', ['listed', 'needs_publish'])

    if (otherListings && otherListings.length > 0) {
      await supabase.from('product_marketplace_data').update({
        status: 'needs_delist',
        updated_at: new Date().toISOString(),
      }).eq('find_id', findId).neq('marketplace', 'ebay')

      for (const listing of otherListings) {
        delistedFrom.push(listing.marketplace)
        await createPublishJob(supabaseAdmin, {
          user_id: userId,
          find_id: findId,
          platform: listing.marketplace,
          action: 'delist',
          payload: { platform_listing_id: listing.platform_listing_id },
        })
      }
    }
  }

  return { enriched: true, findId, isNewSale, delistedFrom }
}
