/**
 * Platform margin — compares realised net margin across marketplaces.
 *
 * For each sold find, we know the sale price (`finds.sold_price_gbp`) and
 * the marketplace it sold on (from the `status='sold'` PMD row loaded into
 * `ctx.soldListingByFind`). We subtract a rough seller-fee estimate from
 * `@/lib/marketplace-fees` and the find's `cost_gbp` to get a per-sale
 * net profit, then average by marketplace.
 *
 * Fires only when there are ≥5 sales on each of ≥2 marketplaces — below
 * that the comparison is noise. Surfaces the best-performing channel as
 * a tip.
 */

import type { InsightRule } from '../types'
import { calculateFees } from '@/lib/marketplace-fees'

const MIN_SALES_PER_PLATFORM = 5

export const platformMarginRule: InsightRule = {
  id: 'platform-margin',
  priority: 50,
  evaluate(ctx) {
    type Agg = { marketplace: string; totalNet: number; totalGross: number; count: number }
    const byMarketplace: Record<string, Agg> = {}

    for (const f of ctx.finds) {
      if (f.status !== 'sold' || !f.cost_gbp || !f.sold_price_gbp) continue
      const sold = ctx.soldListingByFind.get(f.id)
      if (!sold) continue
      const fees = calculateFees(sold.marketplace, f.sold_price_gbp)
      const net = f.sold_price_gbp - f.cost_gbp - fees
      const bucket = byMarketplace[sold.marketplace] ?? {
        marketplace: sold.marketplace,
        totalNet: 0,
        totalGross: f.sold_price_gbp,
        count: 0,
      }
      bucket.totalNet += net
      bucket.totalGross += f.sold_price_gbp
      bucket.count += 1
      byMarketplace[sold.marketplace] = bucket
    }

    const qualifying = Object.values(byMarketplace).filter(
      (a) => a.count >= MIN_SALES_PER_PLATFORM,
    )
    if (qualifying.length < 2) return null

    const sorted = qualifying
      .map((a) => ({
        marketplace: a.marketplace,
        avgNet: a.totalNet / a.count,
        count: a.count,
      }))
      .sort((a, b) => b.avgNet - a.avgNet)

    const best = sorted[0]
    const runnerUp = sorted[1]
    if (!best || !runnerUp) return null

    const gap = best.avgNet - runnerUp.avgNet
    // Ignore ties / dead heats (< £1 average difference).
    if (gap < 1) return null

    const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    return {
      key: 'platform-margin',
      type: 'tip',
      priority: 50,
      text: `${capitalise(best.marketplace)} nets you £${best.avgNet.toFixed(2)} per sale after fees vs £${runnerUp.avgNet.toFixed(2)} on ${capitalise(runnerUp.marketplace)}. Worth weighting your listings toward the winner.`,
      cta: { text: 'view sold →', href: '/finds?status=sold' },
      meta: {
        best: best.marketplace,
        bestNet: Math.round(best.avgNet * 100) / 100,
        runnerUp: runnerUp.marketplace,
        runnerUpNet: Math.round(runnerUp.avgNet * 100) / 100,
      },
    }
  },
}
