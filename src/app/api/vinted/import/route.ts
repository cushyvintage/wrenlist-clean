import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { lookupVintedCategory } from '@/lib/vinted-category-lookup'
import { findColourByVintedId } from '@/data/unified-colours'

// Map Vinted status string → Wrenlist condition
const CONDITION_MAP: Record<string, string> = {
  'New with tags': 'new_with_tags',
  'New without tags': 'new_without_tags',
  'Very good': 'very_good',
  'Good': 'good',
  'Satisfactory': 'fair',
  'Fair': 'fair',
  'Poor': 'poor',
}

/**
 * POST /api/vinted/import
 * Receives Vinted listing data from the extension and imports into Wrenlist.
 * Body: { items: VintedItem[], userId: number, username: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()
    const body = await request.json()
    const { items, username } = body

    if (!items?.length) {
      return ApiResponseHelper.badRequest('No items provided')
    }

    const startTime = Date.now()
    let imported = 0, skipped = 0, errors = 0
    const itemErrors: Array<{ listingId: string; title: string; error: string }> = []

    for (const item of items) {
      try {
        // Skip if already imported (check by platform_listing_id)
        const { data: existing } = await supabase
          .from('product_marketplace_data')
          .select('id')
          .eq('marketplace', 'vinted')
          .eq('platform_listing_id', String(item.id))
          .single()

        if (existing) { skipped++; continue }

        // Map condition
        const condition = CONDITION_MAP[item.status] || 'good'
        // catalog_id may be absent in wardrobe list response — uses comprehensive lookup
        const category = lookupVintedCategory(item.catalog_id)
        // Wardrobe endpoint uses `brand` field, catalog endpoint uses `brand_title`
        const brand = item.brand_title || item.brand || null
        // Generate SKU early — needed for photo filenames
        const catPrefix = category.slice(0, 3).toUpperCase()
        const sku = `VT-${catPrefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`
        // Photos: wardrobe returns full_size_url, catalog returns url
        // Store raw Vinted URLs now — photo mirroring to Supabase Storage
        // happens via separate backfill endpoint to avoid import timeout
        const photos: string[] = item.photos?.map((p: any) => p.full_size_url || p.url).filter(Boolean).slice(0, 5) || []
        // Create find
        const { data: find, error: findError } = await supabase
          .from('finds')
          .insert({
            user_id: user.id,
            name: item.title,
            description: item.description || null,
            category,
            brand: brand !== 'no brand' ? brand : null,
            condition,
            asking_price_gbp: parseFloat(item.price?.amount || String(item.price_numeric || 0)),
            sold_price_gbp: item.is_sold ? parseFloat(item.price?.amount || String(item.price_numeric || 0)) : null,
            sold_at: item.is_sold ? (item.updated_at_ts ? new Date(item.updated_at_ts * 1000).toISOString() : new Date().toISOString()) : null,
            photos,
            sku,
            status: item.is_sold ? 'sold' : 'listed',
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
                catalogId: item.catalog_id || null,
                material: item.material_id ? [item.material_id] : undefined,
              },
            },
            selected_marketplaces: ['vinted'],
          })
          .select('id')
          .single()

        if (findError || !find) {
          errors++
          const errMsg = findError?.message || 'Find creation returned null'
          itemErrors.push({ listingId: String(item.id), title: item.title || 'Untitled', error: errMsg })
          logMarketplaceEvent(supabase, user.id, { findId: '', marketplace: 'vinted', eventType: 'import_error', source: 'api', details: { listingId: String(item.id), error: errMsg } })
          continue
        }

        // Create marketplace data row
        await supabase.from('product_marketplace_data').insert({
          find_id: find.id,
          marketplace: 'vinted',
          platform_listing_id: String(item.id),
          platform_listing_url: `https://www.vinted.co.uk/items/${item.id}`,
          platform_category_id: String(item.catalog_id),
          listing_price: parseFloat(item.price?.amount || item.price_numeric || '0'),
          status: item.is_sold ? 'sold' : item.is_hidden ? 'hidden' : 'listed',
        })

        logMarketplaceEvent(supabase, user.id, { findId: find.id, marketplace: 'vinted', eventType: 'imported', source: 'api', details: { listingId: String(item.id) } })

        imported++
      } catch (err) {
        errors++
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        itemErrors.push({ listingId: String(item?.id || 'unknown'), title: item?.title || 'Untitled', error: errMsg })
        logMarketplaceEvent(supabase, user.id, { findId: '', marketplace: 'vinted', eventType: 'import_error', source: 'api', details: { listingId: String(item?.id), error: errMsg } })
      }
    }

    const durationMs = Date.now() - startTime
    return ApiResponseHelper.success({ imported, skipped, errors, total: items.length, durationMs, itemErrors: itemErrors.length > 0 ? itemErrors : undefined })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return ApiResponseHelper.internalError(message)
  }
}

/**
 * GET /api/vinted/import
 * Returns count of Vinted-linked finds for this user
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return ApiResponseHelper.unauthorized()

    const supabase = await createSupabaseServerClient()
    const { count } = await supabase
      .from('product_marketplace_data')
      .select('id', { count: 'exact' })
      .eq('marketplace', 'vinted')
      .eq('status', 'listed')

    return ApiResponseHelper.success({ vintedListings: count || 0 })
  } catch (error) {
    return ApiResponseHelper.internalError()
  }
}
