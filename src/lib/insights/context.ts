/**
 * Wren Insights — context loader
 *
 * One-shot parallel load of everything the rule registry might need. Rules
 * are pure functions that read from the returned context; they never query
 * the DB themselves. This is the single place to optimise for fewer
 * round-trips.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { InsightContext, FindForInsights } from './types'

const PAGE_SIZE = 1000

/**
 * Load the narrow projection of every find this user owns, plus the set of
 * marketplaces each find is currently listed on. Finds and PMD run in
 * parallel — PMD no longer needs find IDs since the user_id column was
 * added in migration 20260410000011.
 */
export async function loadContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<InsightContext> {
  const [finds, listedMarketplacesByFind] = await Promise.all([
    loadFinds(supabase, userId),
    loadListedMarketplaces(supabase, userId),
  ])

  return {
    userId,
    now: Date.now(),
    finds,
    listedMarketplacesByFind,
    totalFinds: finds.length,
  }
}

async function loadFinds(
  supabase: SupabaseClient,
  userId: string,
): Promise<FindForInsights[]> {
  // Columns limited to what the current rules actually read. Dropping
  // photos/updated_at/source_name cuts the payload by ~70% for heavy users.
  const finds: FindForInsights[] = []
  for (let off = 0; ; off += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('finds')
      .select('id,status,created_at,cost_gbp,sold_price_gbp,asking_price_gbp,category')
      .eq('user_id', userId)
      .range(off, off + PAGE_SIZE - 1)

    if (error) throw new Error(`loadContext finds: ${error.message}`)
    if (!data || data.length === 0) break
    finds.push(...(data as unknown as FindForInsights[]))
    if (data.length < PAGE_SIZE) break
  }
  return finds
}

/**
 * Map of find_id → set of marketplaces currently listed. Non-fatal: if
 * the query fails we return an empty map so the other rules still fire.
 */
async function loadListedMarketplaces(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()

  const { data, error } = await supabase
    .from('product_marketplace_data')
    .select('find_id,marketplace')
    .eq('user_id', userId)
    .eq('status', 'listed')

  if (error) {
    console.error('[insights] loadListedMarketplaces failed (non-fatal):', error)
    return map
  }

  for (const row of data ?? []) {
    const set = map.get(row.find_id) ?? new Set<string>()
    set.add(row.marketplace)
    map.set(row.find_id, set)
  }
  return map
}
