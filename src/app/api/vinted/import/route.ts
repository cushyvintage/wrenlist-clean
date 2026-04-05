import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

// Reverse map: Vinted catalog ID → Wrenlist category
const VINTED_TO_CATEGORY: Record<number, string> = {
  // Ceramics / Pottery / China
  1940: 'ceramics', 1941: 'ceramics', 1942: 'ceramics', 1943: 'ceramics',
  1958: 'ceramics', 1959: 'ceramics', 1960: 'ceramics',
  1944: 'ceramics', 1945: 'ceramics', 1946: 'ceramics',
  3856: 'teapots', 3857: 'jugs',

  // Glassware
  2005: 'glassware', 2006: 'glassware', 2007: 'glassware', 2008: 'glassware',
  2009: 'glassware', 2010: 'glassware', 2011: 'glassware',

  // Books
  2317: 'books', 2318: 'books', 2319: 'books', 2320: 'books',
  2321: 'books', 2322: 'books', 2323: 'books', 2997: 'books',
  2998: 'books', 2999: 'books', 3000: 'books',

  // Jewellery
  21: 'jewellery', 163: 'jewellery', 164: 'jewellery', 165: 'jewellery',
  166: 'jewellery', 2038: 'jewellery', 2039: 'jewellery', 2040: 'jewellery',

  // Clothing
  4: 'clothing', 5: 'clothing', 6: 'clothing', 7: 'clothing',
  2050: 'clothing', 2051: 'clothing', 2052: 'clothing',

  // Homeware / Home decor
  1920: 'homeware', 1921: 'homeware', 1922: 'homeware', 1923: 'homeware',
  1924: 'homeware', 1925: 'homeware', 1926: 'homeware', 1927: 'homeware',
  1928: 'homeware', 1929: 'homeware', 1930: 'homeware', 1931: 'homeware',
  1932: 'homeware', 1933: 'homeware', 1934: 'homeware', 1935: 'homeware',
  1936: 'homeware', 1937: 'homeware', 1938: 'homeware', 1939: 'homeware',

  // Collectibles / Antiques
  3823: 'collectibles', 3824: 'collectibles', 3825: 'collectibles',
  3826: 'collectibles', 3827: 'collectibles',

  // Medals / Militaria
  167: 'medals', 168: 'medals',

  // Toys
  1499: 'toys', 1500: 'toys', 1501: 'toys',

  // Furniture
  3154: 'furniture', 3155: 'furniture', 3156: 'furniture',
}

// Map Vinted status string → Wrenlist condition
const CONDITION_MAP: Record<string, string> = {
  'New with tags': 'excellent',
  'New without tags': 'excellent',
  'Very good': 'excellent',
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
        // catalog_id may be absent in wardrobe list response — default to 'other'
        const category = item.catalog_id ? (VINTED_TO_CATEGORY[item.catalog_id] || 'other') : 'other'
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
