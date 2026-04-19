import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/dedup/candidates
 * Returns potential cross-marketplace duplicate pairs for the user.
 * Uses pg_trgm similarity on finds.name, excludes dismissed pairs.
 * Query: ?threshold=0.4&limit=20
 */
export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  // Default 0.55 — at 0.35–0.40 we were returning visually-unrelated pairs
  // (e.g. "Ceramic Basket" vs "Ceramic Bowl") because pg_trgm similarity on
  // short titles is noisy. 0.55 is tighter without losing obvious dupes.
  const threshold = Math.max(0.2, Math.min(1, parseFloat(url.searchParams.get('threshold') || '0.55')))
  const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get('limit') || '20', 10)))

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('find_dedup_candidates', {
    p_user_id: user.id,
    p_threshold: threshold,
    p_limit: limit,
  })

  if (error) {
    console.error('[dedup/candidates] RPC error:', error)
    return ApiResponseHelper.internalError('Failed to fetch dedup candidates')
  }

  // Shape the raw RPC rows into structured pairs
  const candidates = (data || []).map((row: Record<string, unknown>) => ({
    findA: {
      id: row.find_a_id,
      name: row.find_a_name,
      photos: row.find_a_photos || [],
      brand: row.find_a_brand,
      selectedMarketplaces: row.find_a_marketplaces || [],
      status: row.find_a_status,
      description: row.find_a_description,
      createdAt: row.find_a_created_at,
    },
    findB: {
      id: row.find_b_id,
      name: row.find_b_name,
      photos: row.find_b_photos || [],
      brand: row.find_b_brand,
      selectedMarketplaces: row.find_b_marketplaces || [],
      status: row.find_b_status,
      description: row.find_b_description,
      createdAt: row.find_b_created_at,
    },
    similarityScore: row.similarity_score,
  }))

  return ApiResponseHelper.success({ candidates, count: candidates.length })
})
