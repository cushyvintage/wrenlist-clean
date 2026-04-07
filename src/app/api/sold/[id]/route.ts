import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, user, params) => {
  const id = params?.id as string | undefined
  if (!id) return ApiResponseHelper.badRequest('Missing id')

  const supabase = await createSupabaseServerClient()

  const { data: find, error } = await supabase
    .from('finds')
    .select(
      `
      id, name, category, brand, size, colour, condition,
      description, cost_gbp, asking_price_gbp, sold_price_gbp,
      sourced_at, sold_at, photos, sku, source_type, source_name,
      shipping_weight_grams, shipping_length_cm, shipping_width_cm, shipping_height_cm,
      status, created_at,
      product_marketplace_data (
        marketplace, status, platform_listing_id, platform_listing_url,
        listing_price, fields, last_synced_at
      )
      `
    )
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('status', 'sold')
    .single()

  if (error || !find) {
    return ApiResponseHelper.notFound('Sold item not found')
  }

  // Extract sale metadata from the sold PMD record
  const pmdRecords = (find as Record<string, unknown>).product_marketplace_data as Array<{
    marketplace: string
    status: string
    platform_listing_id: string | null
    platform_listing_url: string | null
    listing_price: number | null
    fields: Record<string, unknown> | null
    last_synced_at: string | null
  }> | null

  const soldPmd = pmdRecords?.find((m) => m.status === 'sold')
  const sale = soldPmd?.fields?.sale as Record<string, unknown> | undefined

  return ApiResponseHelper.success({
    ...find,
    // Flatten sale metadata for easy consumption
    sale: {
      marketplace: soldPmd?.marketplace || 'unknown',
      platformListingId: soldPmd?.platform_listing_id ?? null,
      platformListingUrl: soldPmd?.platform_listing_url ?? null,
      listingPrice: soldPmd?.listing_price ?? null,
      buyer: ((sale?.buyer as Record<string, unknown>)?.username as string) ?? null,
      shipmentStatus: (sale?.shipmentStatus as string) ?? null,
      grossAmount: (sale?.grossAmount as number) ?? null,
      serviceFee: (sale?.serviceFee as number) ?? null,
      netAmount: (sale?.netAmount as number) ?? null,
      trackingNumber: (sale?.trackingNumber as string) ?? null,
    },
  })
})
