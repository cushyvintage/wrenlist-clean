import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

const VALID_STATUSES = ['label sent', 'shipped', 'in transit', 'delivered', 'refunded', 'cancelled']

/**
 * PATCH /api/sold/[id]/shipment
 * Update shipment status and/or tracking number for a sold item
 */
export const PATCH = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/sold/')[1]?.split('/shipment')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const body = await req.json() as { shipmentStatus?: string; trackingNumber?: string }
  const { shipmentStatus, trackingNumber } = body

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
    .select('id, fields')
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

  const { error: updateErr } = await supabase
    .from('product_marketplace_data')
    .update({ fields: { ...existingFields, sale: updatedSale } })
    .eq('id', pmd.id)

  if (updateErr) {
    return ApiResponseHelper.internalError(updateErr.message)
  }

  return ApiResponseHelper.success({
    shipmentStatus: updatedSale.shipmentStatus as string,
    trackingNumber: (updatedSale.trackingNumber as string) || null,
  })
})
