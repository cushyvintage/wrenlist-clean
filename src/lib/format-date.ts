/**
 * Date formatting helpers — single source of truth so the app doesn't
 * mix "today / 2d ago / 6 Apr 26 / 13/09/2025 / Sep 19, 2025" on the same
 * screen. Use `relativeDate` for activity timestamps and `formatDate` for
 * absolute dates (e.g. invoice rows). Both use UK conventions (en-GB).
 */

const SHORT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}

/** Absolute date — "18 Apr 2026". Returns "—" for null/empty. */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', SHORT_DATE_OPTS)
}

/**
 * Relative date for recent activity, falls back to absolute beyond 7 days.
 * Examples: "today", "1d ago", "5d ago", "12 Apr 2026".
 *
 * Always returns a four-digit year — "13/09/2025" / "Apr 25" formats are
 * banned because they're either ambiguous (DD/MM vs MM/DD) or undated
 * (which year is "Apr"?).
 */
export function relativeDate(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return '—'

  const diffMs = Date.now() - d.getTime()
  const dayMs = 86_400_000
  const days = Math.floor(diffMs / dayMs)

  if (days < 0) return formatDate(d)         // future date
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return formatDate(d)
}
