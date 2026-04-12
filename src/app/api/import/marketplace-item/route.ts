import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { generateUniqueSKU } from '@/lib/sku.server'

interface MarketplaceItemPayload {
  marketplace: string
  marketplaceProductId: string
  productData: {
    title?: string
    description?: string | null
    price?: number | string | null
    coverImage?: string | null
    photos?: string[]
    marketplaceUrl?: string | null
    status?: string
    brand?: string | null
    condition?: string | null
    colour?: string | null
    size?: string | null
    category?: string | null
  }
  url?: string | null
}

/**
 * Mirror a photo from an external CDN to Supabase Storage.
 * Returns the public Supabase URL, or null on failure.
 */
async function mirrorPhotoToStorage(
  photoUrl: string,
  index: number,
  userId: string,
  marketplace: string,
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

    const filename = `${userId}/${marketplace}-${listingId}-${index}.${extension}`

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

/**
 * Fetch full listing detail from Depop's public API (server-side, no CORS).
 * Returns enriched product data or null if the API call fails.
 */
async function fetchDepopDetail(listingId: string): Promise<{
  description?: string
  brand?: string
  condition?: string
  colour?: string
  category?: string
  photos?: string[]
} | null> {
  try {
    const res = await fetch(`https://webapi.depop.com/api/v2/products/${listingId}/?lang=en`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    if (!res.ok) return null

    const data = await res.json()

    // Map condition
    const conditionMap: Record<string, string> = {
      brand_new: 'new_with_tags',
      like_new: 'new_without_tags',
      used_like_new: 'new_without_tags',
      used_excellent: 'very_good',
      used_good: 'good',
      used_fair: 'fair',
    }

    // Build category from gender + group + productType
    const gender = data.isKids ? 'kidswear'
      : data.gender === 'female' ? 'womenswear'
      : data.gender === 'male' ? 'menswear'
      : 'everything-else'
    const category = data.group && data.productType
      ? `${gender}|${data.group}|${data.productType}`
      : undefined

    // Extract all photo URLs (highest resolution)
    const photos: string[] = []
    if (Array.isArray(data.pictures)) {
      for (const pic of data.pictures) {
        if (Array.isArray(pic) && pic.length > 0) {
          const best = pic[pic.length - 1]
          if (best?.url) photos.push(best.url)
        }
      }
    }

    return {
      description: data.description || undefined,
      brand: data.brandName || undefined,
      condition: conditionMap[data.condition?.id] || undefined,
      colour: data.colour?.[0]?.name || undefined,
      category,
      photos: photos.length > 0 ? photos : undefined,
    }
  } catch {
    return null
  }
}

/** Map Facebook/extension condition strings to Wrenlist FindCondition */
function mapCondition(raw?: string | null): string {
  if (!raw) return 'good'
  const lower = raw.toLowerCase()
  if (lower.includes('new') && lower.includes('tag')) return 'new_with_tags'
  if (lower.includes('newwithouttags') || lower === 'new') return 'new_without_tags'
  if (lower.includes('verygood') || lower.includes('like_new') || lower.includes('used_like_new')) return 'very_good'
  if (lower.includes('good') || lower.includes('used_good')) return 'good'
  if (lower.includes('fair') || lower.includes('used_fair') || lower.includes('satisfactory')) return 'fair'
  if (lower.includes('poor')) return 'poor'
  return 'good'
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

  // Server-side enrichment for Depop (extension's getListing returns null for some items)
  if (marketplace === 'depop') {
    const detail = await fetchDepopDetail(String(marketplaceProductId))
    if (detail) {
      if (detail.description && !productData.description) productData.description = detail.description
      if (detail.brand && !productData.brand) productData.brand = detail.brand
      if (detail.condition && !productData.condition) productData.condition = detail.condition
      if (detail.colour && !productData.colour) productData.colour = detail.colour
      if (detail.category && !productData.category) productData.category = detail.category
      if (detail.photos && (!productData.photos || productData.photos.length === 0)) {
        productData.photos = detail.photos
      }
    }
  }

  const price = typeof productData.price === 'string'
    ? parseFloat(productData.price)
    : (productData.price ?? 0)

  // Collect all photo URLs (cover + additional photos array)
  const rawPhotoUrls: string[] = []
  if (productData.coverImage) rawPhotoUrls.push(productData.coverImage)
  if (productData.photos?.length) {
    for (const p of productData.photos) {
      if (p && !rawPhotoUrls.includes(p)) rawPhotoUrls.push(p)
    }
  }

  // Mirror all photos to Supabase Storage (external CDN URLs are ephemeral)
  const listingIdStr = String(marketplaceProductId)
  const mirrorResults = await Promise.all(
    rawPhotoUrls.map((url, i) => mirrorPhotoToStorage(url, i, user.id, marketplace, listingIdStr))
  )
  const photos = mirrorResults.map((mirrored, i) => mirrored || rawPhotoUrls[i])

  const listingUrl = productData.marketplaceUrl || body.url || null
  const condition = mapCondition(productData.condition)

  // Build platform_fields with any extra metadata
  const platformFields: Record<string, unknown> = {
    selectedPlatforms: [marketplace],
  }
  if (productData.brand) platformFields.brand = productData.brand
  if (productData.colour) platformFields.colour = productData.colour
  if (productData.size) platformFields.size = productData.size

  // Create the find
  const JUNK_BRANDS = ['no brand', 'unknown', 'unbranded', 'n/a', 'none', 'other']
  const rawBrand = productData.brand?.trim() || null
  const brand = rawBrand && !JUNK_BRANDS.includes(rawBrand.toLowerCase()) && rawBrand.length <= 60
    ? rawBrand : null

  const category = productData.category || 'other'
  const sku = await generateUniqueSKU(category, user.id)

  const { data: find, error: findError } = await supabase
    .from('finds')
    .insert({
      user_id: user.id,
      name: productData.title || 'Untitled import',
      description: productData.description || null,
      category,
      condition,
      brand,
      colour: productData.colour || null,
      size: productData.size || null,
      asking_price_gbp: price,
      photos,
      sku,
      source_type: 'marketplace_import',
      status: 'listed',
      platform_fields: platformFields,
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
