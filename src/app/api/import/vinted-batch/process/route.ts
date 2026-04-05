import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { lookupVintedCategory } from '@/lib/vinted-category-lookup'

// Vinted condition map
const CONDITION_MAP: Record<string, string> = {
  'New with tags': 'excellent', 'New without tags': 'excellent',
  'Very good': 'excellent', 'Good': 'good',
  'Satisfactory': 'fair', 'Fair': 'fair', 'Poor': 'poor',
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

    let imported = 0, skipped = 0, errors = 0

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

        // Map Vinted status → Wrenlist find status
        const vintedStatus = (item.status as string || '').toLowerCase()
        const findStatus = vintedStatus === 'sold' ? 'sold'
          : vintedStatus === 'hidden' ? 'draft'
          : 'listed'

        // Category: prefer catalog_id mapping, fall back to text category
        let category = lookupVintedCategory(item.catalog_id ?? item.vintedMetadata?.catalog_id)

        // If still "other", try text-based fallback from item.category
        if (category === 'other' && item.category) {
          const cat = String(item.category).toLowerCase()
          if (cat.includes('ceram') || cat.includes('potter') || cat.includes('china') || cat.includes('porcelain') || cat.includes('vase') || cat.includes('plate') || cat.includes('bowl')) category = 'ceramics'
          else if (cat.includes('glass')) category = 'glassware'
          else if (cat.includes('book') || cat.includes('fiction') || cat.includes('novel') || cat.includes('magazine') || cat.includes('literature')) category = 'books'
          else if (cat.includes('jewel') || cat.includes('ring') || cat.includes('necklace') || cat.includes('bracelet') || cat.includes('earring')) category = 'jewellery'
          else if (cat.includes('cloth') || cat.includes('dress') || cat.includes('shirt') || cat.includes('trouser') || cat.includes('jean') || cat.includes('coat') || cat.includes('jacket') || cat.includes('top') || cat.includes('skirt')) category = 'clothing'
          else if (cat.includes('furniture') || cat.includes('chair') || cat.includes('table') || cat.includes('shelf') || cat.includes('cabinet') || cat.includes('sofa')) category = 'furniture'
          else if (cat.includes('toy') || cat.includes('game') || cat.includes('puzzle') || cat.includes('children')) category = 'toys'
          else if (cat.includes('medal') || cat.includes('militaria') || cat.includes('badge') || cat.includes('military')) category = 'medals'
          else if (cat.includes('collect') || cat.includes('antique') || cat.includes('vintage') || cat.includes('curio')) category = 'collectibles'
          else if (cat.includes('home') || cat.includes('decor') || cat.includes('kitchen') || cat.includes('linen') || cat.includes('textile') || cat.includes('garden') || cat.includes('cushion') || cat.includes('lamp')) category = 'homeware'
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
            platform_fields: {
              selectedPlatforms: ['vinted'],
              vinted: {
                primaryColor: item.colour_ids?.[0] || null,
                catalogId: item.catalog_id || item.vintedMetadata?.catalog_id || null,
                vintedMetadata: item.vintedMetadata || null,
                originalListingId: String(item.id),
              },
            },
            selected_marketplaces: ['vinted'],
          })
          .select('id')
          .single()

        if (findError || !find) { errors++; continue }

        await supabase.from('product_marketplace_data').insert({
          find_id: find.id,
          marketplace: 'vinted',
          platform_listing_id: listingId,
          platform_listing_url: `https://www.vinted.co.uk/items/${listingId}`,
          platform_category_id: String(item.catalog_id || item.vintedMetadata?.catalog_id || ''),
          listing_price: askingPrice,
          status: findStatus,
        })

        // Mirror photos to Supabase Storage (non-blocking — never fails the item)
        if (photos.length > 0) {
          void (async () => {
            try {
              const storedUrls: string[] = []
              for (let i = 0; i < photos.length; i++) {
                const photoUrl = photos[i]
                if (!photoUrl) { continue }
                try {
                  const imgRes = await fetch(photoUrl)
                  if (!imgRes.ok) { storedUrls.push(photoUrl); continue }
                  const buffer = await imgRes.arrayBuffer()
                  const ext = photoUrl.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg'
                  const storagePath = `find-photos/${user.id}/${sku}-${i}.${ext}`
                  const { error: uploadErr } = await supabase.storage
                    .from('find-photos')
                    .upload(storagePath, buffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true })
                  if (uploadErr) { storedUrls.push(photoUrl); continue }
                  const { data: { publicUrl } } = supabase.storage.from('find-photos').getPublicUrl(storagePath)
                  storedUrls.push(publicUrl)
                } catch {
                  storedUrls.push(photoUrl)
                }
              }
              if (storedUrls.length > 0) {
                await supabase.from('finds').update({ photos: storedUrls }).eq('id', find.id)
              }
            } catch {
              // Photo mirror failed silently
            }
          })()
        }

        imported++
      } catch {
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${imported} of ${listings.length} listings.`,
      results: { success: imported, skipped, errors, total: listings.length },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
