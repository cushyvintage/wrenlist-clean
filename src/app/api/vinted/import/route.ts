import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { lookupVintedCategory } from '@/lib/vinted-category-lookup'
import { getLeafCategoryByVintedIdFromDb } from '@/lib/category-db'
import { findColourByVintedId } from '@/data/unified-colours'
import { findPotentialDuplicates, type DedupMatch } from '@/lib/dedup-check.server'

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
export const POST = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()
  const body = await req.json()
  const { items } = body

  if (!items?.length) {
    return ApiResponseHelper.badRequest('No items provided')
  }

  const startTime = Date.now()
  let imported = 0, skipped = 0, errors = 0
  const itemErrors: Array<{ listingId: string; title: string; error: string }> = []
  const potentialDuplicates: Array<{ listingId: string; title: string; matches: DedupMatch[] }> = []

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
      // catalog_id may be absent in wardrobe list response
      // Prefer leaf category from reverse map, fall back to top-level lookup
      const catalogIdStr = item.catalog_id ? String(item.catalog_id) : undefined
      const leafFromDb = catalogIdStr ? await getLeafCategoryByVintedIdFromDb(catalogIdStr) : undefined
      const category = leafFromDb || await lookupVintedCategory(item.catalog_id)
      // Wardrobe endpoint uses `brand` field, catalog endpoint uses `brand_title`
      const brand = item.brand_title || item.brand || null
      // Generate SKU early — needed for photo filenames
      const catPrefix = category.slice(0, 3).toUpperCase()
      const sku = `VT-${catPrefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`
      // Photos: wardrobe returns full_size_url, catalog returns url
      // Store raw Vinted URLs now — photo mirroring to Supabase Storage
      // happens via separate backfill endpoint to avoid import timeout
      const photos: string[] = item.photos?.map((p: { full_size_url?: string; url?: string }) => p.full_size_url || p.url).filter(Boolean).slice(0, 5) || []
      // Advisory dedup check — warns but does NOT block import.
      // Matches are returned in the response for the caller to surface in UI.
      // Actual merging happens via /duplicates review page.
      if (item.title) {
        const dupeMatches = await findPotentialDuplicates(supabase, user.id, item.title)
        if (dupeMatches.length > 0) {
          potentialDuplicates.push({ listingId: String(item.id), title: item.title, matches: dupeMatches })
        }
      }

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
        await logMarketplaceEvent(supabase, user.id, { findId: '', marketplace: 'vinted', eventType: 'import_error', source: 'api', details: { listingId: String(item.id), error: errMsg } })
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

      await logMarketplaceEvent(supabase, user.id, { findId: find.id, marketplace: 'vinted', eventType: 'imported', source: 'api', details: { listingId: String(item.id) } })

      imported++
    } catch (err) {
      errors++
      const errMsg = err instanceof Error ? err.message : 'Unknown error'
      itemErrors.push({ listingId: String(item?.id || 'unknown'), title: item?.title || 'Untitled', error: errMsg })
      await logMarketplaceEvent(supabase, user.id, { findId: '', marketplace: 'vinted', eventType: 'import_error', source: 'api', details: { listingId: String(item?.id), error: errMsg } })
    }
  }

  const durationMs = Date.now() - startTime
  return ApiResponseHelper.success({
    imported, skipped, errors, total: items.length, durationMs,
    itemErrors: itemErrors.length > 0 ? itemErrors : undefined,
    potentialDuplicates: potentialDuplicates.length > 0 ? potentialDuplicates : undefined,
  })
})

/**
 * GET /api/vinted/import
 * Returns count of Vinted-linked finds for this user
 */
export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase
    .from('product_marketplace_data')
    .select('id', { count: 'exact' })
    .eq('marketplace', 'vinted')
    .eq('status', 'listed')

  return ApiResponseHelper.success({ vintedListings: count || 0 })
})
