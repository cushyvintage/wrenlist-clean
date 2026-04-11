/**
 * Sourcing trend — flag when a previously-great source has deteriorated.
 *
 * Compares the trailing-3-months avg margin per source_name against the
 * all-time avg margin (excluding the last 3 months). If the recent number
 * has dropped by ≥15 percentage points, surface it as a "might be time
 * to refresh" tip.
 *
 * Reframed from the original supplier-loyalty rule because Dom's data
 * model has `suppliers` + `sourcing_trips` but finds aren't linked to
 * trips on this account, so a supplier-level rule has no data to read.
 * `source_name` on `finds` is the working proxy — it's what sourcing-roi
 * already uses for the "best all-time" angle. This rule covers the
 * temporal angle: "the spot that used to be gold".
 *
 * Requires ≥3 sales in the recent window AND ≥5 sales in the historical
 * window so a bad month doesn't look like a trend.
 */

import type { InsightRule } from '../types'

const DAY_MS = 1000 * 60 * 60 * 24
const RECENT_WINDOW_DAYS = 90
const MIN_RECENT_SALES = 3
const MIN_HISTORICAL_SALES = 5
const DROP_THRESHOLD_PCT_POINTS = 15

export const sourcingTrendRule: InsightRule = {
  id: 'sourcing-trend',
  priority: 42,
  evaluate(ctx) {
    const cutoff = ctx.now - RECENT_WINDOW_DAYS * DAY_MS

    type Bucket = { recent: number[]; historical: number[] }
    const bySource: Record<string, Bucket> = {}

    for (const f of ctx.finds) {
      if (f.status !== 'sold' || !f.cost_gbp || !f.sold_price_gbp || !f.source_name || !f.sold_at) {
        continue
      }
      const margin = ((f.sold_price_gbp - f.cost_gbp) / f.cost_gbp) * 100
      const soldMs = new Date(f.sold_at).getTime()
      const bucket = bySource[f.source_name] ?? { recent: [], historical: [] }
      if (soldMs >= cutoff) {
        bucket.recent.push(margin)
      } else {
        bucket.historical.push(margin)
      }
      bySource[f.source_name] = bucket
    }

    type Candidate = {
      source: string
      recentAvg: number
      historicalAvg: number
      drop: number
      recentCount: number
    }

    const candidates: Candidate[] = []
    for (const [source, b] of Object.entries(bySource)) {
      if (b.recent.length < MIN_RECENT_SALES) continue
      if (b.historical.length < MIN_HISTORICAL_SALES) continue
      const recentAvg = b.recent.reduce((s, v) => s + v, 0) / b.recent.length
      const historicalAvg = b.historical.reduce((s, v) => s + v, 0) / b.historical.length
      const drop = historicalAvg - recentAvg
      if (drop >= DROP_THRESHOLD_PCT_POINTS) {
        candidates.push({
          source,
          recentAvg,
          historicalAvg,
          drop,
          recentCount: b.recent.length,
        })
      }
    }

    if (candidates.length === 0) return null

    candidates.sort((a, b) => b.drop - a.drop)
    const worst = candidates[0]!

    return {
      key: 'sourcing-trend',
      type: 'tip',
      priority: 42,
      text: `${worst.source} used to average ${Math.round(worst.historicalAvg)}% margin but has dropped to ${Math.round(worst.recentAvg)}% across your last ${worst.recentCount} sales there. Might be time to refresh the sourcing mix.`,
      cta: { text: 'view sold →', href: '/finds?status=sold' },
      meta: {
        source: worst.source,
        historicalAvg: Math.round(worst.historicalAvg),
        recentAvg: Math.round(worst.recentAvg),
        drop: Math.round(worst.drop),
      },
    }
  },
}
