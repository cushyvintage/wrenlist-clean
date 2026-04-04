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

    let imported = 0, skipped = 0, errors = 0

    for (const item of listings) {
      try {
        // Skip already imported
        const { data: existing } = await supabase
          .from('product_marketplace_data')
          .select('id')
          .eq('marketplace', 'vinted')
          .eq('platform_listing_id', String(item.id))
          .single()

        if (existing) { skipped++; continue }

        const condition = CONDITION_MAP[item.status] || 'good'
        const category = item.catalog_id ? (VINTED_TO_CATEGORY[item.catalog_id] || 'other') : 'other'
        const brand = item.brand_title || item.brand || null
        const catPrefix = category.slice(0, 3).toUpperCase()
        const sku = `VT-${catPrefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`

        // Extract photo URLs (raw Vinted CDN — backfill will mirror to Storage later)
        const photos: string[] = (item.photos || [])
          .map((p: any) => p.full_size_url || p.url)
          .filter(Boolean)
          .slice(0, 5)

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
              vinted: { primaryColor: item.colour_ids?.[0] || null, catalogId: item.catalog_id || null },
            },
            selected_marketplaces: ['vinted'],
          })
          .select('id')
          .single()

        if (findError || !find) { errors++; continue }

        await supabase.from('product_marketplace_data').insert({
          find_id: find.id,
          marketplace: 'vinted',
          platform_listing_id: String(item.id),
          platform_listing_url: `https://www.vinted.co.uk/items/${item.id}`,
          platform_category_id: String(item.catalog_id || ''),
          listing_price: parseFloat(item.price?.amount || item.price_numeric || '0'),
          status: 'listed',
        })

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
