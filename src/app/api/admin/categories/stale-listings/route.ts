import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { getAdminClient } from '@/lib/supabase-admin'

interface StaleListing {
  pmdId: string
  findId: string
  title: string
  category: string
  platform: string
  oldCategoryId: string
  newCategoryId: string | null
  listingUrl: string | null
}

/**
 * GET /api/admin/categories/stale-listings
 *
 * Finds listed PMD rows whose platform_category_id doesn't match the current
 * mapping in the categories table. These items were published with old/wrong
 * category IDs and may need re-publishing.
 *
 * Optional query params:
 *   ?platform=ebay   — filter to a single platform
 */
export const GET = withAdminAuth(async (req) => {
  const params = req.nextUrl.searchParams
  const platformFilter = params.get('platform')

  const supabase = getAdminClient()

  // 1. Fetch all listed PMD rows that have a platform_category_id
  let pmdQuery = supabase
    .from('product_marketplace_data')
    .select('id, find_id, marketplace, platform_category_id, platform_listing_url')
    .eq('status', 'listed')
    .not('platform_category_id', 'is', null)

  if (platformFilter) {
    pmdQuery = pmdQuery.eq('marketplace', platformFilter)
  }

  const { data: pmdRows, error: pmdErr } = await pmdQuery.limit(2000)
  if (pmdErr) {
    return NextResponse.json({ error: pmdErr.message }, { status: 500 })
  }
  if (!pmdRows?.length) {
    return NextResponse.json({ staleListings: [], count: 0, hasMore: false })
  }

  // 2. Collect unique find IDs and fetch finds (title + category)
  const findIds = [...new Set(pmdRows.map((r) => r.find_id))]
  const { data: finds, error: findErr } = await supabase
    .from('finds')
    .select('id, title, category')
    .in('id', findIds)

  if (findErr) {
    return NextResponse.json({ error: findErr.message }, { status: 500 })
  }

  const findMap = new Map(
    (finds ?? []).map((f) => [f.id, { title: f.title as string, category: f.category as string | null }])
  )

  // 3. Collect unique category values and fetch current platform mappings
  const categoryValues = [...new Set(
    (finds ?? []).map((f) => f.category).filter(Boolean) as string[]
  )]

  if (!categoryValues.length) {
    return NextResponse.json({ staleListings: [], count: 0 })
  }

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('value, platforms')
    .in('value', categoryValues)

  if (catErr) {
    return NextResponse.json({ error: catErr.message }, { status: 500 })
  }

  // Build lookup: category value -> { platform -> id }
  const catPlatformMap = new Map<string, Record<string, string | null>>()
  for (const cat of categories ?? []) {
    const platforms = (cat.platforms ?? {}) as Record<string, { id?: string }>
    const mapped: Record<string, string | null> = {}
    for (const [p, v] of Object.entries(platforms)) {
      mapped[p] = v?.id ?? null
    }
    catPlatformMap.set(cat.value, mapped)
  }

  // 4. Compare each PMD row's platform_category_id against current mapping
  const staleListings: StaleListing[] = []

  for (const pmd of pmdRows) {
    const find = findMap.get(pmd.find_id)
    if (!find?.category) continue

    const currentMappings = catPlatformMap.get(find.category)
    if (!currentMappings) continue // category not in DB (orphan)

    const currentId = currentMappings[pmd.marketplace] ?? null
    const oldId = pmd.platform_category_id as string

    // Mismatch: old ID differs from current mapping (or current is null meaning unmapped)
    if (oldId !== currentId) {
      staleListings.push({
        pmdId: pmd.id,
        findId: pmd.find_id,
        title: find.title,
        category: find.category,
        platform: pmd.marketplace,
        oldCategoryId: oldId,
        newCategoryId: currentId,
        listingUrl: pmd.platform_listing_url,
      })
    }
  }

  // Sort by platform then title for readability
  staleListings.sort((a, b) => {
    if (a.platform !== b.platform) return a.platform.localeCompare(b.platform)
    return a.title.localeCompare(b.title)
  })

  return NextResponse.json({
    staleListings,
    count: staleListings.length,
    totalListed: pmdRows.length,
    hasMore: pmdRows.length >= 2000,
  })
})
