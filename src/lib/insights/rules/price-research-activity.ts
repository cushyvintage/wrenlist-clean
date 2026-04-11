/**
 * Price research activity — nudge when Dom hasn't used Price Research in
 * 30+ days AND currently has unpriced items waiting.
 *
 * Reframed from the original "stale research" plan because the
 * `price_research_history` table has no `find_id` back-reference — we
 * can't actually tell which finds were priced using research. Instead,
 * this rule uses Price Research as a _tool_ signal: if there are items
 * needing a price AND the tool hasn't been touched recently, remind the
 * user it exists. Closes the loop with the unpriced rule by pointing at
 * a concrete action.
 */

import type { InsightRule } from '../types'

const DAY_MS = 1000 * 60 * 60 * 24
const STALE_DAYS = 30
const MIN_UNPRICED = 3

export const priceResearchActivityRule: InsightRule = {
  id: 'price-research-activity',
  priority: 20,
  evaluate(ctx) {
    const unpriced = ctx.finds.filter(
      (f) =>
        (f.status === 'draft' || f.status === 'listed') &&
        !(f.asking_price_gbp && f.asking_price_gbp > 0),
    ).length

    if (unpriced < MIN_UNPRICED) return null

    // No research ever? Skip — too cold a nudge for new users.
    if (ctx.lastPriceResearchAt === null) return null

    const daysSinceResearch = (ctx.now - ctx.lastPriceResearchAt) / DAY_MS
    if (daysSinceResearch < STALE_DAYS) return null

    return {
      key: 'price-research-activity',
      type: 'tip',
      priority: 20,
      text: `${unpriced} items need prices and you haven't used Price Research in ${Math.round(daysSinceResearch)} days. A quick batch lookup beats guessing.`,
      cta: { text: 'open Price Research →', href: '/price-research' },
      meta: { unpriced, daysSinceResearch: Math.round(daysSinceResearch) },
    }
  },
}
