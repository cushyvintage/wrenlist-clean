/**
 * SKU generation for Wrenlist finds.
 *
 * Generator in this file produces WL-prefixed SKUs for finds added in
 * Wrenlist itself. Format: WL-{CATEGORY_PREFIX}-{TIMESTAMP_BASE36}
 * Example: WL-CER-X2KP91
 *
 * Imports stamp their own source prefix so operators can trace a SKU back
 * to where it came from at a glance:
 *   VT-  — Vinted import (src/app/api/vinted/import/route.ts)
 *   EB-  — eBay seller SKU kept verbatim (not generated)
 *
 * The /sku page mirrors this explanation in the UI.
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
  // Try exact match, then progressively shorter prefixes (e.g. "home_garden_general" → "home_garden" → "home")
  let prefix = CATEGORY_PREFIXES[cat]
  if (!prefix) {
    const parts = cat.split('_')
    for (let i = parts.length - 1; i >= 1 && !prefix; i--) {
      prefix = CATEGORY_PREFIXES[parts.slice(0, i).join('_')]
    }
  }
  if (!prefix) prefix = CATEGORY_PREFIXES.other
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6)
  return `WL-${prefix}-${timestamp}`
}

/**
 * generateUniqueSKU (server-only, requires DB) has been moved to sku.server.ts
 * Import from '@/lib/sku.server' in API routes and Server Components only
 */
