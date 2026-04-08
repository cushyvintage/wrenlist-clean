import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/sold/[id]/label
 * Get existing label data for a sold item
 */
export const GET = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/sold/')[1]?.split('/label')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const supabase = await createSupabaseServerClient()

  // Verify ownership
  const { data: find } = await supabase
    .from('finds')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'sold')
    .single()

  if (!find) return ApiResponseHelper.notFound('Sold item not found')

  const { data: pmd } = await supabase
    .from('product_marketplace_data')
    .select('fields, marketplace')
    .eq('find_id', id)
    .eq('status', 'sold')
    .limit(1)
    .single()

  if (!pmd) return ApiResponseHelper.notFound('No sale record found')

  const sale = (pmd.fields as Record<string, unknown>)?.sale as Record<string, unknown> | undefined

  return ApiResponseHelper.success({
    hasLabel: !!(sale?.labelUrl || sale?.labelStoragePath),
    labelUrl: (sale?.labelUrl as string) || null,
    labelStoragePath: (sale?.labelStoragePath as string) || null,
    trackingNumber: (sale?.trackingNumber as string) || null,
    carrier: (sale?.carrier as string) || null,
    shipmentId: (sale?.shipmentId as string) || null,
    transactionId: (sale?.transactionId as string) || null,
    marketplace: pmd.marketplace,
  })
})

/**
 * POST /api/sold/[id]/label
 * Save a generated shipping label for a sold item
 */
export const POST = withAuth(async (req, user, params) => {
  const id = (params?.id as string | undefined) || req.url.split('/api/sold/')[1]?.split('/label')[0]
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const body = await req.json() as {
    labelUrl: string
    trackingNumber?: string
    carrier?: string
    shipmentId?: string
  }

  if (!body.labelUrl) return ApiResponseHelper.badRequest('labelUrl is required')

  const supabase = await createSupabaseServerClient()

  // Verify ownership
  const { data: find } = await supabase
    .from('finds')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'sold')
    .single()

  if (!find) return ApiResponseHelper.notFound('Sold item not found')

  // Get PMD record
  const { data: pmd } = await supabase
    .from('product_marketplace_data')
    .select('id, fields')
    .eq('find_id', id)
    .eq('status', 'sold')
    .limit(1)
    .single()

  if (!pmd) return ApiResponseHelper.notFound('No sale record found')

  // Try to download PDF and upload to Supabase Storage
  let storagePath: string | null = null
  try {
    const pdfRes = await fetch(body.labelUrl)
    if (pdfRes.ok) {
      const pdfBuffer = await pdfRes.arrayBuffer()
      const path = `labels/${user.id}/${id}.pdf`

      const { error: uploadErr } = await supabase.storage
        .from('shipping-labels')
        .upload(path, new Uint8Array(pdfBuffer), {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (!uploadErr) storagePath = path
    }
  } catch {
    // Non-fatal — label URL still saved even if storage upload fails
  }

  // Merge into existing sale data
  const existingFields = (pmd.fields as Record<string, unknown>) || {}
  const existingSale = (existingFields.sale as Record<string, unknown>) || {}

  const updatedSale = {
    ...existingSale,
    labelUrl: body.labelUrl,
    labelStoragePath: storagePath,
    labelGeneratedAt: new Date().toISOString(),
    shipmentStatus: 'label sent',
    ...(body.trackingNumber && { trackingNumber: body.trackingNumber }),
    ...(body.carrier && { carrier: body.carrier }),
    ...(body.shipmentId && { shipmentId: body.shipmentId }),
  }

  const { error: updateErr } = await supabase
    .from('product_marketplace_data')
    .update({ fields: { ...existingFields, sale: updatedSale } })
    .eq('id', pmd.id)

  if (updateErr) return ApiResponseHelper.internalError(updateErr.message)

  return ApiResponseHelper.success({
    labelUrl: body.labelUrl,
    labelStoragePath: storagePath,
    shipmentStatus: 'label sent',
  })
})
