/**
 * Price drift — listed items that have gone stale without a price change.
 *
 * An item qualifies as "drifting" when all of these are true:
 *   - status is 'listed'
 *   - it's been listed for at least 14 days
 *   - the asking price hasn't changed in the last 10 days
 *   - it hasn't sold
 *
 * These are the items where a price drop is the obvious next move. The
 * drift window is narrower than aged-stock (30 days) so this fires
 * earlier and is lower-urgency — a price nudge, not an alarm.
 *
 * Relies on the `price_changes` audit log populated by the trigger in
 * migration 20260411000001. Items with no recorded change were either
 * listed before the log existed, or have truly never been repriced —
 * both are legitimate drift candidates.
 */

import type { InsightRule } from '../types'

const DAY_MS = 1000 * 60 * 60 * 24
const MIN_LISTED_DAYS = 14
const NO_CHANGE_WINDOW_DAYS = 10

export const priceDriftRule: InsightRule = {
  id: 'price-drift',
  priority: 65,
  evaluate(ctx) {
    const drifting = ctx.finds.filter((f) => {
      if (f.status !== 'listed' || !f.created_at) return false
      const listedDays = (ctx.now - new Date(f.created_at).getTime()) / DAY_MS
      if (listedDays < MIN_LISTED_DAYS) return false

      // If there's a recent price change, it's not drifting.
      const lastChange = ctx.lastPriceChangeByFind.get(f.id)
      if (lastChange) {
        const daysSinceChange = (ctx.now - lastChange) / DAY_MS
        if (daysSinceChange < NO_CHANGE_WINDOW_DAYS) return false
      }
      return true
    })

    // Minimum 3 items so it's worth nudging. Below that, aged-stock (at 30
    // days) will handle the edge case.
    if (drifting.length < 3) return null

    const totalAsking = drifting.reduce((sum, f) => sum + (f.asking_price_gbp ?? 0), 0)
    const pricedPart =
      totalAsking > 0 ? ` — £${Math.round(totalAsking)} of stock at current prices` : ''

    return {
      key: 'price-drift',
      type: 'tip',
      priority: 65,
      text: `${drifting.length} listed items have been sitting 14+ days without a price change${pricedPart}. A small adjustment often restarts interest.`,
      cta: { text: `review listings (${drifting.length}) →`, href: '/finds?filter=aging' },
      meta: { count: drifting.length, totalAsking: Math.round(totalAsking) },
    }
  },
}
