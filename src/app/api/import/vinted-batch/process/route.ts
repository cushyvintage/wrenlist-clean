import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { ApiResponseHelper } from '@/lib/api-response'
import { lookupVintedCategory } from '@/lib/vinted-category-lookup'
import { getLeafCategoryByVintedIdFromDb } from '@/lib/category-db'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { findColourByVintedId } from '@/data/unified-colours'

// Vinted condition map
const CONDITION_MAP: Record<string, string> = {
  'New with tags': 'new_with_tags', 'New without tags': 'new_without_tags',
  'Very good': 'very_good', 'Good': 'good',
  'Satisfactory': 'fair', 'Fair': 'fair', 'Poor': 'poor',
}

/**
 * Mirror a photo from Vinted CDN to Supabase Storage
 */
async function mirrorPhotoToStorage(
  photoUrl: string,
  index: number,
  userId: string,
  sku: string
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
    else if (contentType.includes('heic')) extension = 'heic'

    const filename = `${userId}/${sku}-${index}.${extension}`

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
 * Mirror all Vinted photos to Supabase Storage and return Supabase URLs
 * If all photos fail to mirror, return original Vinted CDN URLs as fallback
 */
async function mirrorPhotosToStorage(
  userId: string,
  sku: string,
  photoUrls: string[]
): Promise<string[]> {
  if (!photoUrls.length) return []

  const mirrorResults = await Promise.all(
    photoUrls.map((url, index) => mirrorPhotoToStorage(url, index, userId, sku))
  )

  const mirrored = mirrorResults.filter((url): url is string => Boolean(url))

  // If any photos succeeded, use those; otherwise fall back to original URLs
  return mirrored.length > 0 ? mirrored : photoUrls
}

/**
 * POST /api/import/vinted-batch/process
 * Called by the Wrenlist Chrome extension with Vinted listing data.
 * Accepts { listings: VintedListing[] } and imports into finds table.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const listings: any[] = body.listings || body.items || []

    if (!listings.length) return ApiResponseHelper.badRequest('No listings provided')

    const startTime = Date.now()
    let imported = 0, skipped = 0, errors = 0
    const itemErrors: Array<{ listingId: string; title: string; error: string }> = []

    for (const item of listings) {
      try {
        const listingId = String(item.id)

        // Skip already imported — check if this Vinted listing ID exists for this user
        const { data: existingPmd } = await supabase
          .from('product_marketplace_data')
          .select('find_id')
          .eq('marketplace', 'vinted')
          .eq('platform_listing_id', listingId)
          .maybeSingle()

        if (existingPmd) {
          const { data: existingFind } = await supabase
            .from('finds')
            .select('id')
            .eq('id', existingPmd.find_id)
            .eq('user_id', user.id)
            .maybeSingle()
          if (existingFind) { skipped++; continue }
        }

        // Map fields — extension sends BatchListingPayload shape:
        // price: number, photos: string[], category: string (text), catalog_id: may be absent
        const condition = CONDITION_MAP[item.status as string] || 'good'

        // Map Vinted status → Wrenlist find/PMD status
        // Use vintedMetadata flags (from getListing detail) if available, fall back to status string
        const isSold = item.vintedMetadata?.is_sold || item.vintedMetadata?.is_closed || false
        const isHidden = item.vintedMetadata?.is_hidden || false
        const vintedStatus = (item.status as string || '').toLowerCase()
        const findStatus = (isSold || vintedStatus === 'sold') ? 'sold'
          : (isHidden || vintedStatus === 'hidden') ? 'listed' // find stays 'listed', PMD gets 'hidden'
          : 'listed'
        const pmdStatus = (isSold || vintedStatus === 'sold') ? 'sold'
          : (isHidden || vintedStatus === 'hidden') ? 'hidden'
          : 'listed'

        // Category: prefer leaf from reverse map, fall back to top-level lookup
        const rawCatalogId = item.catalog_id ?? item.vintedMetadata?.catalog_id
        const catalogIdStr = rawCatalogId ? String(rawCatalogId) : undefined
        const leafFromDb = catalogIdStr ? await getLeafCategoryByVintedIdFromDb(catalogIdStr) : undefined
        let category = leafFromDb || await lookupVintedCategory(rawCatalogId)

        // If still "other", try text-based fallback from item.category
        if (category === 'other' && item.category) {
          const cat = String(item.category).toLowerCase()
          if (cat.includes('ceram') || cat.includes('potter') || cat.includes('china') || cat.includes('porcelain') || cat.includes('vase') || cat.includes('plate') || cat.includes('bowl') || cat.includes('glass') || cat.includes('furniture') || cat.includes('chair') || cat.includes('table') || cat.includes('shelf') || cat.includes('cabinet') || cat.includes('sofa') || cat.includes('home') || cat.includes('decor') || cat.includes('kitchen') || cat.includes('linen') || cat.includes('textile') || cat.includes('garden') || cat.includes('cushion') || cat.includes('lamp')) category = 'home_garden'
          else if (cat.includes('book') || cat.includes('fiction') || cat.includes('novel') || cat.includes('magazine') || cat.includes('literature')) category = 'books_media'
          else if (cat.includes('jewel') || cat.includes('ring') || cat.includes('necklace') || cat.includes('bracelet') || cat.includes('earring') || cat.includes('cloth') || cat.includes('dress') || cat.includes('shirt') || cat.includes('trouser') || cat.includes('jean') || cat.includes('coat') || cat.includes('jacket') || cat.includes('top') || cat.includes('skirt')) category = 'clothing'
          else if (cat.includes('toy') || cat.includes('game') || cat.includes('puzzle') || cat.includes('children')) category = 'toys_games'
          else if (cat.includes('medal') || cat.includes('militaria') || cat.includes('badge') || cat.includes('military') || cat.includes('collect') || cat.includes('antique') || cat.includes('vintage') || cat.includes('curio')) category = 'collectibles'
        }

        const brand = (item.brand_title || item.brand || null) as string | null
        const catPrefix = category.slice(0, 3).toUpperCase()
        const sku = `VT-${catPrefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`

        // Photos: extension sends string[] directly
        const photos: string[] = ((item.photos as any[]) || [])
          .map((p) => typeof p === 'string' ? p : (p?.full_size_url || p?.url || ''))
          .filter((p): p is string => Boolean(p))
          .slice(0, 5)

        // Price: extension sends as number
        const askingPrice = typeof item.price === 'number'
          ? item.price
          : parseFloat(String(item.price ?? 0))

        const { data: find, error: findError } = await supabase
          .from('finds')
          .insert({
            user_id: user.id,
            name: item.title || 'Untitled',
            description: item.description || null,
            category,
            brand: brand && brand !== 'no brand' ? brand : null,
            condition,
            asking_price_gbp: isNaN(askingPrice) ? null : askingPrice,
            photos,
            sku,
            status: findStatus,
            colour: findColourByVintedId(item.colour_ids?.[0])?.label || null,
            size: item.size_title || null,
            platform_fields: {
              selectedPlatforms: ['vinted'],
              shared: {
                colour: findColourByVintedId(item.colour_ids?.[0])?.label,
                secondaryColour: findColourByVintedId(item.colour_ids?.[1])?.label,
                size: item.size_title || undefined,
                vintedSizeId: item.size_id ? String(item.size_id) : undefined,
              },
              vinted: {
                primaryColor: item.colour_ids?.[0] || null,
                secondaryColor: item.colour_ids?.[1] || null,
                catalogId: item.catalog_id || item.vintedMetadata?.catalog_id || null,
                material: item.material_id ? [item.material_id] : undefined,
                vintedMetadata: item.vintedMetadata || null,
                originalListingId: String(item.id),
              },
            },
            selected_marketplaces: ['vinted'],
          })
          .select('id')
          .single()

        if (findError || !find) {
          errors++
          const errMsg = findError?.message || 'Find creation returned null'
          itemErrors.push({ listingId, title: item.title || 'Untitled', error: errMsg })
          logMarketplaceEvent(supabase, user.id, { findId: '', marketplace: 'vinted', eventType: 'import_error', source: 'api', details: { listingId, title: item.title, error: errMsg } })
          continue
        }

        // Mirror photos to Supabase Storage (sync, not fire-and-forget)
        const mirroredPhotos = await mirrorPhotosToStorage(user.id, sku, photos)
        if (mirroredPhotos.length > 0 && mirroredPhotos !== photos) {
          const { error: updateError } = await supabase
            .from('finds')
            .update({ photos: mirroredPhotos })
            .eq('id', find.id)
          // Non-fatal: if mirroring fails, proceed with original photos
          if (updateError) {
            console.warn(`[Vinted Import] Photo mirroring failed for find ${find.id}: ${updateError.message}`)
          }
        }

        // Derive platform_listed_at from Vinted's created_at_ts (unix seconds)
        const vintedCreatedTs = item.created_at_ts || item.vintedMetadata?.created_at_ts
        const platformListedAt = vintedCreatedTs
          ? new Date(vintedCreatedTs * 1000).toISOString()
          : null

        await supabase.from('product_marketplace_data').insert({
          find_id: find.id,
          marketplace: 'vinted',
          platform_listing_id: listingId,
          platform_listing_url: `https://www.vinted.co.uk/items/${listingId}`,
          platform_category_id: String(item.catalog_id || item.vintedMetadata?.catalog_id || ''),
          listing_price: askingPrice,
          status: pmdStatus,
          platform_listed_at: platformListedAt,
        })

        logMarketplaceEvent(supabase, user.id, {
          findId: find.id, marketplace: 'vinted', eventType: 'imported', source: 'api',
          details: { listingId, sku, pmdStatus, photoCount: photos.length, mirroredPhotoCount: mirroredPhotos.length },
        })
        imported++
      } catch (err) {
        errors++
        const listingId = String(item?.id || 'unknown')
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        itemErrors.push({ listingId, title: item?.title || 'Untitled', error: errMsg })
        logMarketplaceEvent(supabase, user.id, { findId: '', marketplace: 'vinted', eventType: 'import_error', source: 'api', details: { listingId, error: errMsg } })
      }
    }

    const durationMs = Date.now() - startTime
    return NextResponse.json({
      success: true,
      message: `Imported ${imported} of ${listings.length} listings in ${(durationMs / 1000).toFixed(1)}s.`,
      results: { success: imported, skipped, errors, total: listings.length, durationMs, itemErrors: itemErrors.length > 0 ? itemErrors : undefined },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
