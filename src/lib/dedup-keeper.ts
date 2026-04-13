import type { DedupFindSummary } from '@/types'

/**
 * Determine which find should be the "keeper" (richer data).
 * The other becomes the duplicate to be deleted after merge.
 *
 * Scoring: +2 description, +1 per photo, +1 brand
 * Tie-break: older created_at wins (original import)
 */
export function selectKeeper(
  findA: DedupFindSummary,
  findB: DedupFindSummary
): { keeper: DedupFindSummary; duplicate: DedupFindSummary } {
  const scoreA = computeScore(findA)
  const scoreB = computeScore(findB)

  if (scoreA > scoreB) return { keeper: findA, duplicate: findB }
  if (scoreB > scoreA) return { keeper: findB, duplicate: findA }

  // Tie-break: older find is the keeper (imported first)
  const dateA = findA.createdAt ? new Date(findA.createdAt).getTime() : Infinity
  const dateB = findB.createdAt ? new Date(findB.createdAt).getTime() : Infinity
  return dateA <= dateB
    ? { keeper: findA, duplicate: findB }
    : { keeper: findB, duplicate: findA }
}

function computeScore(find: DedupFindSummary): number {
  let score = 0
  if (find.description) score += 2
  score += (find.photos?.length || 0)
  if (find.brand) score += 1
  return score
}
