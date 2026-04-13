import type { SupabaseClient } from '@supabase/supabase-js'
import { createPublishJob } from '@/lib/publish-jobs'

/**
 * eBay Fulfillment API order shape (relevant fields only)
 * See: https://developer.ebay.com/api-docs/sell/fulfillment/resources/order/methods/getOrders
 */
interface EbayOrder {
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

interface EbayLineItem {
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

  if (!find) return { enriched: false, findId, isNewSale: false }

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
    return { enriched: false, findId, isNewSale: false }
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

  if (!isNaN(realFee) && realFee > 0) {
    // Real fee available — split proportionally across line items if multi-item order
    serviceFee = lineItemCount > 1
      ? Math.round((realFee * (grossAmount / parseFloat(order.pricingSummary?.total?.value || '1'))) * 100) / 100
      : realFee
    netAmount = Math.round((grossAmount - serviceFee) * 100) / 100
    feeSource = 'actual'
  } else if (!isNaN(realNet) && realNet > 0) {
    // No explicit fee but we have net payout — derive fee from gross minus net
    const orderTotal = parseFloat(order.pricingSummary?.total?.value || '0')
    const totalFee = orderTotal - realNet
    serviceFee = lineItemCount > 1
      ? Math.round((totalFee * (grossAmount / (orderTotal || 1))) * 100) / 100
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
    shipmentStatus: isNewSale ? 'Label Sent' : (existingSale?.shipmentStatus as string) || null,
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

  return { enriched: true, findId, isNewSale }
}
