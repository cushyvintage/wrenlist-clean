/**
 * Slow categories — categories where avg days-to-sell is more than 2× the
 * portfolio median. Tells Dom which categories to think twice about
 * sourcing more of.
 *
 * Days-to-sell is `sold_at - created_at`. Imports can occasionally produce
 * rows where `sold_at` predates `created_at` (the legacy record existed
 * before Wrenlist imported it), so we drop non-positive values rather
 * than treating them as zero — they'd skew the portfolio median hard.
 *
 * Requires ≥10 positive sold-duration observations overall and ≥3 in the
 * winning slow category so we're never crowning a single bad month.
 */

import type { InsightRule } from '../types'

const DAY_MS = 1000 * 60 * 60 * 24

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    const lo = sorted[mid - 1] ?? 0
    const hi = sorted[mid] ?? 0
    return (lo + hi) / 2
  }
  return sorted[mid] ?? 0
}

export const slowCategoriesRule: InsightRule = {
  id: 'slow-categories',
  priority: 45,
  evaluate(ctx) {
    type Sold = { category: string; daysToSell: number }
    const sold: Sold[] = []
    for (const f of ctx.finds) {
      if (f.status !== 'sold' || !f.created_at || !f.sold_at || !f.category) continue
      const days =
        (new Date(f.sold_at).getTime() - new Date(f.created_at).getTime()) / DAY_MS
      // Drop imports with bogus timelines — we only want genuine
      // Wrenlist-observed durations.
      if (days <= 0) continue
      sold.push({ category: f.category, daysToSell: days })
    }
    if (sold.length < 10) return null

    const portfolioMedian = median(sold.map((s) => s.daysToSell))
    if (portfolioMedian <= 0) return null

    const byCategory: Record<string, number[]> = {}
    for (const s of sold) {
      const arr = byCategory[s.category] ?? []
      arr.push(s.daysToSell)
      byCategory[s.category] = arr
    }

    const slowest = Object.entries(byCategory)
      .filter(([, arr]) => arr.length >= 3)
      .map(([category, arr]) => ({
        category,
        avgDays: arr.reduce((sum, d) => sum + d, 0) / arr.length,
        count: arr.length,
      }))
      .filter((c) => c.avgDays > portfolioMedian * 2)
      .sort((a, b) => b.avgDays - a.avgDays)[0]

    if (!slowest) return null

    const categoryName = slowest.category
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

    return {
      key: 'slow-categories',
      type: 'tip',
      priority: 45,
      text: `${categoryName.toLowerCase()} take ${Math.round(slowest.avgDays)} days to sell on average — over 2× your portfolio median (${Math.round(portfolioMedian)} days). Worth thinking twice about sourcing more.`,
      cta: { text: 'view sold →', href: '/finds?status=sold' },
      meta: {
        category: slowest.category,
        avgDays: Math.round(slowest.avgDays),
        portfolioMedian: Math.round(portfolioMedian),
      },
    }
  },
}
