import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { lookupVintedCategory } from '@/lib/vinted-category-lookup'

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

    let imported = 0, skipped = 0, errors = 0

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
            photos,
            sku,
            status: 'listed',
            platform_fields: {
              selectedPlatforms: ['vinted'],
              vinted: {
                primaryColor: item.colour_ids?.[0] || null,
                catalogId: item.catalog_id || null,
              }
            },
            selected_marketplaces: ['vinted'],
          })
          .select('id')
          .single()

        if (findError || !find) { errors++; continue }

        // Create marketplace data row
        await supabase.from('product_marketplace_data').insert({
          find_id: find.id,
          marketplace: 'vinted',
          platform_listing_id: String(item.id),
          platform_listing_url: `https://www.vinted.co.uk/items/${item.id}`,
          platform_category_id: String(item.catalog_id),
          listing_price: parseFloat(item.price?.amount || item.price_numeric || '0'),
          status: 'listed',
        })

        logMarketplaceEvent(supabase, user.id, { findId: find.id, marketplace: 'vinted', eventType: 'imported', source: 'api' })

        imported++
      } catch { errors++ }
    }

    return ApiResponseHelper.success({ imported, skipped, errors, total: items.length })
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
