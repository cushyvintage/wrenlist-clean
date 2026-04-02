import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

// Reverse map: Vinted catalog ID → Wrenlist category
const VINTED_TO_CATEGORY: Record<number, string> = {
  1960: 'ceramics', 1959: 'ceramics', 1958: 'ceramics', 3856: 'teapots', 3857: 'jugs',
  2005: 'glassware', 2006: 'glassware', 2009: 'glassware', 2010: 'glassware',
  2997: 'books',
  21: 'jewellery', 163: 'jewellery', 165: 'jewellery',
  4: 'clothing', 2050: 'clothing',
  1934: 'homeware', 1920: 'homeware',
  3823: 'collectibles', 167: 'medals',
  1499: 'toys',
  3154: 'furniture',
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
        const category = VINTED_TO_CATEGORY[item.catalog_id] || 'other'

        // Create find
        const { data: find, error: findError } = await supabase
          .from('finds')
          .insert({
            user_id: user.id,
            name: item.title,
            description: item.description || null,
            category,
            brand: item.brand_title || null,
            condition,
            asking_price_gbp: parseFloat(item.price?.amount || item.price_numeric || '0'),
            photos: item.photos?.map((p: any) => p.full_size_url || p.url).filter(Boolean) || [],
            status: 'listed',
            platform_fields: {
              selectedPlatforms: ['vinted'],
              vinted: {
                primaryColor: item.colour_ids?.[0] || null,
                catalogId: item.catalog_id,
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
