import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

interface MarketplaceItemPayload {
  marketplace: string
  marketplaceProductId: string
  productData: {
    title?: string
    price?: number | string | null
    coverImage?: string | null
    marketplaceUrl?: string | null
    status?: string
  }
  url?: string | null
}

/**
 * POST /api/import/marketplace-item
 * Generic single-item import from any marketplace.
 * Creates a find + product_marketplace_data row.
 * Skips if already imported (matching platform_listing_id + marketplace).
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = (await req.json()) as MarketplaceItemPayload

  const { marketplace, marketplaceProductId, productData } = body

  if (!marketplace || !marketplaceProductId) {
    return ApiResponseHelper.badRequest('marketplace and marketplaceProductId are required')
  }

  const supabase = await createSupabaseServerClient()

  // Check if already imported
  const { data: existing } = await supabase
    .from('product_marketplace_data')
    .select('id')
    .eq('marketplace', marketplace)
    .eq('platform_listing_id', String(marketplaceProductId))
    .maybeSingle()

  if (existing) {
    return ApiResponseHelper.success({ skipped: true, reason: 'already_imported' })
  }

  const price = typeof productData.price === 'string'
    ? parseFloat(productData.price)
    : (productData.price ?? 0)

  const photos: string[] = productData.coverImage ? [productData.coverImage] : []
  const listingUrl = productData.marketplaceUrl || body.url || null

  // Create the find
  const { data: find, error: findError } = await supabase
    .from('finds')
    .insert({
      user_id: user.id,
      name: productData.title || 'Untitled import',
      category: 'other',
      condition: 'good',
      asking_price_gbp: price,
      photos,
      status: 'listed',
      platform_fields: {
        selectedPlatforms: [marketplace],
      },
      selected_marketplaces: [marketplace],
    })
    .select('id')
    .single()

  if (findError || !find) {
    return ApiResponseHelper.internalError(
      `Failed to create find: ${findError?.message ?? 'unknown error'}`
    )
  }

  // Create marketplace data row
  const { error: pmdError } = await supabase
    .from('product_marketplace_data')
    .insert({
      find_id: find.id,
      marketplace,
      platform_listing_id: String(marketplaceProductId),
      platform_listing_url: listingUrl,
      listing_price: price,
      status: 'listed',
    })

  if (pmdError) {
    console.error('[marketplace-item import] PMD insert error:', pmdError.message)
  }

  return ApiResponseHelper.success({ success: true, findId: find.id })
})
