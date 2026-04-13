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

function FindSummary({ find, role }: { find: DedupFindSummary; role: 'keeper' | 'duplicate' | null }) {
  const photo = find.photos?.[0]
  const marketplaces = find.selectedMarketplaces || []

  return (
    <div className={`flex-1 rounded border p-3 ${
      role === 'keeper' ? 'border-sage bg-sage-pale/30' :
      role === 'duplicate' ? 'border-red-dk/20 bg-red-lt/20' :
      'border-border'
    }`}>
      {role && (
        <div className={`text-[10px] font-medium uppercase mb-2 ${
          role === 'keeper' ? 'text-sage' : 'text-red-dk'
        }`}>
          {role === 'keeper' ? 'Keep' : 'Delete'}
        </div>
      )}
      <div className="flex gap-3">
        {photo ? (
          <img
            src={photo}
            alt={find.name}
            className="w-16 h-16 rounded object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded bg-cream-dk flex items-center justify-center text-ink-lt text-xs flex-shrink-0">
            No photo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink truncate">{find.name}</p>
          {find.brand && <p className="text-xs text-ink-lt mt-0.5">{find.brand}</p>}
          <div className="flex items-center gap-1.5 mt-1.5">
            {marketplaces.map(mp => (
              <MarketplaceIcon key={mp} platform={mp as Platform} size="sm" />
            ))}
            {find.status && (
              <Badge status={find.status as 'listed' | 'draft' | 'sold' | 'on_hold' | 'hidden'} />
            )}
          </div>
          {find.description && (
            <p className="text-xs text-ink-lt mt-1 line-clamp-2">{find.description}</p>
          )}
          <p className="text-[10px] text-ink-lt/60 mt-1">
            {find.photos?.length || 0} photo{(find.photos?.length || 0) !== 1 ? 's' : ''}
          </p>
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
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-ink-lt">
          {similarityPct}% title match
        </span>
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
      <div className="flex gap-3">
        <FindSummary find={keeper} role="keeper" />
        <div className="flex items-center text-ink-lt text-xs font-medium px-1">=</div>
        <FindSummary find={duplicate} role="duplicate" />
      </div>
    </div>
  )
}
