/**
 * SKU generation for Wrenlist finds
 * Format: WL-{CATEGORY_PREFIX}-{TIMESTAMP_BASE36}
 * Example: WL-CER-X2KP91
 */

const CATEGORY_PREFIXES: Record<string, string> = {
  ceramics: 'CER',
  glassware: 'GLS',
  books: 'BKS',
  jewellery: 'JWL',
  clothing: 'CLT',
  homeware: 'HMW',
  collectibles: 'COL',
  medals: 'MDL',
  toys: 'TOY',
  furniture: 'FRN',
  teapots: 'TPT',
  jugs: 'JUG',
  other: 'OTH',
}

/**
 * Generate a SKU for a find based on category
 * @param category - The category key (e.g., 'ceramics', 'clothing')
 * @returns SKU string in format WL-{PREFIX}-{TIMESTAMP}, e.g., WL-CER-X2KP91
 */
export function generateSKU(category: string): string {
  const prefix = CATEGORY_PREFIXES[category.toLowerCase()] || CATEGORY_PREFIXES.other
  const timestamp = Date.now().toString(36).toUpperCase().slice(-6)
  return `WL-${prefix}-${timestamp}`
}
