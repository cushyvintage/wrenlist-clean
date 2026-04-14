import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { withAuth } from '@/lib/with-auth'

const VALID_STATUSES = ['label sent', 'shipped', 'in transit', 'delivered', 'refunded', 'cancelled']

/** Map common UK carrier names to eBay shippingCarrierCode values */
const CARRIER_TO_EBAY: Record<string, string> = {
  'royal mail': 'ROYAL_MAIL',
  'evri': 'EVRI',
  'hermes': 'EVRI',
  'dpd': 'DPD',
  'dhl': 'DHL',
  'yodel': 'YODEL',
  'ups': 'UPS',
  'fedex': 'FEDEX',
  'parcelforce': 'PARCELFORCE',
}

/**
 * PATCH /api/sold/[id]/shipment
 * Update shipment status and/or tracking number for a sold item.
 * For eBay items, also pushes tracking to eBay Fulfillment API.
 */
export const PATCH = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/sold/')[1]?.split('/shipment')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const body = await req.json() as { shipmentStatus?: string; trackingNumber?: string; carrier?: string }
  const { shipmentStatus, trackingNumber, carrier } = body

  if (!shipmentStatus && trackingNumber === undefined) {
    return ApiResponseHelper.badRequest('Provide shipmentStatus or trackingNumber')
  }

  if (shipmentStatus && !VALID_STATUSES.includes(shipmentStatus.toLowerCase())) {
    return ApiResponseHelper.badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
  }

  const supabase = await createSupabaseServerClient()

  // Verify user owns this sold find
  const { data: find, error: findErr } = await supabase
    .from('finds')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'sold')
    .single()

  if (findErr || !find) {
    return ApiResponseHelper.notFound('Sold item not found')
  }

  // Get the sold PMD record
  const { data: pmd, error: pmdErr } = await supabase
    .from('product_marketplace_data')
    .select('id, fields, marketplace')
    .eq('find_id', id)
    .eq('status', 'sold')
    .limit(1)
    .single()

  if (pmdErr || !pmd) {
    return ApiResponseHelper.notFound('No marketplace sale record found')
  }

  // Merge into existing fields.sale JSONB
  const existingFields = (pmd.fields as Record<string, unknown>) || {}
  const existingSale = (existingFields.sale as Record<string, unknown>) || {}

  const updatedSale = { ...existingSale }
  if (shipmentStatus) updatedSale.shipmentStatus = shipmentStatus
  if (trackingNumber !== undefined) updatedSale.trackingNumber = trackingNumber
  if (carrier) updatedSale.carrier = carrier

  const { error: updateErr } = await supabase
    .from('product_marketplace_data')
    .update({ fields: { ...existingFields, sale: updatedSale } })
    .eq('id', pmd.id)

  if (updateErr) {
    return ApiResponseHelper.internalError(updateErr.message)
  }

  // Propagate status to bundle siblings (same transactionId = same shipment)
  const transactionId = existingSale.transactionId as string | undefined
  if (transactionId) {
    const { data: siblings } = await supabase
      .from('product_marketplace_data')
      .select('id, fields')
      .eq('status', 'sold')
      .neq('id', pmd.id)
      .filter('fields->sale->>transactionId', 'eq', transactionId)

    if (siblings?.length) {
      for (const sib of siblings) {
        const sibFields = (sib.fields as Record<string, unknown>) || {}
        const sibSale = (sibFields.sale as Record<string, unknown>) || {}
        const sibUpdated = { ...sibSale }
        if (shipmentStatus) sibUpdated.shipmentStatus = shipmentStatus
        if (trackingNumber !== undefined) sibUpdated.trackingNumber = trackingNumber
        if (carrier) sibUpdated.carrier = carrier
        await supabase
          .from('product_marketplace_data')
          .update({ fields: { ...sibFields, sale: sibUpdated } })
          .eq('id', sib.id)
      }
    }
  }

  // Push tracking to eBay if this is an eBay sale with a tracking number
  let ebayPushResult: string | null = null
  if (trackingNumber && pmd.marketplace === 'ebay') {
    const orderId = existingSale.transactionId as string | undefined
    if (orderId) {
      try {
        const ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
        const ebayCarrier = CARRIER_TO_EBAY[(carrier || '').toLowerCase()] || 'OTHER'

        // Get line items from the order to include in fulfillment
        const orderData = await ebayClient.getOrders({
          limit: 1,
          filter: `orderId:{${orderId}}`,
        })
        const order = orderData.orders?.[0]
        const lineItems = (order?.lineItems || []).map((li: { lineItemId: string; quantity: number }) => ({
          lineItemId: li.lineItemId,
          quantity: li.quantity || 1,
        }))

        if (lineItems.length > 0) {
          await ebayClient.createShippingFulfillment(orderId, lineItems, trackingNumber, ebayCarrier)
          ebayPushResult = 'success'
        }
      } catch (err) {
        // Non-critical — tracking is saved locally even if eBay push fails
        const msg = err instanceof Error ? err.message : 'Unknown error'
        console.error('[shipment] eBay tracking push failed:', msg)
        ebayPushResult = `failed: ${msg}`
      }
    }
  }

  return ApiResponseHelper.success({
    shipmentStatus: updatedSale.shipmentStatus as string,
    trackingNumber: (updatedSale.trackingNumber as string) || null,
    carrier: (updatedSale.carrier as string) || null,
    ebayPushResult,
  })
})
