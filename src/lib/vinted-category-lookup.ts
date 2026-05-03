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
        map[numId] = row.value  // leaf value, not top_level
      }
    }
  }

  // Additional known IDs not in leaf nodes (parent/sibling ranges) → map to leaf values
  const extras: Record<number, string> = {
    // Tableware / Kitchen zone
    1920: 'home_garden_kitchen_and_dining', 1921: 'home_garden_kitchen_and_dining',
    1922: 'home_garden_kitchen_and_dining', 1923: 'home_garden_kitchen_and_dining',
    1924: 'home_garden_kitchen_and_dining', 1925: 'home_garden_kitchen_and_dining',
    1926: 'home_garden_kitchen_and_dining', 1927: 'home_garden_kitchen_and_dining',
    1928: 'home_garden_kitchen_and_dining', 1929: 'home_garden_kitchen_and_dining',
    1930: 'home_garden_kitchen_and_dining', 1931: 'home_garden_kitchen_and_dining',
    1933: 'home_garden_kitchen_and_dining', 1958: 'home_garden_kitchen_and_dining',
    1959: 'home_garden_kitchen_and_dining', 1960: 'home_garden_kitchen_and_dining',
    1941: 'home_garden_kitchen_and_dining', 1942: 'home_garden_kitchen_and_dining',
    1943: 'home_garden_kitchen_and_dining', 1944: 'home_garden_kitchen_and_dining',
    1945: 'home_garden_kitchen_and_dining', 1946: 'home_garden_kitchen_and_dining',
    // Homeware zone
    1934: 'home_garden_general', 1935: 'home_garden_general', 1939: 'home_garden_general',
    1957: 'home_garden_general', 3865: 'home_garden_general',
    // Glassware
    2007: 'home_garden_kitchen_and_dining', 2008: 'home_garden_kitchen_and_dining',
    2011: 'home_garden_kitchen_and_dining',
    // Books
    2317: 'books_media_books', 2318: 'books_media_books', 2319: 'books_media_books',
    2320: 'books_media_books', 2321: 'books_media_books', 2322: 'books_media_books',
    2323: 'books_media_books', 2324: 'books_media_books', 2325: 'books_media_books',
    2326: 'books_media_books', 2327: 'books_media_books', 2328: 'books_media_books',
    2329: 'books_media_books', 2330: 'books_media_books',
    2994: 'books_media_books', 2998: 'books_media_books', 2999: 'books_media_books',
    3000: 'books_media_books', 3001: 'books_media_books', 3003: 'books_media_books',
    3004: 'books_media_books', 3005: 'books_media_books', 5426: 'books_media_books',
    // Jewellery / accessories → women's general
    21: 'clothing_womenswear_general', 166: 'clothing_womenswear_general',
    168: 'clothing_womenswear_general', 169: 'clothing_womenswear_general',
    170: 'clothing_womenswear_general', 2038: 'clothing_womenswear_general',
    2039: 'clothing_womenswear_general', 2040: 'clothing_womenswear_general',
    241: 'clothing_womenswear_general', 242: 'clothing_womenswear_general',
    243: 'clothing_womenswear_general', 2966: 'clothing_womenswear_general',
    // Clothing (Women)
    4: 'clothing_womenswear_general', 5: 'clothing_womenswear_general',
    6: 'clothing_womenswear_general', 7: 'clothing_womenswear_general',
    222: 'clothing_womenswear_general', 536: 'clothing_womenswear_general',
    77: 'clothing_womenswear_general',
    // Clothing (Men)
    2050: 'clothing_menswear_general', 2052: 'clothing_menswear_general',
    // Shoes
    1049: 'clothing_womenswear_general', 1233: 'clothing_womenswear_general',
    2632: 'clothing_womenswear_general', 1242: 'clothing_womenswear_general',
    543: 'clothing_womenswear_general',
    // Collectibles
    3824: 'collectibles_general', 3825: 'collectibles_general',
    3826: 'collectibles_general', 3827: 'collectibles_general',
    // Toys
    1500: 'toys_games_general', 1501: 'toys_games_general', 1502: 'toys_games_general',
    1503: 'toys_games_general', 1504: 'toys_games_general', 1505: 'toys_games_general',
    1506: 'toys_games_general', 1507: 'toys_games_general', 1508: 'toys_games_general',
    1509: 'toys_games_general', 1510: 'toys_games_general',
    // Furniture → home_garden
    3155: 'home_garden_furniture', 3156: 'home_garden_furniture', 3157: 'home_garden_furniture',
    3159: 'home_garden_furniture', 3161: 'home_garden_furniture', 3162: 'home_garden_furniture',
    3163: 'home_garden_furniture', 3164: 'home_garden_furniture', 3165: 'home_garden_furniture',
    // Beauty
    956: 'health_beauty_general', 960: 'health_beauty_general',
    // Entertainment / music / film
    2312: 'books_media_movies',
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
  if (id >= 1920 && id <= 1960) return 'home_garden_kitchen_and_dining'
  if (id >= 3850 && id <= 3860) return 'home_garden_general'
  if (id >= 2005 && id <= 2015) return 'home_garden_kitchen_and_dining'
  if (id >= 3154 && id <= 3200) return 'home_garden_furniture'
  if (id >= 2317 && id <= 2330) return 'books_media_books'
  if (id >= 2994 && id <= 3005) return 'books_media_books'
  if (id >= 21 && id <= 25) return 'clothing_womenswear_general'
  if (id >= 163 && id <= 170) return 'clothing_womenswear_general'
  if (id >= 540 && id <= 560) return 'clothing_womenswear_general'
  if (id >= 4 && id <= 10) return 'clothing_womenswear_general'
  if (id >= 2050 && id <= 2055) return 'clothing_menswear_general'
  if (id >= 3820 && id <= 3830) return 'collectibles_general'
  if (id >= 1499 && id <= 1510) return 'toys_games_general'
  if (id >= 1730 && id <= 1770) return 'toys_games_general'
  return 'other_general'
}

/**
 * Look up Wrenlist category from Vinted catalog ID
 * Priority: exact match → range fallback → "other"
 */
export async function lookupVintedCategory(
  catalogId: number | string | null | undefined
): Promise<string> {
  if (!catalogId) return 'other_general'

  const id = typeof catalogId === 'string' ? parseInt(catalogId, 10) : catalogId
  if (isNaN(id) || id <= 0) return 'other_general'

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
