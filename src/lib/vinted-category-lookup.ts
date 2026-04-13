/**
 * Vinted catalog ID → Wrenlist category lookup
 * Database-backed with lazy caching. Falls back to range-based heuristics
 * for unmapped IDs.
 */

import { getAllCategories, type CategoryRow } from '@/lib/category-db'

// ---------------------------------------------------------------------------
// Lazy cache: built once per server-side request lifecycle, then reused.
// ---------------------------------------------------------------------------
let _cachedMap: Record<number, string> | null = null

async function getVintedIdMap(): Promise<Record<number, string>> {
  if (_cachedMap) return _cachedMap

  const all = await getAllCategories()
  const map: Record<number, string> = {}

  for (const row of all) {
    const vintedId = row.platforms?.vinted?.id
    if (vintedId) {
      const numId = parseInt(vintedId, 10)
      if (!isNaN(numId) && !map[numId]) {
        map[numId] = row.top_level
      }
    }
  }

  // Additional known IDs not in leaf nodes (parent/sibling ranges)
  const extras: Record<number, string> = {
    // Tableware / Kitchen zone
    1920: 'home_garden', 1921: 'home_garden', 1922: 'home_garden', 1923: 'home_garden',
    1924: 'home_garden', 1925: 'home_garden', 1926: 'home_garden', 1927: 'home_garden',
    1928: 'home_garden', 1929: 'home_garden', 1930: 'home_garden', 1931: 'home_garden',
    1933: 'home_garden', 1958: 'home_garden', 1959: 'home_garden', 1960: 'home_garden',
    1941: 'home_garden', 1942: 'home_garden', 1943: 'home_garden',
    1944: 'home_garden', 1945: 'home_garden', 1946: 'home_garden',
    // Homeware zone
    1934: 'home_garden', 1935: 'home_garden', 1939: 'home_garden',
    1957: 'home_garden', 3865: 'home_garden',
    // Glassware
    2007: 'home_garden', 2008: 'home_garden', 2011: 'home_garden',
    // Books
    2317: 'books_media', 2318: 'books_media', 2319: 'books_media', 2320: 'books_media',
    2321: 'books_media', 2322: 'books_media', 2323: 'books_media', 2324: 'books_media',
    2325: 'books_media', 2326: 'books_media', 2327: 'books_media', 2328: 'books_media',
    2329: 'books_media', 2330: 'books_media',
    2994: 'books_media', 2998: 'books_media', 2999: 'books_media', 3000: 'books_media',
    3001: 'books_media', 3003: 'books_media', 3004: 'books_media', 3005: 'books_media',
    5426: 'books_media',
    // Jewellery → clothing
    21: 'clothing', 166: 'clothing', 168: 'clothing', 169: 'clothing',
    170: 'clothing', 2038: 'clothing', 2039: 'clothing', 2040: 'clothing',
    241: 'clothing', 242: 'clothing', 243: 'clothing', 2966: 'clothing',
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
    1500: 'toys_games', 1501: 'toys_games', 1502: 'toys_games', 1503: 'toys_games',
    1504: 'toys_games', 1505: 'toys_games', 1506: 'toys_games', 1507: 'toys_games',
    1508: 'toys_games', 1509: 'toys_games', 1510: 'toys_games',
    // Furniture → home_garden
    3155: 'home_garden', 3156: 'home_garden', 3157: 'home_garden',
    3159: 'home_garden', 3161: 'home_garden', 3162: 'home_garden',
    3163: 'home_garden', 3164: 'home_garden', 3165: 'home_garden',
    // Beauty
    956: 'health_beauty', 960: 'health_beauty',
    // Entertainment
    2312: 'books_media',
  }

  for (const [id, cat] of Object.entries(extras)) {
    const numId = parseInt(id, 10)
    if (!map[numId]) map[numId] = cat
  }

  _cachedMap = map
  return map
}

/**
 * Range-based fallbacks for unmapped catalog IDs
 */
function getCategoryByRange(id: number): string {
  if (id >= 1920 && id <= 1960) return 'home_garden'
  if (id >= 3850 && id <= 3860) return 'home_garden'
  if (id >= 2005 && id <= 2015) return 'home_garden'
  if (id >= 3154 && id <= 3200) return 'home_garden'
  if (id >= 2317 && id <= 2330) return 'books_media'
  if (id >= 2994 && id <= 3005) return 'books_media'
  if (id >= 21 && id <= 25) return 'clothing'
  if (id >= 163 && id <= 170) return 'clothing'
  if (id >= 540 && id <= 560) return 'clothing'
  if (id >= 4 && id <= 10) return 'clothing'
  if (id >= 2050 && id <= 2055) return 'clothing'
  if (id >= 3820 && id <= 3830) return 'collectibles'
  if (id >= 1499 && id <= 1510) return 'toys_games'
  if (id >= 1730 && id <= 1770) return 'toys_games'
  return 'other'
}

/**
 * Look up Wrenlist category from Vinted catalog ID
 * Priority: exact match → range fallback → "other"
 */
export async function lookupVintedCategory(
  catalogId: number | string | null | undefined
): Promise<string> {
  if (!catalogId) return 'other'

  const id = typeof catalogId === 'string' ? parseInt(catalogId, 10) : catalogId
  if (isNaN(id) || id <= 0) return 'other'

  const vintedMap = await getVintedIdMap()

  // Try exact match first
  const exact = vintedMap[id]
  if (exact) return exact

  // Fall back to range-based lookup
  return getCategoryByRange(id)
}

/**
 * Reverse lookup: find the best canonical leaf value for a Vinted catalog ID
 */
export async function lookupVintedLeafCategory(
  catalogId: number | string | null | undefined
): Promise<string | null> {
  const topLevel = await lookupVintedCategory(catalogId)
  if (topLevel === 'other') return null

  const id = typeof catalogId === 'string' ? parseInt(catalogId, 10) : (catalogId ?? 0)

  // Try exact match against DB categories
  const subcats = await getAllCategories(topLevel)

  for (const row of subcats) {
    const vintedId = row.platforms?.vinted?.id
    if (vintedId && parseInt(vintedId, 10) === id) {
      return row.value
    }
  }

  // Return first leaf of the top-level category as fallback
  return subcats[0]?.value ?? null
}
