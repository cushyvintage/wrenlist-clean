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
const ONE_DAY_MS = 24 * ONE_HOUR_MS

/**
 * Auto-mute thresholds. If an insight has been shown this many times in the
 * lookback window with zero clicks and zero dismissals, the engine treats
 * it as muted for the cool-off period — the user has clearly seen it and
 * chosen not to act, so showing it daily becomes noise.
 *
 * The mute is virtual (not persisted); once enough time passes that the
 * latest impression is older than the cool-off, the insight surfaces again.
 */
const AUTO_MUTE_THRESHOLD = 5
const AUTO_MUTE_LOOKBACK_MS = 7 * ONE_DAY_MS
const AUTO_MUTE_COOLOFF_MS = 3 * ONE_DAY_MS

export interface RunRulesOptions {
  limit?: number
  /** Pre-loaded dismissed keys (so the route can fetch in parallel with context). */
  dismissedKeys?: Set<string>
  /**
   * When false, skip the `insight_events` fire-and-forget log. Set this
   * from server-side callers (cron digest, previews) where the user
   * hasn't actually "seen" the insight in the UI — otherwise the
   * /insights history page would show events the user never looked at.
   * Defaults to true (the dashboard API is the primary caller).
   */
  logEvents?: boolean
}

export async function runRules(
  supabase: SupabaseClient,
  ctx: InsightContext,
  options: RunRulesOptions = {},
): Promise<Insight[]> {
  const limit = options.limit ?? 3
  const logEvents = options.logEvents ?? true

  const [dismissedKeys, autoMutedKeys] = await Promise.all([
    options.dismissedKeys
      ? Promise.resolve(options.dismissedKeys)
      : loadDismissedKeys(supabase, ctx.userId),
    loadAutoMutedKeys(supabase, ctx.userId),
  ])

  const suppressed = new Set<string>([...dismissedKeys, ...autoMutedKeys])
  const raw = ALL_RULES.map((rule) => rule.evaluate(ctx)).filter(isInsight)
  const allowed = raw.filter((i) => !suppressed.has(i.key))

  allowed.sort((a, b) => {
    const rank = TYPE_RANK[b.type] - TYPE_RANK[a.type]
    return rank !== 0 ? rank : b.priority - a.priority
  })

  const top = allowed.slice(0, limit)

  if (top.length > 0 && logEvents) {
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
 * Returns insight keys to virtually mute because the user has seen them
 * AUTO_MUTE_THRESHOLD+ times in the last AUTO_MUTE_LOOKBACK_MS without ever
 * clicking or dismissing — and the most recent impression is still inside
 * the cool-off window. This stops the same alert reappearing every day for
 * weeks when the user has clearly chosen not to act on it.
 *
 * No DB writes: the mute is computed at read time from `insight_events`,
 * so the next impression after the cool-off naturally re-surfaces it.
 */
export async function loadAutoMutedKeys(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<string>> {
  const lookbackStart = new Date(Date.now() - AUTO_MUTE_LOOKBACK_MS).toISOString()

  const { data, error } = await supabase
    .from('insight_events')
    .select('insight_key, shown_at, clicked_at, dismissed_at')
    .eq('user_id', userId)
    .gt('shown_at', lookbackStart)

  if (error) {
    console.error('[insights] loadAutoMutedKeys failed:', error)
    return new Set()
  }

  type Row = { insight_key: string; shown_at: string; clicked_at: string | null; dismissed_at: string | null }
  const rows = (data ?? []) as Row[]
  const grouped = new Map<string, { count: number; latestShown: number; touched: boolean }>()

  for (const row of rows) {
    const entry = grouped.get(row.insight_key) ?? { count: 0, latestShown: 0, touched: false }
    entry.count += 1
    const t = new Date(row.shown_at).getTime()
    if (t > entry.latestShown) entry.latestShown = t
    if (row.clicked_at || row.dismissed_at) entry.touched = true
    grouped.set(row.insight_key, entry)
  }

  const cooloffStart = Date.now() - AUTO_MUTE_COOLOFF_MS
  const muted = new Set<string>()
  for (const [key, entry] of grouped) {
    if (entry.touched) continue
    if (entry.count < AUTO_MUTE_THRESHOLD) continue
    // Only mute if the most recent impression is still within the cool-off.
    // Once the user goes 3 days without seeing it, surface it again.
    if (entry.latestShown >= cooloffStart) muted.add(key)
  }
  return muted
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
