/**
 * Best category — highlight the user's top-performing category by avg margin.
 *
 * Requires at least 5 sold items overall and at least 2 sales in the
 * winning category. Stops trivial single-sale noise from looking like a
 * signal.
 */

import type { InsightRule } from '../types'

export const bestCategoryRule: InsightRule = {
  id: 'best-category',
  priority: 50,
  evaluate(ctx) {
    const soldFinds = ctx.finds.filter(
      (f) => f.status === 'sold' && f.cost_gbp && f.sold_price_gbp,
    )
    if (soldFinds.length < 5) return null

    const categoryMargins: Record<string, { total: number; count: number }> = {}
    for (const f of soldFinds) {
      if (!f.category || !f.cost_gbp || !f.sold_price_gbp) continue
      const margin = ((f.sold_price_gbp - f.cost_gbp) / f.cost_gbp) * 100
      const bucket = categoryMargins[f.category] ?? { total: 0, count: 0 }
      bucket.total += margin
      bucket.count += 1
      categoryMargins[f.category] = bucket
    }

    const best = Object.entries(categoryMargins)
      .filter(([, d]) => d.count >= 2)
      .reduce(
        (acc, [cat, d]) => {
          const avgMargin = d.total / d.count
          return !acc || avgMargin > acc.avgMargin ? { cat, avgMargin, count: d.count } : acc
        },
        null as { cat: string; avgMargin: number; count: number } | null,
      )

    if (!best) return null

    const categoryName = best.cat
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    return {
      key: 'best-category',
      type: 'tip',
      priority: 50,
      text: `Your ${categoryName.toLowerCase()} finds are selling at ${Math.round(best.avgMargin)}% avg margin across ${best.count} sales — your best-performing category. Source more of this.`,
      cta: { text: 'view sold →', href: '/finds?status=sold' },
      meta: { category: best.cat, margin: Math.round(best.avgMargin) },
    }
  },
}
