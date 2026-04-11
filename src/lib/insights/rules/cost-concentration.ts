/**
 * Cost concentration — flag when >60% of live stock cost sits in a single
 * top-level category. A slow category could stall cash flow, so this
 * nudges toward diversifying the next sourcing run.
 *
 * Top-level = the part before the first underscore of our canonical slugs
 * (clothing_womenswear_dresses → clothing). Only fires if there's enough
 * total live cost AND at least 2 top-level categories — otherwise "100%
 * concentration" just means Dom has only ever sourced one type of thing
 * and it's not a risk signal.
 */

import type { InsightRule } from '../types'

const THRESHOLD = 0.6
const MIN_TOTAL_COST = 200 // GBP — below this, "concentration" isn't actionable
const MIN_CATEGORIES = 2

function topLevel(category: string | null): string | null {
  if (!category) return null
  const trimmed = category.trim()
  if (!trimmed) return null
  const idx = trimmed.indexOf('_')
  return idx === -1 ? trimmed : trimmed.slice(0, idx)
}

export const costConcentrationRule: InsightRule = {
  id: 'cost-concentration',
  priority: 35,
  evaluate(ctx) {
    const live = ctx.finds.filter(
      (f) => (f.status === 'draft' || f.status === 'listed') && f.cost_gbp && f.cost_gbp > 0,
    )

    const byTopLevel: Record<string, number> = {}
    let totalCost = 0
    for (const f of live) {
      const top = topLevel(f.category)
      if (!top) continue
      const cost = f.cost_gbp ?? 0
      byTopLevel[top] = (byTopLevel[top] ?? 0) + cost
      totalCost += cost
    }

    if (totalCost < MIN_TOTAL_COST) return null
    if (Object.keys(byTopLevel).length < MIN_CATEGORIES) return null

    const winner = Object.entries(byTopLevel)
      .map(([cat, cost]) => ({ cat, cost, share: cost / totalCost }))
      .sort((a, b) => b.share - a.share)[0]

    if (!winner || winner.share < THRESHOLD) return null

    const categoryName = winner.cat.charAt(0).toUpperCase() + winner.cat.slice(1)

    return {
      key: 'cost-concentration',
      type: 'tip',
      priority: 35,
      text: `${Math.round(winner.share * 100)}% of your live stock value (£${Math.round(winner.cost)}) is in ${categoryName}. A single slow category could stall cash flow — diversify on the next sourcing run.`,
      cta: { text: 'view inventory →', href: '/finds' },
      meta: {
        category: winner.cat,
        share: Math.round(winner.share * 100),
        cost: Math.round(winner.cost),
      },
    }
  },
}
