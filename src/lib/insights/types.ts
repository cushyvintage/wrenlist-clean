/**
 * Wren Insights — shared types
 *
 * The insight engine is a registry of pure-function rules. Each rule receives
 * an `InsightContext` (loaded once per request) and returns either a shaped
 * `Insight` or `null` (no signal to fire).
 *
 * Rules never query the database themselves — all I/O happens in
 * `context.ts`. This keeps rules trivially testable and makes it easy to
 * add new signals without extra round-trips.
 */

export type InsightType = 'alert' | 'tip' | 'info'

export interface Insight {
  /** Stable id — matches the rule filename. Used for dismissal + history. */
  key: string
  type: InsightType
  /** The italicised body copy on the card. */
  text: string
  cta: { text: string; href: string }
  /** Optional structured metadata — surfaces in insight_events for analytics. */
  meta?: Record<string, number | string>
  /**
   * Priority within its type bucket. Higher fires first.
   * Engine sort: alert (by priority desc) → tip (by priority desc) → info.
   */
  priority: number
}

/**
 * Everything a rule might need. Loaded once per request by `loadContext()`.
 *
 * Keep this shape narrow — if a rule needs a new field, add it here + in
 * `context.ts` so it's loaded in parallel with the rest.
 */
export interface InsightContext {
  userId: string
  now: number
  finds: FindForInsights[]
  /** Map of find_id → set of marketplaces where status = 'listed'. */
  listedMarketplacesByFind: Map<string, Set<string>>
  /** Count of finds the user has (pre-pagination). Used by new-user guard. */
  totalFinds: number
}

/**
 * Narrow projection of the `finds` row — only fields insights actually read.
 * Extend as new rules need new fields.
 */
export interface FindForInsights {
  id: string
  status: string | null
  created_at: string | null
  updated_at: string | null
  cost_gbp: number | null
  sold_price_gbp: number | null
  asking_price_gbp: number | null
  category: string | null
  source_name: string | null
  photos: string[] | null
}

/**
 * A rule is a pure function + metadata. Keep it synchronous so the engine
 * can run every rule for free once the context is loaded.
 */
export interface InsightRule {
  /** Stable key — filename without `.ts`. Must match `Insight.key`. */
  id: string
  /** Higher priority fires first within the same type bucket. */
  priority: number
  /**
   * Evaluate the rule against the context. Return `null` to skip.
   * MUST be pure and synchronous — no network, no clock reads
   * (use `ctx.now` for determinism).
   */
  evaluate: (ctx: InsightContext) => Insight | null
}

/** Type guard used in the engine after filtering nulls. */
export function isInsight(x: Insight | null): x is Insight {
  return x !== null
}
