/**
 * Low stock — fewer than 5 active finds (draft + listed).
 *
 * Nudges a sourcing run before the pipeline stalls. Skipped on tiny
 * inventories because the new-user guard in the engine handles those.
 */

import type { InsightRule } from '../types'

export const lowStockRule: InsightRule = {
  id: 'low-stock',
  priority: 30,
  evaluate(ctx) {
    if (ctx.totalFinds < 3) return null
    const active = ctx.finds.filter((f) => f.status === 'draft' || f.status === 'listed').length
    if (active >= 5) return null

    return {
      key: 'low-stock',
      type: 'tip',
      priority: 30,
      text: 'Your active inventory is running low — a sourcing run would keep momentum up.',
      cta: { text: 'log a trip →', href: '/sourcing' },
      meta: { active },
    }
  },
}
