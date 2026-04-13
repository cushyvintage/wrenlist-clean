import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

interface ListingStatEntry {
  listingId: string
  visits: number
}

/**
 * POST /api/etsy/listing-stats
 * Stores per-listing visit counts from Etsy stats pages into PMD fields.stats.
 * Body: { stats: [{ listingId, visits }] }
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json() as { stats?: ListingStatEntry[] }
  const stats = body?.stats

  if (!Array.isArray(stats) || stats.length === 0) {
    return ApiResponseHelper.error('stats array required', 400)
  }

  if (stats.length > 100) {
    return ApiResponseHelper.error('max 100 entries per request', 400)
  }

  const supabase = await createSupabaseServerClient()
  let updated = 0
  const errors: string[] = []

  for (const entry of stats) {
    if (!entry.listingId || typeof entry.visits !== 'number') continue

    // Find the PMD row for this Etsy listing
    const { data: pmd, error: fetchErr } = await supabase
      .from('product_marketplace_data')
      .select('id, fields')
      .eq('user_id', user.id)
      .eq('marketplace', 'etsy')
      .eq('platform_listing_id', entry.listingId)
      .maybeSingle()

    if (fetchErr) {
      errors.push(`${entry.listingId}: ${fetchErr.message}`)
      continue
    }
    if (!pmd) continue // no matching PMD row

    // Merge stats into existing fields
    const existingFields = (pmd.fields as Record<string, unknown>) ?? {}
    const existingStats = (existingFields.stats as Record<string, unknown>) ?? {}
    const updatedFields = {
      ...existingFields,
      stats: {
        ...existingStats,
        visits: entry.visits,
        visits_updated_at: new Date().toISOString(),
      },
    }

    const { error: updateErr } = await supabase
      .from('product_marketplace_data')
      .update({ fields: updatedFields })
      .eq('id', pmd.id)
      .eq('user_id', user.id)

    if (updateErr) {
      errors.push(`${entry.listingId}: ${updateErr.message}`)
    } else {
      updated++
    }
  }

  return ApiResponseHelper.success({ updated, errors: errors.length > 0 ? errors : undefined })
})
