/**
 * Server-only SKU utilities (requires DB access)
 * Import only from API routes or Server Components
 */
import { createSupabaseServerClient } from './supabase-server'
import { generateSKU } from './sku'

/**
 * Generate a unique SKU by checking database for collisions
 * Retries up to 10 times to ensure uniqueness
 */
export async function generateUniqueSKU(category: string, userId: string): Promise<string> {
  const MAX_RETRIES = 10

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const sku = generateSKU(category)

    try {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase
        .from('finds')
        .select('id')
        .eq('user_id', userId)
        .eq('sku', sku)
        .single()

      if (!data) return sku

      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
  }

  throw new Error(`Failed to generate unique SKU after ${MAX_RETRIES} attempts`)
}
