/**
 * Wren Insights — engine
 *
 * Runs every rule against a context, filters out dismissed ones, sorts by
 * urgency, and returns the top N. Also logs what it returns to
 * `insight_events` so we can build a history/analytics layer later.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Insight, InsightContext } from './types'
import { isInsight } from './types'
import { ALL_RULES } from './rules'

const TYPE_RANK: Record<Insight['type'], number> = {
  alert: 3,
  tip: 2,
  info: 1,
}

export interface RunRulesOptions {
  limit?: number
}

/**
 * Evaluate every registered rule, filter out dismissed ones, sort by
 * urgency + priority, and return the top `limit` insights.
 *
 * Dismissals: rows in `dismissed_insights` where `dismissed_until > now()`
 * block the rule from firing. Stored per user + insight_key.
 */
export async function runRules(
  supabase: SupabaseClient,
  ctx: InsightContext,
  options: RunRulesOptions = {},
): Promise<Insight[]> {
  const limit = options.limit ?? 3

  // Fetch active dismissals in parallel with rule evaluation.
  const dismissedKeysPromise = loadDismissedKeys(supabase, ctx.userId)

  // Rules are sync and pure — evaluate them all synchronously.
  const raw = ALL_RULES.map((rule) => rule.evaluate(ctx)).filter(isInsight)

  const dismissedKeys = await dismissedKeysPromise

  const allowed = raw.filter((i) => !dismissedKeys.has(i.key))

  allowed.sort((a, b) => {
    const rank = TYPE_RANK[b.type] - TYPE_RANK[a.type]
    if (rank !== 0) return rank
    return b.priority - a.priority
  })

  const top = allowed.slice(0, limit)

  // Fire-and-forget: log what we're about to return. Failure shouldn't
  // block the user-facing response.
  if (top.length > 0) {
    void logShownInsights(supabase, ctx.userId, top).catch((err) => {
      console.error('[insights] logShownInsights failed:', err)
    })
  }

  return top
}

async function loadDismissedKeys(
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
 * Logs shown insights, but only once per (user, insight_key) per hour —
 * otherwise refreshing the dashboard would bloat `insight_events` and
 * ruin downstream analytics ("this insight was shown 847 times").
 */
async function logShownInsights(
  supabase: SupabaseClient,
  userId: string,
  insights: Insight[],
): Promise<void> {
  if (insights.length === 0) return

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const keys = insights.map((i) => i.key)

  const { data: recent, error: recentErr } = await supabase
    .from('insight_events')
    .select('insight_key')
    .eq('user_id', userId)
    .in('insight_key', keys)
    .gt('shown_at', oneHourAgo)

  if (recentErr) {
    // Don't let a failed lookup block logging — worst case we double-log
    // a single event. Better than silently dropping all analytics.
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
