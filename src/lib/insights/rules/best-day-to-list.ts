/**
 * Best day to list — surfaces a day-of-week pattern in Dom's sold-data.
 *
 * For each sold find with a known `created_at` → `sold_at` gap, bucket
 * by the day of the week the find was listed (created_at) and compute
 * the average days-to-sell. The winning day is the one with the lowest
 * avg (fastest sell-through).
 *
 * Needs ≥10 sold observations overall and ≥3 sales in the winning day,
 * AND the winner must be meaningfully faster than average (at least 20%
 * better). Otherwise it's noise.
 */

import type { InsightRule } from '../types'

const DAY_MS = 1000 * 60 * 60 * 24
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MIN_SAMPLE = 10
const MIN_PER_DAY = 3
const IMPROVEMENT_THRESHOLD = 0.2

export const bestDayToListRule: InsightRule = {
  id: 'best-day-to-list',
  priority: 15,
  evaluate(ctx) {
    const observations: Array<{ dow: number; days: number }> = []
    for (const f of ctx.finds) {
      if (f.status !== 'sold' || !f.created_at || !f.sold_at) continue
      const createdMs = new Date(f.created_at).getTime()
      const soldMs = new Date(f.sold_at).getTime()
      const days = (soldMs - createdMs) / DAY_MS
      if (days <= 0) continue
      observations.push({ dow: new Date(createdMs).getUTCDay(), days })
    }
    if (observations.length < MIN_SAMPLE) return null

    const overallAvg =
      observations.reduce((sum, o) => sum + o.days, 0) / observations.length

    const buckets: Array<{ total: number; count: number }> = Array.from(
      { length: 7 },
      () => ({ total: 0, count: 0 }),
    )
    for (const o of observations) {
      const bucket = buckets[o.dow]
      if (!bucket) continue
      bucket.total += o.days
      bucket.count += 1
    }

    const perDay = buckets
      .map((b, dow) => ({
        dow,
        avg: b.count > 0 ? b.total / b.count : Infinity,
        count: b.count,
      }))
      .filter((d) => d.count >= MIN_PER_DAY)

    if (perDay.length < 2) return null

    perDay.sort((a, b) => a.avg - b.avg)
    const winner = perDay[0]!
    const improvement = 1 - winner.avg / overallAvg
    if (improvement < IMPROVEMENT_THRESHOLD) return null

    const dayName = DAYS[winner.dow]!
    const improvementPct = Math.round(improvement * 100)

    return {
      key: 'best-day-to-list',
      type: 'tip',
      priority: 15,
      text: `Items you list on ${dayName}s sell ${improvementPct}% faster than average (${Math.round(winner.avg)} days vs ${Math.round(overallAvg)}). Try batching future listings to ${dayName} mornings.`,
      cta: { text: 'view sold →', href: '/finds?status=sold' },
      meta: {
        day: dayName,
        avgDays: Math.round(winner.avg),
        overallAvg: Math.round(overallAvg),
        improvementPct,
      },
    }
  },
}
