/**
 * Comprehensive Vinted catalog ID → Wrenlist category lookup
 * Built from CATEGORY_TREE + vinted-categories-summary.json + range fallbacks
 * Source: GET /api/v2/item_upload/catalogs (Vinted login required)
 */

/**
 * Exact Vinted ID → Wrenlist category mappings
 * Combines all known leaf nodes from CATEGORY_TREE + parent/sibling IDs
 */
const VINTED_ID_TO_WRENLIST: Record<number, string> = {
  // Ceramics / Tableware / Dinnerware (1920-1960s)
  1920: 'ceramics', // Tableware (parent)
  1921: 'ceramics', 1922: 'ceramics', 1923: 'ceramics', 1924: 'ceramics', 1925: 'ceramics',
  1926: 'ceramics', 1927: 'ceramics', 1928: 'ceramics', 1929: 'ceramics', 1930: 'ceramics',
  1931: 'ceramics', 1932: 'ceramics', 1933: 'ceramics',
  1958: 'ceramics', // Dinner sets
  1959: 'ceramics', // Bowls
  1960: 'ceramics', // Dinnerware
  1941: 'ceramics', 1942: 'ceramics', 1943: 'ceramics', 1944: 'ceramics', 1945: 'ceramics',
  1946: 'ceramics',

  // Homeware / Home accessories (1934-1945)
  1934: 'homeware', // Home accessories (parent)
  1935: 'homeware', // Candles
  1936: 'homeware', // Clocks
  1937: 'homeware', 1938: 'homeware',
  1939: 'homeware', // Storage
  1940: 'homeware', // Vases / Home decor

  // Ceramics serveware (3850s)
  3856: 'teapots', // Coffee pots & teapots
  3857: 'jugs',    // Jugs
  3865: 'ceramics',     // Speciality serveware
  3847: 'collectibles', // Paintings
  3485: 'homeware',     // Hotplates
  1957: 'homeware',     // Candle holders
  2364: 'toys',         // Kids
  2365: 'toys',         // Babies & toddlers
  5426: 'books',        // Textbooks & study materials
  3045: 'collectibles', // DVD

  // Glassware / Drinkware (2005-2015)
  2005: 'glassware', // Drinkware (parent)
  2006: 'glassware', // Cups & mugs
  2007: 'glassware', 2008: 'glassware',
  2009: 'glassware', // Stemmed glasses
  2010: 'glassware', // Tumblers
  2011: 'glassware',

  // Books (2317-2330, 2997-3005)
  2317: 'books', 2318: 'books', 2319: 'books', 2320: 'books',
  2321: 'books', 2322: 'books', 2323: 'books', 2324: 'books',
  2325: 'books', 2326: 'books', 2327: 'books', 2328: 'books',
  2329: 'books', 2330: 'books',
  2994: 'books', // Electronics > Books (parent)
  2997: 'books', // Books (main)
  2998: 'books', 2999: 'books', 3000: 'books', 3001: 'books',
  3002: 'books', // Video games (sometimes listed as books)
  3003: 'books', 3004: 'books', 3005: 'books',

  // Jewellery (21, 163-170, 2038-2040, 553)
  21: 'jewellery',   // Jewellery (parent)
  163: 'jewellery',  // Earrings
  164: 'jewellery',  // Necklaces
  165: 'jewellery',  // Bracelets
  166: 'jewellery',
  167: 'jewellery',  // Brooches (also used as medals)
  168: 'jewellery',
  169: 'jewellery', 170: 'jewellery',
  553: 'jewellery',  // Rings
  2038: 'jewellery', 2039: 'jewellery', 2040: 'jewellery',

  // Clothing (Women: 4-7, Men: 2050-2052)
  4: 'clothing',     // Women's Clothing
  5: 'clothing', 6: 'clothing', 7: 'clothing',
  2050: 'clothing',  // Men's Clothing
  2051: 'clothing', 2052: 'clothing',

  // Collectibles / Decorative accessories (3823-3827)
  3823: 'collectibles', // Decorative accessories
  3824: 'collectibles', 3825: 'collectibles', 3826: 'collectibles', 3827: 'collectibles',

  // Toys (1499-1510, 1730, 1763, 1764)
  1499: 'toys',  // Toys (parent)
  1500: 'toys', 1501: 'toys', 1502: 'toys', 1503: 'toys',
  1504: 'toys', 1505: 'toys', 1506: 'toys', 1507: 'toys',
  1508: 'toys', 1509: 'toys', 1510: 'toys',
  1730: 'toys',  // Toy figures
  1763: 'toys',  // Educational toys
  1764: 'toys',  // Soft toys

  // Furniture (3154-3165, 3158, 3160, 3187)
  3154: 'furniture', // Furniture (parent)
  3155: 'furniture', 3156: 'furniture', 3157: 'furniture',
  3158: 'furniture', // Seating
  3159: 'furniture',
  3160: 'furniture', // Tables
  3161: 'furniture', 3162: 'furniture', 3163: 'furniture',
  3164: 'furniture', 3165: 'furniture',
  3187: 'furniture', // Storage
}

/**
 * Range-based fallbacks for unmapped catalog IDs
 * Vinted's category tree has logical number groupings
 */
function getCategoryByRange(id: number): string {
  // Ceramics / Tableware / Dinnerware zone
  if (id >= 1920 && id <= 1946) return 'ceramics'
  if (id >= 1958 && id <= 1960) return 'ceramics'

  // Homeware / Home accessories zone (overlaps ceramics, but more general)
  if (id >= 1934 && id <= 1945) return 'homeware'

  // Ceramics serveware
  if (id >= 3850 && id <= 3860) return 'ceramics'

  // Glassware / Drinkware
  if (id >= 2005 && id <= 2015) return 'glassware'

  // Books (two ranges — Electronics section and alternative IDs)
  if (id >= 2317 && id <= 2330) return 'books'
  if (id >= 2994 && id <= 3005) return 'books'

  // Jewellery accessory zone
  if (id >= 21 && id <= 25) return 'jewellery'
  if (id >= 163 && id <= 170) return 'jewellery'
  if (id >= 540 && id <= 560) return 'jewellery' // Rings zone

  // Clothing zones (Women + Men)
  if (id >= 4 && id <= 10) return 'clothing'
  if (id >= 2050 && id <= 2055) return 'clothing'

  // Collectibles / Decorative
  if (id >= 3820 && id <= 3830) return 'collectibles'

  // Toys zone
  if (id >= 1499 && id <= 1510) return 'toys'
  if (id >= 1730 && id <= 1770) return 'toys'

  // Furniture zone
  if (id >= 3154 && id <= 3190) return 'furniture'

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
