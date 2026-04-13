import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/** Strip eBay anonymised delivery point references like "ebayvqtqkf9" */
function stripEbayPlaceholder(value: string | null): string | null {
  if (!value) return null
  return /^ebay[a-z0-9]+$/i.test(value) ? null : value
}

/** Normalise address fields from different marketplace shapes into a common format */
function normaliseAddress(addr: Record<string, unknown>) {
  return {
    name: (addr.name as string) ?? (addr.fullName as string) ?? null,
    firstLine: stripEbayPlaceholder((addr.firstLine as string) ?? (addr.line1 as string) ?? (addr.address_line1 as string) ?? null),
    secondLine: stripEbayPlaceholder((addr.secondLine as string) ?? (addr.line2 as string) ?? (addr.address_line2 as string) ?? null),
    city: (addr.city as string) ?? null,
    state: (addr.state as string) ?? (addr.stateOrProvince as string) ?? null,
    country: (addr.country as string) ?? (addr.countryCode as string) ?? null,
    zip: (addr.zip as string) ?? (addr.postalCode as string) ?? (addr.postcode as string) ?? null,
  }
}

/**
 * GET /api/sold/[id]
 * Fetch a single sold item with marketplace + customer data
 */
export const GET = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/sold/')[1]?.split('?')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const supabase = await createSupabaseServerClient()

  // Fetch find separately from PMD to avoid .single() issues with 1:many join
  const { data: find, error } = await supabase
    .from('finds')
    .select(
      `
      id, name, category, brand, size, colour, condition,
      description, cost_gbp, asking_price_gbp, sold_price_gbp,
      sourced_at, sold_at, photos, sku, source_type, source_name,
      status, created_at
      `
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'sold')
    .single()

  if (error || !find) {
    return ApiResponseHelper.notFound('Sold item not found')
  }

  // Fetch PMD records separately
  const { data: pmdRecords } = await supabase
    .from('product_marketplace_data')
    .select('marketplace, status, platform_listing_id, platform_listing_url, listing_price, fields, last_synced_at, customer_id')
    .eq('find_id', id)

  const soldPmd = pmdRecords?.find((m) => m.status === 'sold')
  const sale = (soldPmd?.fields as Record<string, unknown> | null)?.sale as Record<string, unknown> | undefined

  // Fetch linked customer if available
  const customerId = (soldPmd as Record<string, unknown> | undefined)?.customer_id as string | null
  const { data: customer } = customerId
    ? await supabase.from('customers').select('*').eq('id', customerId).single()
    : { data: null }

  return ApiResponseHelper.success({
    ...find,
    // Flatten sale metadata for easy consumption
    sale: {
      marketplace: soldPmd?.marketplace || 'unknown',
      platformListingId: soldPmd?.platform_listing_id ?? null,
      platformListingUrl: soldPmd?.platform_listing_url ?? null,
      listingPrice: soldPmd?.listing_price ?? null,
      buyer: ((sale?.buyer as Record<string, unknown>)?.username as string)
        ?? ((sale?.buyer as Record<string, unknown>)?.name as string)
        ?? null,
      shipmentStatus: (sale?.shipmentStatus as string) ?? (sale?.deliveryStatus as string) ?? null,
      grossAmount: (sale?.grossAmount as number) ?? null,
      serviceFee: (sale?.serviceFee as number) ?? null,
      netAmount: (sale?.netAmount as number) ?? null,
      trackingNumber: (sale?.trackingNumber as string) ?? null,
      carrier: (sale?.carrier as string) ?? null,
      shippingCost: (sale?.shippingCost as number) ?? null,
      taxAmount: (sale?.taxAmount as number) ?? null,
      discount: (sale?.discount as number) ?? null,
      refundAmount: (sale?.refundAmount as number) ?? null,
      buyerPaid: (sale?.buyerPaid as number) ?? null,
      isGift: (sale?.isGift as boolean) ?? false,
      giftMessage: (sale?.giftMessage as string) ?? null,
      receiptItems: (sale?.receiptItems as unknown[]) ?? null,
      feeSource: (sale?.feeSource as string) ?? null,
      transactionId: (sale?.transactionId as string) ?? null,
      conversationId: (sale?.conversationId as string) ?? null,
      labelUrl: (sale?.labelUrl as string) ?? null,
      shippingAddress: sale?.shippingAddress ? normaliseAddress(sale.shippingAddress as Record<string, unknown>) : null,
      orderDate: (sale?.orderDate as string) ?? null,
    },
    customer: customer || null,
  })
})

/**
 * DELETE /api/sold/[id]
 * Revert a sold item back to listed status (removes sold_at, sold_price_gbp, resets PMD)
 */
export const DELETE = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/sold/')[1]?.split('?')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const supabase = await createSupabaseServerClient()

  // Ensure user owns this find and it is sold
  const { data: existing, error: checkError } = await supabase
    .from('finds')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'sold')
    .single()

  if (checkError || !existing) {
    return ApiResponseHelper.notFound('Sold item not found')
  }

  // Delete the find entirely
  const { error } = await supabase.from('finds').delete().eq('id', id)

  if (error) {
    return ApiResponseHelper.internalError(error.message)
  }

  return ApiResponseHelper.success({ success: true })
})
