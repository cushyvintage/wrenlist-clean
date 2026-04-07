/**
 * eBay UK category mappings for Wrenlist
 * Generated from CATEGORY_TREE — uses verified LEAF category IDs
 *
 * Maps both:
 * - Top-level canonical keys (e.g. "ceramics") → first leaf eBay ID
 * - Leaf values (e.g. "ceramics_plates") → specific eBay leaf ID
 */

import { CATEGORY_TREE, LEGACY_CATEGORY_MAP, getPlatformCategoryId } from '@/data/marketplace-category-map'

export const EBAY_CATEGORY_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {}

  for (const [topKey, subcats] of Object.entries(CATEGORY_TREE)) {
    let firstId: string | null = null
    for (const node of Object.values(subcats)) {
      const ebayId = node.platforms.ebay?.id ?? '99'
      map[node.value] = ebayId
      if (!firstId) {
        firstId = ebayId
        map[topKey] = ebayId
      }
    }
  }

  // Legacy aliases — resolve old values through LEGACY_CATEGORY_MAP
  for (const [oldVal, newVal] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (!map[oldVal]) {
      map[oldVal] = map[newVal] ?? '99'
    }
  }

  // Short aliases
  map['default'] = '99'

  return map
})()

/** Look up eBay leaf category ID for a find.category value */
export function getEbayCategoryId(category: string): string {
  // Try direct lookup, then legacy resolution, then platform ID from tree
  const resolved = LEGACY_CATEGORY_MAP[category] ?? category
  return EBAY_CATEGORY_MAP[resolved] ?? EBAY_CATEGORY_MAP[category] ?? getPlatformCategoryId(resolved, 'ebay') ?? '99'
}
