import type { Platform } from '@/types'
import { platformLabel } from '@/lib/platforms'

/** Statuses that block an item from being crosslisted to a platform */
export const CROSSLIST_BLOCKED_STATUSES = new Set(['listed', 'draft', 'needs_publish', 'needs_delist'])

/** Platforms that publish via API (not extension queue) */
export const API_PLATFORMS = new Set<Platform>(['ebay'])

/** Format a platform key for display: 'ebay' → 'eBay', 'facebook' → 'Facebook' */
export function formatPlatformName(platform: string): string {
  return platformLabel(platform)
}

interface PublishResult {
  ok: boolean
  error?: string
  listingUrl?: string
  alreadyListed?: boolean
}

export interface CrosslistOutcome {
  /** Whether anything succeeded */
  ok: boolean
  /** Human-readable summary */
  message: string
  /** Platforms that succeeded */
  succeeded: string[]
  /** Platforms that failed with errors */
  failed: string[]
  /** Platforms where session had expired */
  expired: Platform[]
}

export interface CrosslistOptions {
  /** ISO timestamp — if set, job is scheduled for this time instead of immediate */
  scheduled_for?: string
  /** What to do if extension is offline at scheduled time */
  stale_policy?: 'run_if_late' | 'skip_if_late'
}

/**
 * Publish a single find to multiple marketplaces via /api/crosslist/publish.
 * Handles session re-check, partial publish, and builds a human-readable result.
 */
export async function crosslistFind(
  findId: string,
  targets: Platform[],
  recheckPlatforms: (platforms: Platform[]) => Promise<{ valid: Platform[]; expired: Platform[] }>,
  options?: CrosslistOptions
): Promise<CrosslistOutcome> {
  // Pre-publish session re-check
  const { valid, expired } = await recheckPlatforms(targets)

  if (valid.length === 0) {
    return {
      ok: false,
      message: `Session expired for ${expired.map(formatPlatformName).join(', ')}. Log back in on Platform Connect.`,
      succeeded: [],
      failed: [],
      expired,
    }
  }

  const res = await fetch('/api/crosslist/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      findId,
      marketplaces: valid,
      // The Crosslist picker button literally says "Publish now" — match that
      // intent. Without this, Etsy listings end as drafts (state=3) because
      // the extension's publishMode defaults to "draft". Users expect their
      // listings to be live to buyers after clicking Publish.
      publishMode: 'publish',
      ...(options?.scheduled_for ? { scheduled_for: options.scheduled_for } : {}),
      ...(options?.stale_policy ? { stale_policy: options.stale_policy } : {}),
    }),
  })
  const data = await res.json()
  const results: Record<string, PublishResult> = data.data?.results || {}

  const succeeded = Object.entries(results).filter(([, r]) => r.ok).map(([m]) => m)
  const failed = Object.entries(results).filter(([, r]) => !r.ok).map(([m, r]) => `${m}: ${r.error}`)

  // Build message distinguishing direct-published vs queued vs scheduled
  const direct = succeeded.filter((m) => API_PLATFORMS.has(m as Platform))
  const queued = succeeded.filter((m) => !API_PLATFORMS.has(m as Platform))
  const parts: string[] = []
  if (direct.length > 0) parts.push(`Listed on ${direct.map(formatPlatformName).join(', ')}`)
  if (queued.length > 0 && options?.scheduled_for) {
    const time = new Date(options.scheduled_for).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    parts.push(`Scheduled for ${queued.map(formatPlatformName).join(', ')} at ${time}`)
  } else if (queued.length > 0) {
    parts.push(`Queued for ${queued.map(formatPlatformName).join(', ')} — publishing via extension`)
  }
  if (failed.length > 0) parts.push(`Failed: ${failed.join('; ')}`)
  if (expired.length > 0) parts.push(`${expired.map(formatPlatformName).join(', ')}: session expired`)

  const anySucceeded = succeeded.length > 0
  const anyFailed = failed.length > 0 || expired.length > 0

  return {
    ok: anySucceeded && !anyFailed,
    message: parts.join('. ') || 'No results',
    succeeded,
    failed,
    expired,
  }
}
