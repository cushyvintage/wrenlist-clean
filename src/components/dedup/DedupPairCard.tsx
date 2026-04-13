'use client'

import { useState } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { Badge } from '@/components/wren/Badge'
import { Button } from '@/components/wren/Button'
import { useConfirm } from '@/components/wren/ConfirmProvider'
import { selectKeeper } from '@/lib/dedup-keeper'
import type { DedupCandidate, DedupFindSummary, Platform } from '@/types'

interface DedupPairCardProps {
  candidate: DedupCandidate
  onMerge: (keeperId: string, duplicateId: string) => Promise<void>
  onDismiss: (findIdA: string, findIdB: string) => Promise<void>
}

function FindSummary({ find, role }: { find: DedupFindSummary; role: 'keeper' | 'duplicate' }) {
  const photo = find.photos?.[0]
  const marketplaces = find.selectedMarketplaces || []

  return (
    <div className={`flex-1 min-w-0 rounded-lg p-3 ${
      role === 'keeper' ? 'bg-sage/5 border border-sage/15' : 'bg-cream-dk/30 border border-border'
    }`}>
      <div className="flex gap-3">
        {photo ? (
          <img
            src={photo}
            alt={find.name}
            className="w-14 h-14 rounded-md object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-cream-dk flex items-center justify-center text-ink-lt text-[10px] flex-shrink-0">
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink truncate leading-tight">{find.name}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {marketplaces.map(mp => (
              <MarketplaceIcon key={mp} platform={mp as Platform} size="sm" />
            ))}
            {find.status && (
              <Badge status={find.status as 'listed' | 'draft' | 'sold' | 'on_hold' | 'hidden'} />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {find.brand && <span className="text-[11px] text-ink-lt">{find.brand}</span>}
            <span className="text-[10px] text-ink-lt/50">
              {find.photos?.length || 0} photo{(find.photos?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DedupPairCard({ candidate, onMerge, onDismiss }: DedupPairCardProps) {
  const confirm = useConfirm()
  const [merging, setMerging] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const { keeper, duplicate } = selectKeeper(candidate.findA, candidate.findB)
  const similarityPct = Math.round(candidate.similarityScore * 100)

  const handleMerge = async () => {
    const ok = await confirm({
      title: 'Merge duplicates?',
      message: `"${keeper.name}" will be kept. "${duplicate.name}" will be deleted and its marketplace listings will be moved to the keeper.`,
      confirmLabel: 'Merge',
      tone: 'danger',
    })
    if (!ok) return

    setMerging(true)
    try {
      await onMerge(keeper.id, duplicate.id)
    } finally {
      setMerging(false)
    }
  }

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await onDismiss(candidate.findA.id, candidate.findB.id)
    } finally {
      setDismissing(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-white p-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
            similarityPct === 100
              ? 'bg-sage/10 text-sage'
              : 'bg-amber/10 text-amber-dark'
          }`}>
            {similarityPct}% match
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDismiss}
            disabled={dismissing || merging}
          >
            {dismissing ? 'Dismissing...' : 'Not a duplicate'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleMerge}
            disabled={merging || dismissing}
          >
            {merging ? 'Merging...' : 'Merge'}
          </Button>
        </div>
      </div>

      {/* Side by side comparison */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-stretch">
        <FindSummary find={keeper} role="keeper" />
        <div className="flex flex-col items-center justify-center px-1">
          <div className="w-6 h-6 rounded-full bg-cream-dk flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-ink-lt">
              <path d="M1 6h4M7 6h4M4 3l3 3-3 3M8 3l-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <FindSummary find={duplicate} role="duplicate" />
      </div>
    </div>
  )
}
