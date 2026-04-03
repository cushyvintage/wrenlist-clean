import { NextRequest } from 'next/server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/api-helpers'
import type { Find, PlatformFields, SourceType } from '@/types'

interface VintedListing {
  id: string
  title: string
  description?: string
  category_title?: string
  catalog_id?: number
  price: string | number
  url: string
}

interface BatchImportResult {
  imported: number
  skipped: number
  errors: number
  errorDetails?: Array<{ listingId: string; reason: string }>
}

/**
 * Best-effort category mapping from Vinted catalog_id to canonical category
 */
function mapVintedCategoryToCanonical(catalogId?: number, categoryTitle?: string): string {
  // Vinted category IDs - basic mapping
  const categoryMap: Record<number, string> = {
    1: 'homeware',
    2: 'jewellery',
    3: 'homeware',
    4: 'jewellery',
    5: 'clothing',
    6: 'clothing',
    7: 'clothing',
    8: 'clothing',
    10: 'homeware',
    11: 'homeware',
    12: 'toys',
    13: 'books',
    14: 'ceramics',
    15: 'homeware',
    16: 'clothing',
  }

  if (catalogId && catalogId in categoryMap) {
    return categoryMap[catalogId] || 'other'
  }

  // Fallback: simple text matching
  if (categoryTitle) {
    const title = categoryTitle.toLowerCase()
    if (title.includes('book')) return 'books'
    if (title.includes('ceramic') || title.includes('pottery')) return 'ceramics'
    if (title.includes('glass') || title.includes('glassware')) return 'glassware'
    if (title.includes('jewel') || title.includes('ring') || title.includes('necklace')) return 'jewellery'
    if (title.includes('cloth') || title.includes('dress') || title.includes('shirt')) return 'clothing'
    if (title.includes('furniture')) return 'furniture'
    if (title.includes('toy')) return 'toys'
    if (title.includes('home') || title.includes('decor')) return 'homeware'
  }

  return 'other'
}

/**
 * POST /api/import/vinted-batch
 * Import batch of Vinted listings as finds
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async (req, user, supabase) => {
  try {
    const body = await req.json()
    const { listings } = body as { listings: VintedListing[] }

    if (!Array.isArray(listings) || listings.length === 0) {
      return ApiResponseHelper.badRequest('listings array is required and must not be empty')
    }

    let imported = 0
    let skipped = 0
    let errors = 0
    const errorDetails: Array<{ listingId: string; reason: string }> = []

    // Process each listing
    for (const listing of listings) {
      try {
        if (!listing.id || !listing.title || !listing.price) {
          errors++
          errorDetails.push({ listingId: listing.id || 'unknown', reason: 'Missing required fields' })
          continue
        }

        // Check if find already exists with this Vinted listing ID
        const { data: existing, error: existingError } = await supabase
          .from('finds')
          .select('id')
          .eq('user_id', user.id)
          .filter('platform_fields->>vinted', 'ilike', `%"listingId":"${listing.id}"%`)
          .single()

        if (existingError && existingError.code !== 'PGRST116') {
          // Real error (not "no rows found")
          throw existingError
        }

        if (existing) {
          // Listing already imported
          skipped++
          continue
        }

        // Map to find
        const category = mapVintedCategoryToCanonical(listing.catalog_id, listing.category_title)
        const askingPrice = typeof listing.price === 'string' ? parseFloat(listing.price) : listing.price

        const platformFields: PlatformFields = {
          vinted: {
            listingId: listing.id,
            url: listing.url,
            publishedAt: new Date().toISOString(),
            status: 'live',
            catalogId: listing.catalog_id,
          },
        }

        const newFind: Partial<Find> = {
          user_id: user.id,
          name: listing.title,
          description: listing.description || null,
          category,
          asking_price_gbp: askingPrice,
          status: 'listed',
          source_type: 'other' as SourceType,
          source_name: 'Vinted',
          platform_fields: platformFields,
          photos: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { error: insertError } = await supabase
          .from('finds')
          .insert([newFind])

        if (insertError) {
          throw insertError
        }

        imported++
      } catch (err) {
        errors++
        const reason = err instanceof Error ? err.message : 'Unknown error'
        errorDetails.push({ listingId: listing.id || 'unknown', reason })
      }
    }

    const result: BatchImportResult = {
      imported,
      skipped,
      errors,
      ...(errorDetails.length > 0 && { errorDetails }),
    }

    return ApiResponseHelper.success(result)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('POST /api/import/vinted-batch error:', error)
    }
    return ApiResponseHelper.internalError()
  }
  })
}
