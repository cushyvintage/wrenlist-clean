import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

// Vinted condition map
const CONDITION_MAP: Record<string, string> = {
  'New with tags': 'excellent', 'New without tags': 'excellent',
  'Very good': 'excellent', 'Good': 'good',
  'Satisfactory': 'fair', 'Fair': 'fair', 'Poor': 'poor',
}

const VINTED_TO_CATEGORY: Record<number, string> = {
  1960: 'ceramics', 1959: 'ceramics', 1958: 'ceramics', 3856: 'teapots', 3857: 'jugs',
  2005: 'glassware', 2006: 'glassware', 2009: 'glassware', 2010: 'glassware',
  2997: 'books', 21: 'jewellery', 163: 'jewellery', 165: 'jewellery',
  4: 'clothing', 2050: 'clothing', 1934: 'homeware', 1920: 'homeware',
  3823: 'collectibles', 167: 'medals', 1499: 'toys', 3154: 'furniture',
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

    // DEBUG: return first item shape
    const first = listings[0]
    return NextResponse.json({
      debug: true,
      firstItem: {
        id: first.id,
        title: first.title,
        price: first.price,
        priceType: typeof first.price,
        photosCount: first.photos?.length,
        firstPhoto: first.photos?.[0],
        firstPhotoType: typeof first.photos?.[0],
        catalog_id: first.catalog_id,
        category: first.category,
        status: first.status,
        keys: Object.keys(first),
      }
    })
    let imported = 0, skipped = 0, errors = 0

    for (const item of listings) {
      try {
        // Skip already imported (scoped to this user)
        const { data: existingPmd } = await supabase
          .from('product_marketplace_data')
          .select('find_id')
          .eq('marketplace', 'vinted')
          .eq('platform_listing_id', String(item.id))
          .maybeSingle()

        if (existingPmd?.find_id) {
          // Verify the find belongs to this user
          const { data: existingFind } = await supabase
            .from('finds')
            .select('id')
            .eq('id', existingPmd.find_id)
            .eq('user_id', user.id)
            .maybeSingle()
          if (existingFind) { skipped++; continue }
        }

        const condition = CONDITION_MAP[item.status] || 'good'
        const category = item.catalog_id ? (VINTED_TO_CATEGORY[item.catalog_id] || 'other') : 'other'
        const brand = item.brand_title || item.brand || null
        const catPrefix = category.slice(0, 3).toUpperCase()
        const sku = `VT-${catPrefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`

        // Extract photo URLs (raw Vinted CDN — will mirror to Storage after insert)
        const photos: string[] = (item.photos || [])
          .map((p: any) => typeof p === 'string' ? p : (p.full_size_url || p.url || ''))
          .filter(Boolean)
          .slice(0, 5)

        const askingPrice = typeof item.price === 'number'
          ? item.price
          : parseFloat(item.price?.amount || String(item.price_numeric || 0))

        const { data: find, error: findError } = await supabase
          .from('finds')
          .insert({
            user_id: user.id,
            name: item.title,
            description: item.description || null,
            category,
            brand: brand !== 'no brand' ? brand : null,
            condition,
            asking_price_gbp: askingPrice,
            photos,
            sku,
            status: 'listed',
            platform_fields: {
              selectedPlatforms: ['vinted'],
              vinted: { primaryColor: item.colour_ids?.[0] || null, catalogId: item.catalog_id || null },
            },
            selected_marketplaces: ['vinted'],
          })
          .select('id')
          .single()

        if (findError || !find) { errors++; continue }

        const listingPrice = typeof item.price === 'number'
          ? item.price
          : parseFloat(item.price?.amount || String(item.price_numeric || 0))

        await supabase.from('product_marketplace_data').insert({
          find_id: find.id,
          marketplace: 'vinted',
          platform_listing_id: String(item.id),
          platform_listing_url: `https://www.vinted.co.uk/items/${item.id}`,
          platform_category_id: String(item.catalog_id || ''),
          listing_price: listingPrice,
          status: 'listed',
        })

        // Mirror photos to Supabase Storage (non-blocking)
        if (photos && photos.length > 0) {
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
                const path = `find-photos/${user.id}/${sku}-${i}.${ext}`

                const { error: uploadErr } = await supabase.storage
                  .from('find-photos')
                  .upload(path, buffer, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true })

                if (uploadErr) { storedUrls.push(photoUrl); continue }

                const { data: { publicUrl } } = supabase.storage
                  .from('find-photos')
                  .getPublicUrl(path)

                storedUrls.push(publicUrl)
              } catch {
                storedUrls.push(photoUrl)
              }
            }

            if (storedUrls.length > 0) {
              await supabase.from('finds').update({ photos: storedUrls }).eq('id', find.id)
            }
          } catch {
            // Photo mirror failed — leave raw URLs in place
          }
        }

        imported++
      } catch { errors++ }
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
