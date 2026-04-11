/**
 * Listing streak — pure morale insight. If Dom has added a find every day
 * for the last 5+ days (counting today or yesterday as the latest), call
 * it out. Streaks drive behaviour even when the metric is silly.
 *
 * Walks backward from today through distinct YYYY-MM-DD buckets in
 * `created_at`, stopping at the first gap. Allows yesterday as the
 * "latest" day so we don't lose a streak just because today is fresh.
 */

import type { InsightRule } from '../types'

const MIN_STREAK = 5
const DAY_MS = 1000 * 60 * 60 * 24

function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
}

export const listingStreakRule: InsightRule = {
  id: 'listing-streak',
  priority: 25,
  evaluate(ctx) {
    const days = new Set<string>()
    for (const f of ctx.finds) {
      if (!f.created_at) continue
      days.add(dayKey(new Date(f.created_at)))
    }
    if (days.size < MIN_STREAK) return null

    const today = new Date(ctx.now)
    let cursor = days.has(dayKey(today)) ? today : new Date(ctx.now - DAY_MS)
    if (!days.has(dayKey(cursor))) return null

    let streak = 0
    while (days.has(dayKey(cursor))) {
      streak++
      cursor = new Date(cursor.getTime() - DAY_MS)
    }

    if (streak < MIN_STREAK) return null

    return {
      key: 'listing-streak',
      type: 'info',
      priority: 25,
      text: `${streak}-day streak — you've added finds every day this week. Keep the momentum going.`,
      cta: { text: 'add another →', href: '/add-find' },
      meta: { streak },
    }
  },
}
