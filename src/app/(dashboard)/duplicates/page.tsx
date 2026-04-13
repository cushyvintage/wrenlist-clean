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

  const loadCandidates = useCallback(() => {
    call(() => fetchApi<CandidatesResponse>('/api/dedup/candidates?threshold=0.35&limit=30'))
  }, [call])

  useEffect(() => { loadCandidates() }, [loadCandidates])

  const candidates = data?.candidates ?? []
  const [actionError, setActionError] = useState<string | null>(null)

  const handleMerge = async (keeperId: string, duplicateId: string) => {
    setActionError(null)
    try {
      await fetchApi('/api/dedup/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keeperId, duplicateId }),
      })
      // Only remove from list on success
      if (data) {
        setData({
          ...data,
          candidates: data.candidates.filter(
            c => c.findA.id !== duplicateId && c.findB.id !== duplicateId
          ),
          count: data.count - 1,
        })
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
      // Only remove from list on success
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
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Dismiss failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs text-ink-lt">
            Same item imported from different marketplaces? Review and merge duplicates.
          </p>
        </div>
        {candidates.length > 0 && (
          <span className="text-xs font-medium text-ink-lt bg-cream-dk px-2 py-1 rounded">
            {candidates.length} pair{candidates.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {(error || actionError) && (
        <div className="bg-red-lt border border-red-dk/20 rounded p-3 text-sm text-red-dk">{error || actionError}</div>
      )}

      {isLoading && <div className="text-center py-8 text-ink-lt">Scanning for duplicates...</div>}

      {!isLoading && candidates.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-ink-lt text-sm">No potential duplicates found.</p>
          <p className="text-ink-lt/60 text-xs mt-1">
            Duplicates are detected when the same item is imported from different marketplaces with similar titles.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {candidates.map((candidate, i) => (
          <DedupPairCard
            key={`${candidate.findA.id}-${candidate.findB.id}`}
            candidate={candidate}
            onMerge={handleMerge}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  )
}
