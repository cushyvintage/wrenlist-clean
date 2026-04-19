'use client'

import { useEffect, useCallback, useState } from 'react'
import { useApiCall } from '@/hooks/useApiCall'
import { fetchApi } from '@/lib/api-utils'
import { DedupPairCard } from '@/components/dedup/DedupPairCard'
import { selectKeeper } from '@/lib/dedup-keeper'
import { useConfirm } from '@/components/wren/ConfirmProvider'
import type { DedupCandidate } from '@/types'

/**
 * High-confidence pairs are eligible for one-click bulk merge. We keep the
 * threshold high (≥0.95) because the bulk action is irreversible: the loser
 * find is deleted, its PMD rows reassigned. Anything below 0.95 still
 * requires the per-card decision.
 */
const BULK_MERGE_THRESHOLD = 0.95

interface CandidatesResponse {
  candidates: DedupCandidate[]
  count: number
}

export default function DuplicatesPage() {
  const { data, isLoading, error, call, setData } = useApiCall<CandidatesResponse>(null)
  const [resolved, setResolved] = useState(0)
  const [bulkMerging, setBulkMerging] = useState(false)
  const confirm = useConfirm()

  const loadCandidates = useCallback(() => {
    // Threshold lives on the server (default 0.55). Don't pin it here —
    // anything lower brings back visually-unrelated pairs like
    // "Ceramic Basket" vs "Ceramic Bowl".
    call(() => fetchApi<CandidatesResponse>('/api/dedup/candidates?limit=30'))
  }, [call])

  useEffect(() => { loadCandidates() }, [loadCandidates])

  const candidates = data?.candidates ?? []
  const totalFound = (data?.count ?? 0) + resolved
  const [actionError, setActionError] = useState<string | null>(null)

  const highConfidencePairs = candidates.filter((c) => c.similarityScore >= BULK_MERGE_THRESHOLD)

  const handleMerge = async (keeperId: string, duplicateId: string) => {
    setActionError(null)
    try {
      await fetchApi('/api/dedup/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keeperId, duplicateId }),
      })
      if (data) {
        setData({
          ...data,
          candidates: data.candidates.filter(
            c => c.findA.id !== duplicateId && c.findB.id !== duplicateId
          ),
          count: data.count - 1,
        })
        setResolved(r => r + 1)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Merge failed')
    }
  }

  const handleBulkMerge = async () => {
    if (highConfidencePairs.length === 0) return
    const ok = await confirm({
      title: `Merge ${highConfidencePairs.length} high-confidence duplicate${highConfidencePairs.length === 1 ? '' : 's'}?`,
      message:
        'For each pair, Wrenlist keeps the find with richer data (more photos, description, brand) and deletes the other. PMD listings on the deleted find move to the keeper. This cannot be undone.',
      confirmLabel: 'Merge all',
      tone: 'danger',
    })
    if (!ok) return

    setActionError(null)
    setBulkMerging(true)
    try {
      const pairs = highConfidencePairs.map((c) => {
        const { keeper, duplicate } = selectKeeper(c.findA, c.findB)
        return { keeperId: keeper.id, duplicateId: duplicate.id }
      })
      const res = await fetchApi<{ merged: number; skipped: number; failed: number }>(
        '/api/dedup/bulk-merge',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairs }),
        },
      )
      const mergedIds = new Set(pairs.map((p) => p.duplicateId))
      if (data) {
        setData({
          ...data,
          candidates: data.candidates.filter(
            (c) => !mergedIds.has(c.findA.id) && !mergedIds.has(c.findB.id),
          ),
          count: Math.max(0, data.count - res.merged),
        })
        setResolved((r) => r + res.merged)
      }
      if (res.failed > 0) {
        setActionError(
          `${res.merged} merged, ${res.failed} failed${res.skipped > 0 ? `, ${res.skipped} skipped` : ''}.`,
        )
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Bulk merge failed')
    } finally {
      setBulkMerging(false)
    }
  }

  const handleDismiss = async (findIdA: string, findIdB: string) => {
    setActionError(null)
    try {
      await fetchApi('/api/dedup/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findIdA, findIdB }),
      })
      if (data) {
        setData({
          ...data,
          candidates: data.candidates.filter(
            c => !(
              (c.findA.id === findIdA && c.findB.id === findIdB) ||
              (c.findA.id === findIdB && c.findB.id === findIdA)
            )
          ),
          count: data.count - 1,
        })
        setResolved(r => r + 1)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Dismiss failed')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink-lt">
        Same item imported from different marketplaces? Review and merge duplicates.
      </p>

      {(error || actionError) && (
        <div className="bg-red-lt border border-red-dk/20 rounded-lg p-3 text-sm text-red-dk">{error || actionError}</div>
      )}

      {isLoading && (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-cream-dk/50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && candidates.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="text-3xl mb-2">&#10003;</div>
          <p className="text-ink font-medium text-sm">All clear</p>
          <p className="text-ink-lt/60 text-xs mt-1">
            No potential duplicates found across your marketplaces.
          </p>
        </div>
      )}

      {!isLoading && candidates.length > 0 && (
        <>
          {/* Progress bar + bulk action */}
          <div className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-center justify-between mb-2 gap-3">
              <span className="text-xs font-medium text-ink">
                {resolved > 0 ? `${resolved} resolved` : `${candidates.length} pair${candidates.length !== 1 ? 's' : ''} to review`}
              </span>
              <div className="flex items-center gap-3">
                {resolved > 0 && (
                  <span className="text-[10px] text-ink-lt">
                    {candidates.length} remaining
                  </span>
                )}
                {highConfidencePairs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkMerge}
                    disabled={bulkMerging}
                    className="text-[11px] px-2.5 py-1 rounded border border-sage text-sage hover:bg-sage/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkMerging
                      ? 'Merging...'
                      : `Merge ${highConfidencePairs.length} high-confidence (≥${Math.round(BULK_MERGE_THRESHOLD * 100)}%)`}
                  </button>
                )}
              </div>
            </div>
            <div className="w-full h-1.5 bg-sage/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage rounded-full transition-all duration-500 ease-out"
                style={{ width: totalFound > 0 ? `${(resolved / totalFound) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {candidates.map((candidate) => (
              <DedupPairCard
                key={`${candidate.findA.id}-${candidate.findB.id}`}
                candidate={candidate}
                onMerge={handleMerge}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
