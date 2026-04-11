/**
 * Tax deadline — UK Self Assessment online filing deadline (31 January).
 * Fires inside a 60-day window before the deadline. Becomes an alert
 * inside 14 days.
 *
 * Doesn't yet cross-reference expenses/mileage — the meta field is
 * structured so a future version can ("you have £142 of unlogged mileage
 * from March").
 */

import type { InsightRule } from '../types'

const DAY_MS = 1000 * 60 * 60 * 24

function nextSelfAssessmentDeadline(now: Date): Date {
  // SA online return for tax year ending 5 April YYYY is due 31 January YYYY+1.
  const year = now.getUTCFullYear()
  const thisYearDeadline = new Date(Date.UTC(year, 0, 31, 23, 59, 59))
  if (now <= thisYearDeadline) return thisYearDeadline
  return new Date(Date.UTC(year + 1, 0, 31, 23, 59, 59))
}

export const taxDeadlineRule: InsightRule = {
  id: 'tax-deadline',
  priority: 70,
  evaluate(ctx) {
    const now = new Date(ctx.now)
    const deadline = nextSelfAssessmentDeadline(now)
    const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS)

    if (daysUntil < 0 || daysUntil > 60) return null

    const isAlert = daysUntil <= 14
    const dateStr = deadline.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    return {
      key: 'tax-deadline',
      type: isAlert ? 'alert' : 'tip',
      priority: isAlert ? 90 : 70,
      text: `HMRC Self Assessment deadline is in ${daysUntil} day${daysUntil === 1 ? '' : 's'} (${dateStr}). Make sure your expenses and mileage are up to date.`,
      cta: { text: 'review expenses →', href: '/expenses' },
      meta: { daysUntil, deadline: deadline.toISOString() },
    }
  },
}
