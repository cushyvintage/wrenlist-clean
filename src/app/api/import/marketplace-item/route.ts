import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { generateUniqueSKU } from '@/lib/sku.server'

/**
 * Lightweight keyword-based category classifier for imported listings.
 * No API calls — instant, works for bulk imports. Returns a top-level
 * Wrenlist category or 'other' if no match.
 */
function classifyCategoryFromTitle(title: string): string {
  const t = title.toLowerCase()

  // Returns leaf-level categories (top_general) so they match the category picker dropdown
  if (/\b(dress|shirt|blouse|jacket|coat|jeans|trousers|skirt|cardigan|jumper|sweater|hoodie|blazer|suit|shorts|leggings|dungarees|kimono|poncho|waistcoat)\b/.test(t)) return 'clothing_womenswear_general'
  if (/\b(shoes?|boots?|trainers?|sneakers?|sandals?|heels?|loafers?|slippers?|pumps)\b/.test(t)) return 'clothing_womenswear_general'
  if (/\b(handbag|purse|wallet|clutch|tote bag|backpack|rucksack|satchel|messenger bag)\b/.test(t)) return 'clothing_womenswear_general'
  if (/\b(scarf|hat|gloves?|belt|tie|bow tie|cufflinks?|brooch|necklace|bracelet|earrings?|ring|jewel)/i.test(t)) return 'clothing_womenswear_general'

  if (/\b(book|novel|paperback|hardback|hardcover|edition|treasury|encyclopedia|dictionary|atlas|biography|autobiography|isbn)\b/.test(t)) return 'books_media_general'
  if (/\b(vinyl|record|lp|cd|dvd|blu-ray|cassette|vhs)\b/.test(t)) return 'books_media_general'

  if (/\b(plate|bowl|mug|cup|saucer|teapot|vase|jug|pitcher|decanter|tureen|platter|dish|casserole)\b/.test(t)) return 'home_garden_general'
  if (/\b(lamp|mirror|cushion|curtain|rug|candle|frame|clock|ornament|figurine)\b/.test(t)) return 'home_garden_general'
  if (/\b(garden|planter|plant pot|watering|patio|heater|shed|mower|lawn|fence|gate|compost|basket)\b/.test(t)) return 'home_garden_general'
  if (/\b(furniture|chair|table|desk|shelf|cabinet|drawer|wardrobe|bookcase|bench|stool|sofa|couch|bed|mattress)\b/.test(t)) return 'home_garden_general'
  if (/\b(kitchen|cutlery|pan|pot|chopping board|baking|kettle|toaster|blender|mixer)\b/.test(t)) return 'home_garden_general'
  if (/\b(porcelain|ceramic|pottery|stoneware|earthenware|bone china|chintz|wedgwood|spode|denby|royal doulton|minton)\b/.test(t)) return 'home_garden_general'

  if (/\b(antique|victorian|edwardian|georgian|regency|art deco|art nouveau|vintage.*19[0-4]\d|c\.\s*1[89]\d\d)\b/.test(t)) return 'antiques_general'

  if (/\b(medal|coin|stamp|badge|pin|militaria|memorabilia|card|trading card|pokemon|model|diecast|die-?cast)\b/.test(t)) return 'collectibles_general'

  if (/\b(phone|iphone|samsung|ipad|tablet|laptop|computer|monitor|speaker|headphones?|earbuds|charger|cable|adapter|camera|playstation|xbox|nintendo|console|controller)\b/.test(t)) return 'electronics_general'

  if (/\b(toy|lego|playmobil|barbie|doll|puzzle|board game|game|teddy|plush|action figure|nerf)\b/.test(t)) return 'toys_games_general'

  if (/\b(painting|print|lithograph|etching|watercolour|watercolor|oil painting|canvas|artwork|sculpture|statue)\b/.test(t)) return 'art_general'

  if (/\b(bike|bicycle|golf|tennis|football|cricket|rugby|running|hiking|camping|fishing|yoga|gym|dumbbell|weight|treadmill|kayak|surfboard)\b/.test(t)) return 'sports_outdoors_general'

  if (/\b(baby|toddler|pram|pushchair|buggy|stroller|highchair|cot|nursery|bib|dummy|nappy|potty|car seat)\b/.test(t)) return 'baby_toddler_general'

  if (/\b(guitar|piano|keyboard|drum|violin|ukulele|flute|saxophone|trumpet|harmonica|microphone|amplifier|amp)\b/.test(t)) return 'musical_instruments_general'

  if (/\b(perfume|fragrance|makeup|cosmetic|skincare|moisturiser|serum|cologne|aftershave|razor|hair dryer|straightener|curler)\b/.test(t)) return 'health_beauty_general'

  if (/\b(fabric|yarn|wool|thread|sewing|knitting|crochet|embroidery|beads?|craft|ribbon|button|pattern)\b/.test(t)) return 'craft_supplies_general'

  if (/\b(dog|cat|pet|fish tank|aquarium|bird cage|hamster|rabbit|leash|collar|pet bed|scratching post)\b/.test(t)) return 'pet_supplies_general'

  if (/\b(car|motorcycle|motorbike|scooter|bicycle|tyre|wheel|bumper|exhaust|engine|alternator|brake|headlight|wing mirror)\b/.test(t)) return 'vehicles_parts_general'

  if (/\bvintage\b/.test(t)) return 'collectibles_general'

  return 'other_general'
}

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
async function fetchDepopDetail(listingId: string, bearerToken?: string, depopUserId?: string): Promise<{
  description?: string
  brand?: string
  condition?: string
  colour?: string
  category?: string
  photos?: string[]
} | null> {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    }
    if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`
    if (depopUserId) headers['Depop-UserId'] = depopUserId

    const res = await fetch(`https://webapi.depop.com/api/v2/products/${listingId}/?lang=en`, { headers })
    if (!res.ok) {
      console.warn(`[Depop enrichment] API returned ${res.status} for listing ${listingId}`)
      return null
    }

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
    const depopToken = (body as { depopBearerToken?: string }).depopBearerToken
    const depopUserId = (body as { depopUserId?: string }).depopUserId
    const detail = await fetchDepopDetail(String(marketplaceProductId), depopToken || undefined, depopUserId || undefined)
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

  // Collect all photo URLs (cover + additional photos array), cap at 10
  const MAX_PHOTOS = 10
  const rawPhotoUrls: string[] = []
  if (productData.coverImage) rawPhotoUrls.push(productData.coverImage)
  if (productData.photos?.length) {
    for (const p of productData.photos) {
      if (p && !rawPhotoUrls.includes(p)) rawPhotoUrls.push(p)
      if (rawPhotoUrls.length >= MAX_PHOTOS) break
    }
  }

  // Mirror all photos to Supabase Storage in parallel (external CDN URLs are ephemeral)
  const listingIdStr = String(marketplaceProductId)
  const mirrorResults = await Promise.all(
    rawPhotoUrls.map((url, i) =>
      Promise.race([
        mirrorPhotoToStorage(url, i, user.id, marketplace, listingIdStr),
        new Promise<null>(resolve => setTimeout(() => resolve(null), 15000)), // 15s timeout per photo
      ])
    )
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

  // Auto-classify from title if no category provided
  const rawCategory = productData.category || 'other'
  const title = productData.title || 'Untitled import'
  const category = rawCategory === 'other' ? classifyCategoryFromTitle(title) : rawCategory
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
      source_type: 'online_haul',
      source_name: marketplace.charAt(0).toUpperCase() + marketplace.slice(1),
      status: productData.status === 'sold' ? 'sold' : 'listed',
      sold_price_gbp: productData.status === 'sold' ? price : null,
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
  const pmdStatus = productData.status === 'sold' ? 'sold' : 'listed'
  const { error: pmdError } = await supabase
    .from('product_marketplace_data')
    .insert({
      find_id: find.id,
      marketplace,
      platform_listing_id: String(marketplaceProductId),
      platform_listing_url: listingUrl,
      listing_price: price,
      status: pmdStatus,
    })

  if (pmdError) {
    console.error('[marketplace-item import] PMD insert error:', pmdError.message)
  }

  return ApiResponseHelper.success({ success: true, findId: find.id })
})
