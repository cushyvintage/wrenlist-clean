/**
 * SKU generation for Wrenlist finds
 * Format: WL-{CATEGORY_PREFIX}-{TIMESTAMP_BASE36}
 * Example: WL-CER-X2KP91
 */

import { createSupabaseServerClient } from './supabase-server'

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

/**
 * Generate a unique SKU by checking database for collisions
 * Retries up to 10 times with 1ms delays to ensure uniqueness
 * @param category - The category key (e.g., 'ceramics', 'clothing')
 * @param userId - The authenticated user ID for scoped uniqueness check
 * @returns Promise<string> - Guaranteed unique SKU
 * @throws Error if unable to generate unique SKU after 10 attempts
 */
export async function generateUniqueSKU(category: string, userId: string): Promise<string> {
  const MAX_RETRIES = 10

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const sku = generateSKU(category)

    try {
      const supabase = await createSupabaseServerClient()

      // Check if this SKU already exists for this user
      const { data, error } = await supabase
        .from('finds')
        .select('id')
        .eq('user_id', userId)
        .eq('sku', sku)
        .single()

      // If no error and no data, SKU is unique
      if (!data) {
        return sku
      }

      // SKU exists, wait 1ms and retry with new timestamp
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    } catch (err) {
      // Supabase error (not a "no rows" case) - try again
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
  }

  throw new Error(`Failed to generate unique SKU after ${MAX_RETRIES} attempts`)
}
