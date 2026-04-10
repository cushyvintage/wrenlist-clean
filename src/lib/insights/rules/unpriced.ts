/**
 * Unpriced — finds without an asking_price_gbp set.
 *
 * Two flavours based on severity:
 *   - ALERT when any listed items are unpriced (live stock, buyers see nothing)
 *   - TIP when only drafts are unpriced
 *
 * Count matches `/api/finds?filter=unpriced` exactly so the insight, pill,
 * and filtered view agree.
 */

import type { Insight, InsightRule } from '../types'

export const unpricedRule: InsightRule = {
  id: 'unpriced',
  priority: 95,
  evaluate(ctx): Insight | null {
    const unpriced = ctx.finds.filter(
      (f) => f.status !== 'sold' && !(f.asking_price_gbp && f.asking_price_gbp > 0),
    )
    if (unpriced.length === 0) return null

    const listedUnpriced = unpriced.filter((f) => f.status === 'listed')

    if (listedUnpriced.length > 0) {
      const valueAtRisk = listedUnpriced.reduce((sum, f) => sum + (f.cost_gbp ?? 0), 0)
      const costPart =
        valueAtRisk > 0 ? ` (£${Math.round(valueAtRisk)} of live stock at risk)` : ''
      const draftsCount = unpriced.length - listedUnpriced.length
      const draftsPart =
        draftsCount > 0 ? ` — ${draftsCount} draft${draftsCount === 1 ? '' : 's'} also waiting` : ''
      const verb = listedUnpriced.length === 1 ? ' has' : 's have'
      return {
        key: 'unpriced',
        type: 'alert',
        priority: 95,
        text: `${listedUnpriced.length} listed item${verb} no asking price set${costPart}${draftsPart}. Set prices before buyers lose interest.`,
        cta: { text: `set prices (${unpriced.length}) →`, href: '/finds?filter=unpriced' },
        meta: {
          count: unpriced.length,
          listed: listedUnpriced.length,
          valueAtRisk: Math.round(valueAtRisk),
        },
      }
    }

    if (unpriced.length >= 3) {
      return {
        key: 'unpriced',
        type: 'tip',
        priority: 60,
        text: `${unpriced.length} items are waiting on a price. Use Price Research to benchmark them quickly.`,
        cta: { text: `price items (${unpriced.length}) →`, href: '/finds?filter=unpriced' },
        meta: { count: unpriced.length },
      }
    }

    return null
  },
}
