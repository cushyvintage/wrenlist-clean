'use client'

import { useEffect, useCallback, useState } from 'react'
import { useApiCall } from '@/hooks/useApiCall'
import { fetchApi } from '@/lib/api-utils'
import { DedupPairCard } from '@/components/dedup/DedupPairCard'
import type { DedupCandidate } from '@/types'

interface CandidatesResponse {
  candidates: DedupCandidate[]
  count: number
}

export default function DuplicatesPage() {
  const { data, isLoading, error, call, setData } = useApiCall<CandidatesResponse>(null)
  const [resolved, setResolved] = useState(0)

  const loadCandidates = useCallback(() => {
    call(() => fetchApi<CandidatesResponse>('/api/dedup/candidates?threshold=0.35&limit=30'))
  }, [call])

  useEffect(() => { loadCandidates() }, [loadCandidates])

  const candidates = data?.candidates ?? []
  const totalFound = (data?.count ?? 0) + resolved
  const [actionError, setActionError] = useState<string | null>(null)

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
          {/* Progress bar */}
          <div className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-ink">
                {resolved > 0 ? `${resolved} resolved` : `${candidates.length} pair${candidates.length !== 1 ? 's' : ''} to review`}
              </span>
              {resolved > 0 && (
                <span className="text-[10px] text-ink-lt">
                  {candidates.length} remaining
                </span>
              )}
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
