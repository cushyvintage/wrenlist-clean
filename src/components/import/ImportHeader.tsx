'use client'

import { useState, useEffect, useRef } from 'react'
import type { Platform } from '@/types'
import type { ListingStatus } from './types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

const PLATFORM_NAMES: Record<string, string> = {
  ebay: 'eBay',
  vinted: 'Vinted',
  etsy: 'Etsy',
  shopify: 'Shopify',
}

export type StatusFilter = 'all' | ListingStatus

interface ImportHeaderProps {
  platform: Platform
  selectedCount: number
  isImporting: boolean
  isFetching: boolean
  fetchedCount?: number
  onImport: () => void
  onBack: () => void
  /** Toggle: only show not-yet-imported */
  showOnlyNew: boolean
  onToggleShowOnlyNew: () => void
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: StatusFilter
  onStatusFilterChange: (filter: StatusFilter) => void
}

export function ImportHeader({
  platform,
  selectedCount,
  isImporting,
  isFetching,
  fetchedCount,
  onImport,
  onBack,
  showOnlyNew,
  onToggleShowOnlyNew,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: ImportHeaderProps) {
  const [confirming, setConfirming] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCountRef = useRef(selectedCount)

  // Reset confirm state when selection count actually changes
  useEffect(() => {
    if (prevCountRef.current !== selectedCount) {
      setConfirming(false)
      prevCountRef.current = selectedCount
    }
  }, [selectedCount])

  function handleImportClick() {
    if (confirming) {
      // Second click — execute import
      setConfirming(false)
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      onImport()
    } else {
      // First click — enter confirm state
      setConfirming(true)
      confirmTimer.current = setTimeout(() => setConfirming(false), 4000)
    }
  }

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-sm text-ink-lt hover:text-ink transition"
          >
            ← back
          </button>
          <MarketplaceIcon platform={platform} size="lg" />
          <div>
            <h1 className="text-lg font-serif italic text-ink">
              import from {PLATFORM_NAMES[platform] || platform}
            </h1>
            {isFetching && fetchedCount !== undefined && (
              <span className="text-xs text-sage animate-pulse">
                Fetching... ({fetchedCount} synced)
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleImportClick}
          disabled={selectedCount === 0 || isImporting}
          className={`px-4 py-2 text-sm font-medium rounded transition ${
            confirming
              ? 'bg-amber-600 text-white hover:bg-amber-700'
              : selectedCount > 0 && !isImporting
                ? 'bg-sage text-white hover:bg-sage-dk'
                : 'bg-cream-dk text-ink-lt cursor-not-allowed'
          }`}
        >
          {isImporting
            ? 'Importing...'
            : confirming
              ? `Confirm import ${selectedCount}?`
              : `Import ${selectedCount} listing${selectedCount !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-4 flex-wrap">
        <input
          type="text"
          placeholder="Search a listing"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="text-sm px-3 py-2 bg-cream-md border border-sage/14 rounded outline-none text-ink placeholder:text-ink-lt w-56"
        />

        {/* Status filter pills */}
        <div className="flex items-center gap-1">
          {([['all', 'All'], ['active', 'Active'], ['draft', 'Draft']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => onStatusFilterChange(value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                statusFilter === value
                  ? 'bg-sage text-white'
                  : 'bg-cream-md text-ink-lt hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showOnlyNew}
            onChange={onToggleShowOnlyNew}
            className="w-4 h-4 accent-sage"
          />
          <span className="text-sm text-ink-lt">Only show listings not yet imported</span>
        </label>
      </div>
    </div>
  )
}
