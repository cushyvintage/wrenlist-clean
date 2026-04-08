'use client'

import { useEffect, useRef, useState } from 'react'
import type { Platform } from '@/types'
import { fetchApi } from '@/lib/api-utils'

export type PublishStep = 'saving' | 'uploading' | 'publishing' | 'polling' | 'done'

export interface MarketplaceStatus {
  marketplace: Platform
  status: 'waiting' | 'queued' | 'listed' | 'draft' | 'error'
  error?: string
  listingUrl?: string
}

export interface PublishProgress {
  step: PublishStep
  findId?: string
  photoCount: number
  photosUploaded: number
  marketplaces: MarketplaceStatus[]
}

interface Props {
  progress: PublishProgress
  onClose: () => void
  onRetry?: (marketplace: Platform) => void
}

const STEP_LABELS: Record<PublishStep, string> = {
  saving: 'Saving product',
  uploading: 'Uploading photos',
  publishing: 'Publishing to marketplaces',
  polling: 'Waiting for listings to go live',
  done: 'Complete',
}

function StepIndicator({ label, status }: { label: string; status: 'done' | 'active' | 'pending' }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
        ${status === 'done' ? 'bg-green-100 text-green-700' : ''}
        ${status === 'active' ? 'bg-sage/20 text-sage animate-pulse' : ''}
        ${status === 'pending' ? 'bg-gray-100 text-gray-400' : ''}
      `}>
        {status === 'done' ? '✓' : status === 'active' ? '◌' : '○'}
      </div>
      <span className={`text-sm ${status === 'active' ? 'font-medium text-sage-dark' : status === 'done' ? 'text-green-700' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}

function MarketplaceRow({ ms, onRetry }: { ms: MarketplaceStatus; onRetry?: () => void }) {
  const platformLabels: Record<string, string> = {
    ebay: 'eBay UK', vinted: 'Vinted', etsy: 'Etsy', depop: 'Depop',
    shopify: 'Shopify', facebook: 'Facebook', poshmark: 'Poshmark',
    mercari: 'Mercari', whatnot: 'Whatnot', grailed: 'Grailed',
  }
  const label = platformLabels[ms.marketplace] || ms.marketplace

  return (
    <div className="flex items-center justify-between py-1.5 pl-9">
      <div className="flex items-center gap-2">
        <span className={`text-xs ${
          ms.status === 'listed' ? 'text-green-600' :
          ms.status === 'draft' ? 'text-amber-600' :
          ms.status === 'error' ? 'text-red-600' :
          ms.status === 'queued' ? 'text-sage' :
          'text-gray-400'
        }`}>
          {ms.status === 'listed' ? '✓' :
           ms.status === 'draft' ? '✓' :
           ms.status === 'error' ? '✗' :
           ms.status === 'queued' ? '◌' : '○'}
        </span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {ms.status === 'listed' && (
          <span className="text-xs text-green-600 font-medium">Listed</span>
        )}
        {ms.status === 'draft' && (
          <span className="text-xs text-amber-600 font-medium">Draft</span>
        )}
        {ms.status === 'queued' && (
          <span className="text-xs text-sage animate-pulse">Extension publishing...</span>
        )}
        {ms.status === 'error' && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-500 max-w-[150px] truncate">{ms.error || 'Failed'}</span>
            {onRetry && (
              <button onClick={onRetry} className="text-xs text-sage underline hover:text-sage-dark">
                Retry
              </button>
            )}
          </div>
        )}
        {ms.status === 'waiting' && (
          <span className="text-xs text-gray-400">Waiting</span>
        )}
      </div>
    </div>
  )
}

export default function PublishProgressPanel({ progress, onClose, onRetry }: Props) {
  const [polledStatuses, setPolledStatuses] = useState<MarketplaceStatus[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stepOrder: PublishStep[] = ['saving', 'uploading', 'publishing', 'polling', 'done']
  const currentIdx = stepOrder.indexOf(progress.step)

  // Merge initial marketplace statuses with polled updates
  const displayStatuses = progress.marketplaces.map(ms => {
    const polled = polledStatuses.find(p => p.marketplace === ms.marketplace)
    return polled || ms
  })

  const allResolved = displayStatuses.every(ms =>
    ms.status === 'listed' || ms.status === 'draft' || ms.status === 'error'
  )
  const hasErrors = displayStatuses.some(ms => ms.status === 'error')
  const isComplete = progress.step === 'done' || (progress.step === 'polling' && allResolved)

  // Poll PMD for status updates when in polling state
  useEffect(() => {
    if ((progress.step !== 'polling' && progress.step !== 'done') || !progress.findId) return
    if (allResolved) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/finds/${progress.findId}`)
        if (!res.ok) return
        const data = await res.json()
        const pmdList = data?.data?.marketplace_data || []
        const updated: MarketplaceStatus[] = progress.marketplaces.map(ms => {
          const pmd = pmdList.find((p: { marketplace: string }) => p.marketplace === ms.marketplace)
          if (!pmd) return ms
          return {
            marketplace: ms.marketplace,
            status: pmd.status === 'listed' ? 'listed' as const
              : pmd.status === 'draft' ? 'draft' as const
              : pmd.status === 'error' ? 'error' as const
              : 'queued' as const,
            error: pmd.error_message || undefined,
            listingUrl: pmd.platform_listing_url || undefined,
          }
        })
        setPolledStatuses(updated)
      } catch {
        // Ignore poll errors
      }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [progress.step, progress.findId, allResolved, progress.marketplaces])

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-sage-dark mb-4">
          {isComplete ? (hasErrors ? 'Published with errors' : 'Published successfully') : 'Publishing...'}
        </h3>

        <div className="space-y-3 mb-4">
          {/* Step 1: Save */}
          <StepIndicator
            label="Product saved"
            status={currentIdx > 0 ? 'done' : currentIdx === 0 ? 'active' : 'pending'}
          />

          {/* Step 2: Photos */}
          {progress.photoCount > 0 && (
            <div>
              <StepIndicator
                label={`Uploading photos (${progress.photosUploaded}/${progress.photoCount})`}
                status={currentIdx > 1 ? 'done' : currentIdx === 1 ? 'active' : 'pending'}
              />
              {progress.step === 'uploading' && (
                <div className="ml-9 mt-1.5">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sage rounded-full transition-all duration-300"
                      style={{ width: `${progress.photoCount > 0 ? (progress.photosUploaded / progress.photoCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Marketplaces */}
          <StepIndicator
            label="Publishing to marketplaces"
            status={currentIdx >= 3 || isComplete ? 'done' : currentIdx === 2 ? 'active' : 'pending'}
          />

          {/* Per-marketplace status */}
          {(progress.step === 'publishing' || progress.step === 'polling' || progress.step === 'done') && (
            <div className="border-l-2 border-sage/10 ml-3">
              {displayStatuses.map(ms => (
                <MarketplaceRow
                  key={ms.marketplace}
                  ms={ms}
                  onRetry={ms.status === 'error' && onRetry ? () => onRetry(ms.marketplace) : undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Done button */}
        {isComplete && (
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg font-medium text-sm text-white bg-sage hover:bg-sage-dark transition-colors"
          >
            {hasErrors ? 'Close' : 'View in Finds'}
          </button>
        )}
      </div>
    </div>
  )
}
