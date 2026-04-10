/**
 * Wren Insights — engine
 *
 * Runs every rule against a context, filters out dismissed ones, sorts by
 * urgency, returns the top N. Logs what it returns to `insight_events` on
 * a 1h dedup window so refresh spam doesn't bloat analytics.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Insight, InsightContext } from './types'
import { isInsight } from './types'
import { ALL_RULES } from './rules'

const TYPE_RANK: Record<Insight['type'], number> = { alert: 3, tip: 2, info: 1 }
const ONE_HOUR_MS = 60 * 60 * 1000

export interface RunRulesOptions {
  limit?: number
  /** Pre-loaded dismissed keys (so the route can fetch in parallel with context). */
  dismissedKeys?: Set<string>
}

export async function runRules(
  supabase: SupabaseClient,
  ctx: InsightContext,
  options: RunRulesOptions = {},
): Promise<Insight[]> {
  const limit = options.limit ?? 3
  const dismissedKeys = options.dismissedKeys ?? (await loadDismissedKeys(supabase, ctx.userId))

  const raw = ALL_RULES.map((rule) => rule.evaluate(ctx)).filter(isInsight)
  const allowed = raw.filter((i) => !dismissedKeys.has(i.key))

  allowed.sort((a, b) => {
    const rank = TYPE_RANK[b.type] - TYPE_RANK[a.type]
    return rank !== 0 ? rank : b.priority - a.priority
  })

  const top = allowed.slice(0, limit)

  if (top.length > 0) {
    // Fire-and-forget — analytics failures never block the user response.
    void logShownInsights(supabase, ctx.userId, top).catch((err) => {
      console.error('[insights] logShownInsights failed:', err)
    })
  }

  return top
}

export async function loadDismissedKeys(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('dismissed_insights')
    .select('insight_key')
    .eq('user_id', userId)
    .gt('dismissed_until', new Date().toISOString())

  if (error) {
    console.error('[insights] loadDismissedKeys failed:', error)
    return new Set()
  }
  return new Set((data ?? []).map((r) => r.insight_key))
}

/**
 * Logs shown insights once per (user, insight_key) per hour — otherwise
 * refreshing the dashboard would bloat `insight_events` and ruin analytics.
 */
async function logShownInsights(
  supabase: SupabaseClient,
  userId: string,
  insights: Insight[],
): Promise<void> {
  if (insights.length === 0) return

  const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS).toISOString()
  const keys = insights.map((i) => i.key)

  const { data: recent, error: recentErr } = await supabase
    .from('insight_events')
    .select('insight_key')
    .eq('user_id', userId)
    .in('insight_key', keys)
    .gt('shown_at', oneHourAgo)

  if (recentErr) {
    // Don't let a failed lookup drop all analytics — worst case is a double-log.
    console.error('[insights] dedup lookup failed:', recentErr)
  }

  const recentKeys = new Set((recent ?? []).map((r) => r.insight_key))
  const toInsert = insights.filter((i) => !recentKeys.has(i.key))
  if (toInsert.length === 0) return

  const rows = toInsert.map((i) => ({
    user_id: userId,
    insight_key: i.key,
    insight_text: i.text,
    type: i.type,
    meta: i.meta ?? null,
  }))
  const { error } = await supabase.from('insight_events').insert(rows)
  if (error) throw new Error(error.message)
}

/**
 * Shared helper used by both dismiss and clicked routes — stamps the most
 * recent un-stamped `insight_events` row for this key with the given field.
 */
export async function stampLatestInsightEvent(
  supabase: SupabaseClient,
  userId: string,
  insightKey: string,
  field: 'clicked_at' | 'dismissed_at',
): Promise<void> {
  const { data: recent } = await supabase
    .from('insight_events')
    .select('id')
    .eq('user_id', userId)
    .eq('insight_key', insightKey)
    .is(field, null)
    .order('shown_at', { ascending: false })
    .limit(1)

  if (recent && recent[0]) {
    await supabase
      .from('insight_events')
      .update({ [field]: new Date().toISOString() })
      .eq('id', recent[0].id)
  }
}
