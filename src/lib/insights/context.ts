/**
 * Wren Insights — context loader
 *
 * One-shot load of everything the rule registry might need. Rules are pure
 * functions that read from the returned context — they never query the DB
 * themselves. This is the single place to optimise for fewer round-trips.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { InsightContext, FindForInsights } from './types'

const PAGE_SIZE = 1000

/**
 * Load the narrow projection of every find this user owns, plus the set of
 * marketplaces each find is currently listed on. Single call per rule run.
 */
export async function loadContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<InsightContext> {
  // Paginate to bypass Supabase's 1000-row REST cap.
  const finds: FindForInsights[] = []
  for (let off = 0; ; off += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('finds')
      .select(
        'id,status,created_at,updated_at,cost_gbp,sold_price_gbp,asking_price_gbp,category,source_name,photos',
      )
      .eq('user_id', userId)
      .range(off, off + PAGE_SIZE - 1)

    if (error) throw new Error(`loadContext finds: ${error.message}`)
    if (!data || data.length === 0) break
    finds.push(...(data as unknown as FindForInsights[]))
    if (data.length < PAGE_SIZE) break
  }

  // Per-marketplace listing state, scoped by user_id directly — this used
  // to go through .in('find_id', [...]) which blew past PostgREST URL
  // limits for users with >~200 finds. The user_id column was added in
  // migration 20260410000011_pmd_user_id.sql.
  //
  // Non-fatal: if this query fails we still return a context with an
  // empty marketplaces map so the rest of the rules can fire.
  const listedMarketplacesByFind = new Map<string, Set<string>>()
  if (finds.length > 0) {
    const { data: pmdRows, error: pmdErr } = await supabase
      .from('product_marketplace_data')
      .select('find_id,marketplace')
      .eq('user_id', userId)
      .eq('status', 'listed')

    if (pmdErr) {
      console.error('[insights] loadContext pmd failed (non-fatal):', pmdErr)
    } else {
      for (const row of pmdRows ?? []) {
        const set = listedMarketplacesByFind.get(row.find_id) ?? new Set<string>()
        set.add(row.marketplace)
        listedMarketplacesByFind.set(row.find_id, set)
      }
    }
  }

  return {
    userId,
    now: Date.now(),
    finds,
    listedMarketplacesByFind,
    totalFinds: finds.length,
  }
}
