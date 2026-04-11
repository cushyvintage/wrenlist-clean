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
  const [finds, listedMarketplacesByFind, lastPriceChangeByFind] = await Promise.all([
    loadFinds(supabase, userId),
    loadListedMarketplaces(supabase, userId),
    loadLastPriceChanges(supabase, userId),
  ])

  return {
    userId,
    now: Date.now(),
    finds,
    listedMarketplacesByFind,
    lastPriceChangeByFind,
    totalFinds: finds.length,
  }
}

async function loadFinds(
  supabase: SupabaseClient,
  userId: string,
): Promise<FindForInsights[]> {
  // Columns limited to what rules in src/lib/insights/rules/ actually
  // read. Adding a field here means extending FindForInsights too.
  const finds: FindForInsights[] = []
  for (let off = 0; ; off += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('finds')
      .select(
        'id,status,created_at,sold_at,cost_gbp,sold_price_gbp,asking_price_gbp,category,source_name,photos',
      )
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

/**
 * Map of find_id → timestamp (ms) of the most recent `price_changes` row.
 * Scoped to the last 30 days because the drift rule only cares about
 * recency — older rows are irrelevant and dragging them through the
 * network is waste. Non-fatal on error.
 */
async function loadLastPriceChanges(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('price_changes')
    .select('find_id,changed_at')
    .eq('user_id', userId)
    .gte('changed_at', since)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('[insights] loadLastPriceChanges failed (non-fatal):', error)
    return map
  }

  // Rows come newest-first; the first row per find_id is the latest.
  for (const row of data ?? []) {
    if (map.has(row.find_id)) continue
    map.set(row.find_id, new Date(row.changed_at).getTime())
  }
  return map
}
