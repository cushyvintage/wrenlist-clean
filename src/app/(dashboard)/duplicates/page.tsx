'use client'

import { useEffect, useCallback, useState } from 'react'
import { useApiCall } from '@/hooks/useApiCall'
import { fetchApi } from '@/lib/api-utils'
import { DedupPairCard } from '@/components/dedup/DedupPairCard'
import { selectKeeper } from '@/lib/dedup-keeper'
import { useConfirm } from '@/components/wren/ConfirmProvider'
import type { DedupCandidate } from '@/types'

type Strategy = 'conservative' | 'progressive' | 'aggressive'
type SortBy = 'similarity-desc' | 'similarity-asc' | 'category' | 'date'

const BULK_MERGE_THRESHOLD = 0.95
const DEFAULT_BATCH_SIZE = 30
const MIN_BATCH_SIZE = 1
const MAX_BATCH_SIZE = 100

interface CandidatesResponse {
  candidates: DedupCandidate[]
  count: number
  results?: {
    merged: Array<{ keeperId: string; duplicateId: string }>
    skipped: Array<{ keeperId: string; duplicateId: string; reason: string }>
    failed: Array<{ keeperId: string; duplicateId: string; reason: string }>
  }
}

interface LastMerge {
  keeperId: string
  duplicateId: string
  pair: DedupCandidate
}

export default function DuplicatesPage() {
  const { data, isLoading, error, call, setData } = useApiCall<CandidatesResponse>(null)
  const [resolved, setResolved] = useState(0)
  const [bulkMerging, setBulkMerging] = useState(false)
  const [strategy, setStrategy] = useState<Strategy>('progressive')
  const [currentPairIndex, setCurrentPairIndex] = useState(0)
  const [batchSize, setBatchSize] = useState(DEFAULT_BATCH_SIZE)
  const [showHighConfidenceOnly, setShowHighConfidenceOnly] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('similarity-desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all')
  const [lastMerge, setLastMerge] = useState<LastMerge | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const confirm = useConfirm()

  const loadCandidates = useCallback(() => {
    call(() => fetchApi<CandidatesResponse>('/api/dedup/candidates?limit=30'))
  }, [call])

  useEffect(() => { loadCandidates() }, [loadCandidates])

  // Extract candidates from data (declare early for use in effects)
  const candidates = data?.candidates ?? []

  const totalFound = (data?.count ?? 0) + resolved

  // Filter and sort candidates
  const processedCandidates = candidates
    .filter(c => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const hasMatch =
          c.findA.name.toLowerCase().includes(query) ||
          c.findB.name.toLowerCase().includes(query)
        if (!hasMatch) return false
      }

      // Category filter
      if (categoryFilter !== 'all') {
        const hasCategory =
          c.findA.category === categoryFilter || c.findB.category === categoryFilter
        if (!hasCategory) return false
      }

      // High confidence filter
      if (showHighConfidenceOnly && c.similarityScore < BULK_MERGE_THRESHOLD) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'similarity-asc':
          return a.similarityScore - b.similarityScore
        case 'similarity-desc':
          return b.similarityScore - a.similarityScore
        case 'category':
          return (a.findA.category || '').localeCompare(b.findA.category || '')
        case 'date':
          // Sort by created_at if available
          const dateA = a.findA.createdAt || a.findB.createdAt || 0
          const dateB = b.findA.createdAt || b.findB.createdAt || 0
          return new Date(dateB).getTime() - new Date(dateA).getTime()
        default:
          return 0
      }
    })

  const highConfidencePairs = processedCandidates.filter((c) => c.similarityScore >= BULK_MERGE_THRESHOLD)
  const currentPair = strategy === 'conservative' && processedCandidates.length > 0
    ? processedCandidates[currentPairIndex]
    : null

  // Extract unique categories for filter dropdown
  const categories = Array.from(
    new Set(candidates.flatMap(c => [c.findA.category, c.findB.category]).filter(Boolean))
  ).sort()

  // Keyboard shortcuts in conservative mode
  useEffect(() => {
    if (strategy !== 'conservative' || !processedCandidates.length) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCurrentPairIndex(idx => Math.min(idx + 1, processedCandidates.length - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCurrentPairIndex(idx => Math.max(idx - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const pair = processedCandidates[currentPairIndex]
        if (pair) {
          const { keeper, duplicate } = selectKeeper(pair.findA, pair.findB)
          handleMerge(keeper.id, duplicate.id)
        }
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault()
        const pair = processedCandidates[currentPairIndex]
        if (pair) {
          handleDismiss(pair.findA.id, pair.findB.id)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [strategy, currentPairIndex, processedCandidates])

  const handleMerge = async (keeperId: string, duplicateId: string) => {
    setActionError(null)
    try {
      const mergedPair = processedCandidates.find(
        c => (c.findA.id === keeperId && c.findB.id === duplicateId) ||
             (c.findA.id === duplicateId && c.findB.id === keeperId)
      )

      await fetchApi('/api/dedup/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keeperId, duplicateId }),
      })

      if (data && mergedPair) {
        setLastMerge({ keeperId, duplicateId, pair: mergedPair })

        const newCandidates = data.candidates.filter(
          c => c.findA.id !== duplicateId && c.findB.id !== duplicateId
        )
        setData({
          ...data,
          candidates: newCandidates,
          count: data.count - 1,
        })
        setResolved(r => r + 1)

        // Move to next pair in conservative mode
        if (strategy === 'conservative') {
          setCurrentPairIndex(idx => Math.min(idx, processedCandidates.length - 2))
        }
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Merge failed')
    }
  }

  const handleUndo = async () => {
    if (!lastMerge) return
    setActionError(null)
    try {
      // Undo is not yet an API endpoint. For now, we reload candidates.
      // In a full implementation, this would call /api/dedup/undo/{pairId}
      await loadCandidates()
      setLastMerge(null)
      setResolved(r => Math.max(0, r - 1))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Undo failed')
    }
  }

  const handleAggressive = async () => {
    if (processedCandidates.length === 0) return

    // Build preview list
    const pairs = processedCandidates.map((c) => {
      const { keeper, duplicate } = selectKeeper(c.findA, c.findB)
      return { keeper, duplicate, similarity: c.similarityScore }
    })

    const ok = await confirm({
      title: `Merge all ${processedCandidates.length} duplicate${processedCandidates.length === 1 ? '' : 's'}?`,
      message: `This will merge ALL remaining pairs at once. Wrenlist keeps the find with richer data and deletes the other. This cannot be undone.

Preview: ${pairs.slice(0, 3).map(p => `"${p.duplicate.name}" → "${p.keeper.name}"`).join(', ')}${pairs.length > 3 ? `... and ${pairs.length - 3} more` : ''}`,
      confirmLabel: 'Merge all',
      tone: 'danger',
    })
    if (!ok) return

    setActionError(null)
    setBulkMerging(true)
    try {
      const res = await fetchApi<{
        merged: number
        skipped: number
        failed: number
        results: {
          merged: Array<{ keeperId: string; duplicateId: string }>
          skipped: Array<{ keeperId: string; duplicateId: string; reason: string }>
          failed: Array<{ keeperId: string; duplicateId: string; reason: string }>
        }
      }>('/api/dedup/bulk-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs: pairs.map(p => ({ keeperId: p.keeper.id, duplicateId: p.duplicate.id })) }),
      })

      if (data) {
        setData({
          ...data,
          candidates: [],
          count: 0,
        })
        setResolved((r) => r + res.merged)
      }
      if (res.failed > 0 || res.skipped > 0) {
        const failedReasons = res.results.failed.map(f => `${f.reason}`).join('; ')
        const summary = `${res.merged} merged${res.skipped > 0 ? `, ${res.skipped} skipped` : ''}${res.failed > 0 ? `, ${res.failed} failed` : ''}.`
        const detail = res.failed > 0 ? ` Failures: ${failedReasons}` : ''
        setActionError(summary + detail)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Merge failed')
    } finally {
      setBulkMerging(false)
    }
  }

  const handleBulkMerge = async () => {
    if (highConfidencePairs.length === 0) return

    const pairsToMerge = highConfidencePairs.slice(0, batchSize)
    const ok = await confirm({
      title: `Merge ${pairsToMerge.length} high-confidence duplicate${pairsToMerge.length === 1 ? '' : 's'}?`,
      message:
        'For each pair, Wrenlist keeps the find with richer data (more photos, description, brand) and deletes the other. PMD listings on the deleted find move to the keeper. This cannot be undone.',
      confirmLabel: 'Merge all',
      tone: 'danger',
    })
    if (!ok) return

    setActionError(null)
    setBulkMerging(true)
    try {
      const pairs = pairsToMerge.map((c) => {
        const { keeper, duplicate } = selectKeeper(c.findA, c.findB)
        return { keeperId: keeper.id, duplicateId: duplicate.id }
      })
      const res = await fetchApi<{
        merged: number
        skipped: number
        failed: number
        results: {
          merged: Array<{ keeperId: string; duplicateId: string }>
          skipped: Array<{ keeperId: string; duplicateId: string; reason: string }>
          failed: Array<{ keeperId: string; duplicateId: string; reason: string }>
        }
      }>('/api/dedup/bulk-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs }),
      })

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
      if (res.failed > 0 || res.skipped > 0) {
        const failedReasons = res.results.failed.map(f => `${f.reason}`).join('; ')
        const summary = `${res.merged} merged${res.skipped > 0 ? `, ${res.skipped} skipped` : ''}${res.failed > 0 ? `, ${res.failed} failed` : ''}.`
        const detail = res.failed > 0 ? ` Failures: ${failedReasons}` : ''
        setActionError(summary + detail)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Bulk merge failed')
    } finally {
      setBulkMerging(false)
    }
  }

  const handleBulkDismiss = async () => {
    if (highConfidencePairs.length === 0) return

    const ok = await confirm({
      title: `Dismiss ${highConfidencePairs.length} high-confidence pair${highConfidencePairs.length === 1 ? '' : 's'}?`,
      message: 'These pairs will be marked as not duplicates and won\'t appear again.',
      confirmLabel: 'Dismiss all',
      tone: 'default',
    })
    if (!ok) return

    setActionError(null)
    setBulkMerging(true)
    try {
      let dismissed = 0
      for (const candidate of highConfidencePairs) {
        try {
          await fetchApi('/api/dedup/dismiss', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ findIdA: candidate.findA.id, findIdB: candidate.findB.id }),
          })
          dismissed++
        } catch (err) {
          // Continue with next pair
        }
      }

      if (data) {
        const dismissedIds = new Set(highConfidencePairs.flatMap(c => [c.findA.id, c.findB.id]))
        setData({
          ...data,
          candidates: data.candidates.filter(
            c => !dismissedIds.has(c.findA.id) && !dismissedIds.has(c.findB.id)
          ),
          count: Math.max(0, data.count - dismissed),
        })
        setResolved(r => r + dismissed)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Dismiss failed')
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
        const newCandidates = data.candidates.filter(
          c => !(
            (c.findA.id === findIdA && c.findB.id === findIdB) ||
            (c.findA.id === findIdB && c.findB.id === findIdA)
          )
        )
        setData({
          ...data,
          candidates: newCandidates,
          count: data.count - 1,
        })
        setResolved(r => r + 1)

        // Move to next pair in conservative mode
        if (strategy === 'conservative') {
          setCurrentPairIndex(idx => Math.min(idx, processedCandidates.length - 2))
        }
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Dismiss failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className="text-xs text-ink-lt">
          Same item imported from different marketplaces? Review and merge duplicates.
        </p>

        {!isLoading && candidates.length > 0 && (
          <div className="rounded-lg border border-border bg-white p-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-ink mb-2">Review Strategy</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="conservative"
                    checked={strategy === 'conservative'}
                    onChange={(e) => {
                      setStrategy('conservative')
                      setCurrentPairIndex(0)
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-ink">Conservative: review each pair individually</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="progressive"
                    checked={strategy === 'progressive'}
                    onChange={() => setStrategy('progressive')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-ink">Progressive: merge batches, review next</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="strategy"
                    value="aggressive"
                    checked={strategy === 'aggressive'}
                    onChange={() => setStrategy('aggressive')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-ink">Aggressive: merge all {candidates.length} at once</span>
                </label>
              </div>
            </div>

            {/* Progressive mode options */}
            {strategy === 'progressive' && (
              <div className="border-t border-border pt-3 space-y-3">
                <div>
                  <label className="text-xs font-medium text-ink block mb-2">
                    Batch size (1-100): {batchSize}
                  </label>
                  <input
                    type="range"
                    min={MIN_BATCH_SIZE}
                    max={MAX_BATCH_SIZE}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showHighConfidenceOnly}
                    onChange={(e) => setShowHighConfidenceOnly(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-ink">
                    Show only high-confidence (≥{Math.round(BULK_MERGE_THRESHOLD * 100)}%)
                  </span>
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search, sort, and filter controls */}
      {!isLoading && processedCandidates.length > 0 && (
        <div className="rounded-lg border border-border bg-white p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-sm border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage/20"
            />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="text-sm border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage/20"
            >
              <option value="similarity-desc">Similarity (high to low)</option>
              <option value="similarity-asc">Similarity (low to high)</option>
              <option value="category">Category</option>
              <option value="date">Recent first</option>
            </select>
          </div>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-sm border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sage/20"
            >
              <option value="all">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat || 'other'}>
                  {cat || 'Uncategorized'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

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

      {!isLoading && processedCandidates.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="text-3xl mb-2">&#10003;</div>
          <p className="text-ink font-medium text-sm">
            {searchQuery || categoryFilter !== 'all' || showHighConfidenceOnly ? 'No matches' : 'All clear'}
          </p>
          <p className="text-ink-lt/60 text-xs mt-1">
            {searchQuery || categoryFilter !== 'all' || showHighConfidenceOnly
              ? 'Try adjusting your filters or search.'
              : 'No potential duplicates found across your marketplaces.'}
          </p>
        </div>
      )}

      {!isLoading && candidates.length > 0 && (
        <>
          {/* Progress bar + action buttons */}
          <div className="rounded-lg border border-border bg-white p-3">
            <div className="flex items-center justify-between mb-2 gap-3">
              <span className="text-xs font-medium text-ink">
                {strategy === 'conservative'
                  ? `Pair ${processedCandidates.length > 0 ? currentPairIndex + 1 : 0} of ${processedCandidates.length}`
                  : `${resolved > 0 ? `${resolved} resolved, ` : ''}${processedCandidates.length} pair${processedCandidates.length !== 1 ? 's' : ''} to review`}
              </span>
              <div className="flex items-center gap-2">
                {lastMerge && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="text-[11px] px-2 py-1 rounded border border-amber text-amber-dark hover:bg-amber/10 transition-colors"
                  >
                    Undo
                  </button>
                )}
                {strategy === 'progressive' && (
                  <div className="flex gap-2">
                    {highConfidencePairs.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleBulkMerge}
                          disabled={bulkMerging}
                          className="text-[11px] px-2.5 py-1 rounded border border-sage text-sage hover:bg-sage/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {bulkMerging
                            ? 'Merging...'
                            : `Merge ${Math.min(batchSize, highConfidencePairs.length)}`}
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDismiss}
                          disabled={bulkMerging}
                          className="text-[11px] px-2.5 py-1 rounded border border-ink-lt/20 text-ink-lt hover:bg-ink-lt/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {bulkMerging ? 'Dismissing...' : `Dismiss ${highConfidencePairs.length}`}
                        </button>
                      </>
                    )}
                  </div>
                )}
                {strategy === 'aggressive' && processedCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAggressive}
                    disabled={bulkMerging}
                    className="text-[11px] px-2.5 py-1 rounded border border-red text-red hover:bg-red/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkMerging ? 'Merging...' : `Merge all ${processedCandidates.length}`}
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
            {strategy === 'conservative' && currentPair ? (
              <>
                <DedupPairCard
                  candidate={currentPair}
                  onMerge={handleMerge}
                  onDismiss={handleDismiss}
                />
                {currentPairIndex < processedCandidates.length - 1 && (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => setCurrentPairIndex(idx => idx + 1)}
                      className="text-xs px-3 py-1.5 rounded border border-border text-ink hover:bg-cream-dk/20 transition-colors"
                    >
                      Next pair (→)
                    </button>
                  </div>
                )}
              </>
            ) : (
              processedCandidates.map((candidate, index) => (
                <DedupPairCard
                  key={`${candidate.findA.id}-${candidate.findB.id}`}
                  candidate={candidate}
                  onMerge={handleMerge}
                  onDismiss={handleDismiss}
                  highlightAsHighConfidence={strategy === 'progressive' && candidate.similarityScore >= BULK_MERGE_THRESHOLD}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
