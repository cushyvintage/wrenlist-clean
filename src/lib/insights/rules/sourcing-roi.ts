/**
 * Sourcing ROI — best source_name by avg margin on sold items.
 *
 * Sibling to best-category, but groups by where Dom got the stuff rather
 * than what category it's in. Most reseller decisions are about which
 * trips to repeat, so this is one of the highest-value insights.
 *
 * Requires ≥3 sales from the winning source so a single lucky flip from
 * "Granny's house" doesn't get crowned.
 */

import type { InsightRule } from '../types'

export const sourcingRoiRule: InsightRule = {
  id: 'sourcing-roi',
  priority: 55,
  evaluate(ctx) {
    const sold = ctx.finds.filter(
      (f) =>
        f.status === 'sold' &&
        f.cost_gbp !== null &&
        f.cost_gbp > 0 &&
        f.sold_price_gbp !== null &&
        f.source_name !== null &&
        f.source_name.trim() !== '',
    )
    if (sold.length < 5) return null

    const bySource: Record<string, { total: number; count: number; profit: number }> = {}
    for (const f of sold) {
      if (!f.source_name || !f.cost_gbp || !f.sold_price_gbp) continue
      const margin = ((f.sold_price_gbp - f.cost_gbp) / f.cost_gbp) * 100
      const profit = f.sold_price_gbp - f.cost_gbp
      const bucket = bySource[f.source_name] ?? { total: 0, count: 0, profit: 0 }
      bucket.total += margin
      bucket.count += 1
      bucket.profit += profit
      bySource[f.source_name] = bucket
    }

    const best = Object.entries(bySource)
      .filter(([, d]) => d.count >= 3)
      .reduce(
        (acc, [source, d]) => {
          const avgMargin = d.total / d.count
          return !acc || avgMargin > acc.avgMargin
            ? { source, avgMargin, count: d.count, profit: d.profit }
            : acc
        },
        null as { source: string; avgMargin: number; count: number; profit: number } | null,
      )

    if (!best) return null

    return {
      key: 'sourcing-roi',
      type: 'tip',
      priority: 55,
      text: `${best.source} is your best sourcing spot — ${best.count} items sold at ${Math.round(best.avgMargin)}% avg margin (£${Math.round(best.profit)} total profit). Worth another visit.`,
      cta: { text: 'view sold →', href: '/finds?status=sold' },
      meta: { source: best.source, margin: Math.round(best.avgMargin), count: best.count },
    }
  },
}
