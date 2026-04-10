import type { StashWithCount } from '@/types'
import { unwrapApiResponse } from '@/lib/api-utils'

/**
 * Module-level cache for the user's stash list so multiple components
 * (e.g. QuickMoveButton instances on a table of finds) share a single
 * fetch. Cache lives for 30s; callers can force a refresh.
 */
type Listener = (stashes: StashWithCount[]) => void

let cache: StashWithCount[] | null = null
let pending: Promise<StashWithCount[]> | null = null
let cachedAt = 0
const TTL_MS = 30_000
const listeners = new Set<Listener>()

export function invalidateStashCache() {
  cache = null
  cachedAt = 0
}

export async function fetchStashesCached(force = false): Promise<StashWithCount[]> {
  const now = Date.now()
  if (!force && cache && now - cachedAt < TTL_MS) return cache
  if (pending) return pending

  pending = fetch('/api/stashes')
    .then((r) => r.json())
    .then((json) => {
      const data = unwrapApiResponse<StashWithCount[]>(json) ?? []
      cache = data
      cachedAt = Date.now()
      pending = null
      listeners.forEach((fn) => fn(data))
      return data
    })
    .catch(() => {
      pending = null
      return []
    })

  return pending
}

export function subscribeToStashCache(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn) as unknown as void
}
