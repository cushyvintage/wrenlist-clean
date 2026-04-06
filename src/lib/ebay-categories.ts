/**
 * eBay UK category mappings for Wrenlist
 * Generated from CATEGORY_TREE — uses verified LEAF category IDs
 *
 * Maps both:
 * - Top-level canonical keys (e.g. "ceramics") → first leaf eBay ID
 * - Leaf values (e.g. "ceramics_plates") → specific eBay leaf ID
 */

import { CATEGORY_TREE, getPlatformCategoryId } from '@/data/marketplace-category-map'

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

  // Legacy aliases
  map['teapots'] = map['ceramics_teapots'] ?? '262381'
  map['jugs'] = map['ceramics_jugs'] ?? '262376'
  map['medals'] = map['collectibles_militaria'] ?? '13956'
  map['home'] = map['homeware_other'] ?? '10034'
  map['jewelry'] = map['jewellery_other'] ?? '262023'
  map['default'] = '99'

  return map
})()

/** Look up eBay leaf category ID for a find.category value */
export function getEbayCategoryId(category: string): string {
  return EBAY_CATEGORY_MAP[category] ?? getPlatformCategoryId(category, 'ebay') ?? '99'
}
