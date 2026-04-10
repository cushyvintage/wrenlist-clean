/**
 * Aged stock — listed 30+ days with no sale.
 *
 * High urgency: these are the items eating into capital without moving.
 * A 10–15% price drop is the standard unsticking lever.
 */

import type { InsightRule } from '../types'

const DAY_MS = 1000 * 60 * 60 * 24

export const agedStockRule: InsightRule = {
  id: 'aged-stock',
  priority: 100,
  evaluate(ctx) {
    const aged = ctx.finds.filter((f) => {
      if (f.status !== 'listed' || !f.created_at) return false
      return Math.floor((ctx.now - new Date(f.created_at).getTime()) / DAY_MS) >= 30
    })

    if (aged.length === 0) return null

    const sunkCost = aged.reduce((sum, f) => sum + (f.cost_gbp ?? 0), 0)
    const valuePart = sunkCost > 0 ? ` (£${Math.round(sunkCost)} in sunk cost)` : ''
    const noun = aged.length === 1 ? 'item' : 'items'
    const verb = aged.length === 1 ? 'has' : 'have'

    return {
      key: 'aged-stock',
      type: 'alert',
      priority: 100,
      text: `${aged.length} ${noun} ${verb} been listed 30+ days with no sale${valuePart}. A 10–15% price drop usually restarts the clock.`,
      cta: { text: `review aged stock (${aged.length}) →`, href: '/finds?filter=aging' },
      meta: { count: aged.length, sunkCost: Math.round(sunkCost) },
    }
  },
}
