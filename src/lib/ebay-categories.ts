/**
 * eBay UK category mappings for Wrenlist
 * Database-backed with lazy caching.
 *
 * Maps both:
 * - Top-level canonical keys (e.g. "ceramics") → first leaf eBay ID
 * - Leaf values (e.g. "ceramics_plates") → specific eBay leaf ID
 * - Legacy aliases resolved through DB legacy_values
 */

import { getAllCategories, getLegacyCategoryMap, getPlatformCategoryIdFromDb } from '@/lib/category-db'

let _cachedMap: Record<string, string> | null = null

async function getEbayMap(): Promise<Record<string, string>> {
  if (_cachedMap) return _cachedMap

  const all = await getAllCategories()
  const legacyMap = await getLegacyCategoryMap()

  const map: Record<string, string> = {}

  // Group by top_level to find first leaf per top-level
  const topFirstId: Record<string, string> = {}

  for (const row of all) {
    const ebayId = row.platforms?.ebay?.id ?? '99'
    map[row.value] = ebayId
    if (!topFirstId[row.top_level]) {
      topFirstId[row.top_level] = ebayId
      map[row.top_level] = ebayId
    }
  }

  // Legacy aliases
  for (const [oldVal, newVal] of Object.entries(legacyMap)) {
    if (!map[oldVal]) {
      map[oldVal] = map[newVal] ?? '99'
    }
  }

  map['default'] = '99'

  _cachedMap = map
  return map
}

/** Look up eBay leaf category ID for a find.category value */
export async function getEbayCategoryId(category: string): Promise<string> {
  const ebayMap = await getEbayMap()

  // Try direct lookup
  if (ebayMap[category]) return ebayMap[category]!

  // Try platform ID from DB (handles legacy resolution internally)
  const fromDb = await getPlatformCategoryIdFromDb(category, 'ebay')
  if (fromDb) return fromDb

  return '99'
}

/**
 * Get the full eBay category map (for callers that need bulk access).
 * Prefer getEbayCategoryId() for single lookups.
 */
export async function getEbayCategoryMap(): Promise<Record<string, string>> {
  return getEbayMap()
}
