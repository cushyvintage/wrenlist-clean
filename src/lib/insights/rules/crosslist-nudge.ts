/**
 * Crosslisting nudge — Vinted-heavy users with zero eBay presence.
 *
 * Only fires once the user has ≥20 Vinted listings; below that, setting up
 * a second channel is probably premature.
 */

import type { InsightRule } from '../types'

export const crosslistNudgeRule: InsightRule = {
  id: 'crosslist-nudge',
  priority: 40,
  evaluate(ctx) {
    const vintedFinds = ctx.finds.filter((f) =>
      ctx.listedMarketplacesByFind.get(f.id)?.has('vinted'),
    )
    const ebayFinds = ctx.finds.filter((f) =>
      ctx.listedMarketplacesByFind.get(f.id)?.has('ebay'),
    )

    if (vintedFinds.length < 20 || ebayFinds.length > 0) return null

    const highValue = vintedFinds.filter((f) => (f.asking_price_gbp ?? 0) >= 20)

    return {
      key: 'crosslist-nudge',
      type: 'tip',
      priority: 40,
      text: `You have ${vintedFinds.length} items on Vinted but nothing on eBay. Crosslisting your ${highValue.length} items priced £20+ could reach a very different buyer base.`,
      cta: { text: 'view listed →', href: '/finds?status=listed' },
      meta: { vinted: vintedFinds.length, highValue: highValue.length },
    }
  },
}
