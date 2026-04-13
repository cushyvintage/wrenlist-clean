import type { SupabaseClient } from '@supabase/supabase-js'

export interface DedupMatch {
  id: string
  name: string
  photos: string[]
  selectedMarketplaces: string[]
  similarity: number
}

/**
 * Find potential duplicates for a title among a user's existing finds.
 * Uses pg_trgm similarity (requires pg_trgm extension + GIN index).
 * Returns up to 3 matches above 0.35 similarity threshold.
 */
export async function findPotentialDuplicates(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  limit = 3
): Promise<DedupMatch[]> {
  // Use raw SQL via rpc — Supabase JS doesn't expose similarity()
  const { data, error } = await supabase.rpc('check_dedup_title', {
    p_user_id: userId,
    p_title: title,
    p_limit: limit,
  })

  if (error) {
    // If the RPC doesn't exist yet (migration not applied), fail silently
    console.error('[dedup-check] RPC error:', error.message)
    return []
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.find_id as string,
    name: row.find_name as string,
    photos: (row.find_photos as string[]) || [],
    selectedMarketplaces: (row.find_marketplaces as string[]) || [],
    similarity: row.sim as number,
  }))
}
