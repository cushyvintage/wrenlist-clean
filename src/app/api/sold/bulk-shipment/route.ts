import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

const VALID_STATUSES = ['label sent', 'shipped', 'in transit', 'delivered', 'refunded', 'cancelled']

/**
 * PATCH /api/sold/bulk-shipment
 * Bulk update shipment status for multiple sold items
 */
export const PATCH = withAuth(async (req, user) => {
  const body = await req.json() as { findIds: string[]; shipmentStatus: string }
  const { findIds, shipmentStatus } = body

  if (!findIds?.length) return ApiResponseHelper.badRequest('No findIds provided')
  if (!shipmentStatus) return ApiResponseHelper.badRequest('No shipmentStatus provided')
  if (!VALID_STATUSES.includes(shipmentStatus.toLowerCase())) {
    return ApiResponseHelper.badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`)
  }

  if (findIds.length > 500) return ApiResponseHelper.badRequest('Maximum 500 items per batch')

  const supabase = await createSupabaseServerClient()

  // Verify all finds belong to user and are sold
  const { data: finds, error: findErr } = await supabase
    .from('finds')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'sold')
    .in('id', findIds)

  if (findErr) return ApiResponseHelper.internalError(findErr.message)

  const validIds = new Set((finds || []).map((f) => f.id))
  if (validIds.size === 0) return ApiResponseHelper.notFound('No matching sold items found')

  // Get all sold PMD records for these finds
  const { data: pmds, error: pmdErr } = await supabase
    .from('product_marketplace_data')
    .select('id, find_id, fields')
    .eq('status', 'sold')
    .in('find_id', Array.from(validIds))

  if (pmdErr) return ApiResponseHelper.internalError(pmdErr.message)

  // Update each PMD record's fields.sale.shipmentStatus
  let updated = 0
  for (const pmd of pmds || []) {
    const existingFields = (pmd.fields as Record<string, unknown>) || {}
    const existingSale = (existingFields.sale as Record<string, unknown>) || {}

    const { error } = await supabase
      .from('product_marketplace_data')
      .update({
        fields: {
          ...existingFields,
          sale: { ...existingSale, shipmentStatus },
        },
      })
      .eq('id', pmd.id)

    if (!error) updated++
  }

  return ApiResponseHelper.success({ updated, requested: findIds.length })
})
