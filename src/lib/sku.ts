/**
 * SKU generation for Wrenlist finds
 * Format: WL-{CATEGORY_PREFIX}-{TIMESTAMP_BASE36}
 * Example: WL-CER-X2KP91
 */

const CATEGORY_PREFIXES: Record<string, string> = {
  // Phase 3 top-level categories
  antiques: 'ANT',
  art: 'ART',
  baby_toddler: 'BAB',
  books_media: 'BKS',
  clothing: 'CLT',
  craft_supplies: 'CRF',
  collectibles: 'COL',
  electronics: 'ELC',
  health_beauty: 'HBE',
  home_garden: 'HMG',
  musical_instruments: 'MUS',
  pet_supplies: 'PET',
  sports_outdoors: 'SPO',
  toys_games: 'TOY',
  vehicles_parts: 'VEH',
  other: 'OTH',
  // Legacy prefixes (backward compat for existing SKUs in DB)
  ceramics: 'CER',
  glassware: 'GLS',
  books: 'BKS',
  jewellery: 'JWL',
  homeware: 'HMW',
  furniture: 'FRN',
  medals: 'MDL',
}

/**
 * Generate a SKU for a find based on category
 * @param category - The category key (e.g., 'ceramics', 'clothing')
 * @returns SKU string in format WL-{PREFIX}-{TIMESTAMP}, e.g., WL-CER-X2KP91
 */
export function generateSKU(category: string): string {
  const cat = category.toLowerCase()
  // Try exact match first, then extract top-level from compound value (e.g. "clothing_womenswear_dresses" → "clothing")
  const prefix = CATEGORY_PREFIXES[cat]
    ?? CATEGORY_PREFIXES[cat.split('_')[0] ?? '']
    ?? CATEGORY_PREFIXES.other
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6)
  return `WL-${prefix}-${timestamp}`
}

/**
 * generateUniqueSKU (server-only, requires DB) has been moved to sku.server.ts
 * Import from '@/lib/sku.server' in API routes and Server Components only
 */
