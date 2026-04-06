/**
 * Vinted catalog ID → Wrenlist category lookup
 * Generated from CATEGORY_TREE + range-based fallbacks
 */

import { CATEGORY_TREE, getTopLevelCategory } from '@/data/marketplace-category-map'

/**
 * Build reverse lookup: Vinted numeric ID → Wrenlist top-level category
 * Generated once from CATEGORY_TREE at module load time
 */
const VINTED_ID_TO_WRENLIST: Record<number, string> = (() => {
  const map: Record<number, string> = {}

  for (const [topKey, subcats] of Object.entries(CATEGORY_TREE)) {
    for (const node of Object.values(subcats)) {
      const vintedId = node.platforms.vinted?.id
      if (vintedId) {
        const numId = parseInt(vintedId, 10)
        if (!isNaN(numId) && !map[numId]) {
          map[numId] = topKey
        }
      }
    }
  }

  // Additional known IDs not in leaf nodes (parent/sibling ranges)
  const extras: Record<number, string> = {
    // Ceramics / Tableware zone
    1920: 'ceramics', 1921: 'ceramics', 1922: 'ceramics', 1923: 'ceramics',
    1924: 'homeware', // Bedding
    1925: 'ceramics', 1926: 'ceramics', 1927: 'ceramics', 1928: 'ceramics',
    1929: 'ceramics', 1930: 'ceramics', 1931: 'ceramics', 1933: 'ceramics',
    1958: 'ceramics', 1959: 'ceramics', 1960: 'ceramics',
    1941: 'ceramics', 1942: 'ceramics', 1943: 'ceramics',
    1944: 'ceramics', 1945: 'ceramics', 1946: 'ceramics',

    // Homeware zone
    1934: 'homeware', 1935: 'homeware', 1939: 'homeware',
    1957: 'homeware', // Candle holders

    // Ceramics serveware
    3865: 'ceramics',

    // Glassware
    2007: 'glassware', 2008: 'glassware', 2011: 'glassware',

    // Books
    2317: 'books', 2318: 'books', 2319: 'books', 2320: 'books',
    2321: 'books', 2322: 'books', 2323: 'books', 2324: 'books',
    2325: 'books', 2326: 'books', 2327: 'books', 2328: 'books',
    2329: 'books', 2330: 'books',
    2994: 'books', 2998: 'books', 2999: 'books', 3000: 'books',
    3001: 'books', 3003: 'books', 3004: 'books', 3005: 'books',
    5426: 'books',

    // Jewellery
    21: 'jewellery', 166: 'jewellery', 168: 'jewellery', 169: 'jewellery',
    170: 'jewellery',
    2038: 'jewellery', 2039: 'jewellery', 2040: 'jewellery',
    241: 'jewellery', 242: 'jewellery', 243: 'jewellery', 2966: 'jewellery',

    // Clothing (Women)
    4: 'clothing', 5: 'clothing', 6: 'clothing', 7: 'clothing',
    222: 'clothing', 536: 'clothing', 77: 'clothing',
    // Clothing (Men)
    2050: 'clothing', 2052: 'clothing',

    // Shoes
    1049: 'clothing', 1233: 'clothing', 2632: 'clothing', 1242: 'clothing',
    543: 'clothing',

    // Collectibles
    3824: 'collectibles', 3825: 'collectibles', 3826: 'collectibles',
    3827: 'collectibles',

    // Toys
    1500: 'toys', 1501: 'toys', 1502: 'toys', 1503: 'toys',
    1504: 'toys', 1505: 'toys', 1506: 'toys', 1507: 'toys',
    1508: 'toys', 1509: 'toys', 1510: 'toys',

    // Furniture
    3155: 'furniture', 3156: 'furniture', 3157: 'furniture',
    3159: 'furniture', 3161: 'furniture', 3162: 'furniture',
    3163: 'furniture', 3164: 'furniture', 3165: 'furniture',

    // Beauty
    956: 'health_beauty', 960: 'health_beauty',

    // Entertainment
    2312: 'books', // Books parent in Entertainment
  }

  for (const [id, cat] of Object.entries(extras)) {
    const numId = parseInt(id, 10)
    if (!map[numId]) map[numId] = cat
  }

  return map
})()

/**
 * Range-based fallbacks for unmapped catalog IDs
 */
function getCategoryByRange(id: number): string {
  // Ranges ordered most-specific first to avoid overlaps
  // Homeware (1934-1939) — checked before ceramics to avoid overlap
  if (id >= 1934 && id <= 1939) return 'homeware'
  // Ceramics / Tableware (1920-1933, 1941-1946, 1958-1960)
  if (id >= 1920 && id <= 1933) return 'ceramics'
  if (id >= 1941 && id <= 1946) return 'ceramics'
  if (id >= 1958 && id <= 1960) return 'ceramics'
  if (id >= 3850 && id <= 3860) return 'ceramics'
  // Glassware
  if (id >= 2005 && id <= 2015) return 'glassware'
  // Books
  if (id >= 2317 && id <= 2330) return 'books'
  if (id >= 2994 && id <= 3005) return 'books'
  // Jewellery
  if (id >= 21 && id <= 25) return 'jewellery'
  if (id >= 163 && id <= 170) return 'jewellery'
  if (id >= 540 && id <= 560) return 'jewellery'
  // Clothing
  if (id >= 4 && id <= 10) return 'clothing'
  if (id >= 2050 && id <= 2055) return 'clothing'
  // Collectibles
  if (id >= 3820 && id <= 3830) return 'collectibles'
  // Toys
  if (id >= 1499 && id <= 1510) return 'toys'
  if (id >= 1730 && id <= 1770) return 'toys'
  // Furniture
  if (id >= 3154 && id <= 3200) return 'furniture'
  return 'other'
}

/**
 * Look up Wrenlist category from Vinted catalog ID
 * Priority: exact match → range fallback → "other"
 */
export function lookupVintedCategory(
  catalogId: number | string | null | undefined
): string {
  if (!catalogId) return 'other'

  const id = typeof catalogId === 'string' ? parseInt(catalogId, 10) : catalogId
  if (isNaN(id) || id <= 0) return 'other'

  // Try exact match first
  const exact = VINTED_ID_TO_WRENLIST[id]
  if (exact) return exact

  // Fall back to range-based lookup
  return getCategoryByRange(id)
}

/**
 * Reverse lookup: find the best canonical leaf value for a Vinted catalog ID
 */
export function lookupVintedLeafCategory(
  catalogId: number | string | null | undefined
): string | null {
  const topLevel = lookupVintedCategory(catalogId)
  if (topLevel === 'other') return null

  // Safe: lookupVintedCategory already validated catalogId is non-null and numeric
  const id = typeof catalogId === 'string' ? parseInt(catalogId, 10) : (catalogId ?? 0)

  // Try exact match against tree leaves
  const subcats = CATEGORY_TREE[topLevel]
  if (!subcats) return null

  for (const node of Object.values(subcats)) {
    const vintedId = node.platforms.vinted?.id
    if (vintedId && parseInt(vintedId, 10) === id) {
      return node.value
    }
  }

  // Return first leaf of the top-level category as fallback
  const firstNode = Object.values(subcats)[0]
  return firstNode?.value ?? null
}
