'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/wren/Badge'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { formatPlatformName } from '@/lib/crosslist'
import type { Find, Platform } from '@/types'

interface MarketplaceDataItem {
  marketplace: string
  status: string
  platform_listing_url: string | null
  platform_listing_id: string | null
  error_message: string | null
}

interface InventoryItemHeaderProps {
  find: Find
  isEditing: boolean
  isSyncing: boolean
  isCrosslisting?: boolean
  showCrosslistPicker?: boolean
  crosslistTargets?: Platform[]
  availableForCrosslist?: Platform[]
  platformUsernames?: Map<Platform, string | undefined>
  /**
   * Platforms that are connected at the DB level but currently lack a
   * live extension session (cookie missing on this device). Render these
   * disabled, with a "Log in to <Platform> to publish" chip — the same
   * pattern we use for the extension-not-installed warnings.
   */
  needsLoginPlatforms?: Set<Platform>
  extensionDetected?: boolean | null
  /** True when installed but below MIN_EXTENSION_VERSION */
  extensionOutdated?: boolean
  extensionOnline?: boolean | null
  marketplaceData?: MarketplaceDataItem[]
  onMarkAsSoldClick: () => void
  onEditClick: () => void
  onSyncClick: () => Promise<void>
  onAIListingClick?: () => void
  onListOnVintedClick: () => void
  onListOnEbayClick: () => void
  onDelistVintedClick?: () => Promise<void>
  onRelistVintedClick?: () => Promise<void>
  onCrosslistClick?: () => void
  onCrosslistTargetToggle?: (platform: Platform) => void
  onCrosslistConfirm?: (scheduledFor?: string, stalePolicy?: 'run_if_late' | 'skip_if_late') => void
  onCrosslistCancel?: () => void
}

export default function InventoryItemHeader({
  find,
  isEditing,
  isSyncing,
  isCrosslisting = false,
  showCrosslistPicker = false,
  crosslistTargets = [],
  availableForCrosslist = [],
  platformUsernames,
  needsLoginPlatforms,
  extensionDetected,
  extensionOutdated = false,
  extensionOnline,
  marketplaceData = [],
  onMarkAsSoldClick,
  onEditClick,
  onSyncClick,
  onAIListingClick,
  onListOnVintedClick,
  onListOnEbayClick,
  onDelistVintedClick,
  onRelistVintedClick,
  onCrosslistClick,
  onCrosslistTargetToggle,
  onCrosslistConfirm,
  onCrosslistCancel,
}: InventoryItemHeaderProps) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledFor, setScheduledFor] = useState('')
  const [stalePolicy, setStalePolicy] = useState<'run_if_late' | 'skip_if_late'>('run_if_late')

  // Reset schedule state when picker closes
  useEffect(() => {
    if (!showCrosslistPicker) {
      setShowSchedule(false)
      setScheduledFor('')
      setStalePolicy('run_if_late')
    }
  }, [showCrosslistPicker])

  const vintedData = marketplaceData.find((m) => m.marketplace === 'vinted')
  const vintedIsListed = vintedData?.status === 'listed'
  const vintedNeedsDelist = vintedData?.status === 'needs_delist' || vintedData?.status === 'delisted'

  return (
    <div
      className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-medium sm:text-2xl" style={{ color: '#1E2E1C' }}>
          {find.name}
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 relative">
        <Badge status={find.status as 'draft' | 'listed' | 'on_hold' | 'sold'} />
        {!isEditing && (
          <button
            onClick={onSyncClick}
            disabled={isSyncing}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50"
            title="Sync eBay orders"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.22)',
              backgroundColor: 'transparent',
              color: '#3D5C3A',
            }}
            onMouseEnter={(e) => !isSyncing && (e.currentTarget.style.backgroundColor = '#EDE8DE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {isSyncing ? '↻ Syncing...' : '↻ Sync'}
          </button>
        )}
        {!isEditing && onAIListingClick && (
          <button
            onClick={onAIListingClick}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
            title="Generate listing copy with Wren AI"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.22)',
              backgroundColor: 'transparent',
              color: '#3D5C3A',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE8DE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ✨ Wren AI
          </button>
        )}
        {!isEditing && find.status === 'listed' && (
          <button
            onClick={onMarkAsSoldClick}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.22)',
              backgroundColor: 'transparent',
              color: '#3D5C3A',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FED8B1')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Mark as Sold
          </button>
        )}
        {/* Crosslist button — replaces individual per-platform buttons */}
        {!isEditing && find.status !== 'sold' && availableForCrosslist.length > 0 ? (
          <button
            onClick={onCrosslistClick}
            disabled={isCrosslisting}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.3)',
              backgroundColor: '#3D5C3A',
              color: '#F5F0E8',
            }}
            onMouseEnter={(e) => !isCrosslisting && (e.currentTarget.style.backgroundColor = '#2C4428')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3D5C3A')}
          >
            {isCrosslisting ? '⏳ Publishing...' : '↗ Crosslist'}
          </button>
        ) : !isEditing && find.status !== 'sold' && availableForCrosslist.length === 0 && marketplaceData.length > 0 ? (
          <span className="text-xs" style={{ color: '#8A9E88' }}>Listed on all platforms</span>
        ) : null}
        {/* Pause Vinted button */}
        {!isEditing && find.status === 'listed' && vintedIsListed && (
          <button
            onClick={onDelistVintedClick}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(0,102,153,.3)',
              backgroundColor: 'transparent',
              color: '#006699',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,102,153,.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ⏸ Pause Vinted
          </button>
        )}

        {/* Relist Vinted button */}
        {!isEditing && find.status === 'listed' && vintedNeedsDelist && (
          <button
            onClick={onRelistVintedClick}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(0,102,153,.3)',
              backgroundColor: 'transparent',
              color: '#006699',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,102,153,.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            ▶ Relist on Vinted
          </button>
        )}

        {/* Crosslist picker dropdown */}
        {showCrosslistPicker && (
          <div
            className="absolute top-full right-0 mt-2 p-3 rounded shadow-lg z-50 min-w-[200px]"
            style={{ backgroundColor: '#F5F0E8', borderWidth: '1px', borderColor: 'rgba(61,92,58,.22)' }}
          >
            <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: '#8A9E88' }}>
              Publish to
            </p>
            {availableForCrosslist.map((platform) => {
              const isSelected = crosslistTargets.includes(platform)
              const username = platformUsernames?.get(platform)
              const needsLogin = needsLoginPlatforms?.has(platform) ?? false
              return (
                <label
                  key={platform}
                  className={`flex items-center gap-2 py-1.5 ${needsLogin ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected && !needsLogin}
                    onChange={() => !needsLogin && onCrosslistTargetToggle?.(platform)}
                    disabled={needsLogin}
                    className="rounded disabled:cursor-not-allowed"
                  />
                  <MarketplaceIcon platform={platform} size="sm" />
                  <span
                    className="text-sm font-medium"
                    style={{ color: needsLogin ? '#8A9E88' : '#1E2E1C' }}
                  >
                    {formatPlatformName(platform)}
                    {username && (
                      <span className="font-normal ml-1" style={{ color: '#8A9E88' }}>· {username}</span>
                    )}
                  </span>
                  {needsLogin && (
                    <span
                      className="ml-auto text-[11px] font-medium"
                      style={{ color: '#92700C' }}
                      title={`Log in to ${formatPlatformName(platform)} in Chrome so the extension can publish on your behalf.`}
                    >
                      log in to publish
                    </span>
                  )}
                </label>
              )
            })}
            {needsLoginPlatforms && needsLoginPlatforms.size > 0 && (
              <div
                className="mt-2 px-2.5 py-2 rounded text-xs"
                style={{ backgroundColor: 'rgba(217,169,56,.12)', border: '1px solid rgba(217,169,56,.3)', color: '#92700C' }}
              >
                <span className="font-medium">Log in required</span>
                {' — '}
                Open {Array.from(needsLoginPlatforms).map(formatPlatformName).join(', ')} in Chrome and sign in. The Wrenlist extension publishes for you using that session.
              </div>
            )}
            {extensionDetected === false && (
              <div className="mt-2 px-2.5 py-2 rounded text-xs" style={{ backgroundColor: 'rgba(217,169,56,.12)', border: '1px solid rgba(217,169,56,.3)', color: '#92700C' }}>
                <span className="font-medium">Extension required</span> — Install the Wrenlist Chrome extension to publish to Vinted, Etsy, Depop, Shopify, and Facebook. eBay works without it.
              </div>
            )}
            {extensionOutdated && extensionDetected !== false && (
              <div className="mt-2 px-2.5 py-2 rounded text-xs" style={{ backgroundColor: 'rgba(217,169,56,.12)', border: '1px solid rgba(217,169,56,.3)', color: '#92700C' }}>
                <span className="font-medium">Update required</span> — The Wrenlist extension is out of date. Restart Chrome to auto-update. eBay publishing still works.
              </div>
            )}
            {extensionOnline === false && extensionDetected !== false && !extensionOutdated && (
              <div className="mt-2 px-2.5 py-2 rounded text-xs" style={{ backgroundColor: 'rgba(217,169,56,.12)', border: '1px solid rgba(217,169,56,.3)', color: '#92700C' }}>
                <span className="font-medium">Extension offline</span> — listings will publish when Chrome is running
              </div>
            )}
            <Link href="/platform-connect" className="block text-xs py-1" style={{ color: '#8A9E88' }} onClick={(e) => e.stopPropagation()}>
              Manage connections →
            </Link>

            {/* Schedule toggle */}
            <div className="mt-2 pt-2" style={{ borderTopWidth: '1px', borderTopColor: 'rgba(61,92,58,.14)' }}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSchedule}
                  onChange={(e) => {
                    setShowSchedule(e.target.checked)
                    if (!e.target.checked) setScheduledFor('')
                  }}
                  className="rounded"
                />
                <span className="text-xs font-medium" style={{ color: '#1E2E1C' }}>Schedule for later</span>
              </label>
              {showSchedule && (
                <div className="mt-2 space-y-2">
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-2 py-1.5 text-sm border rounded bg-white"
                    style={{ borderColor: 'rgba(61,92,58,.22)' }}
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="stalePolicy"
                        checked={stalePolicy === 'run_if_late'}
                        onChange={() => setStalePolicy('run_if_late')}
                      />
                      <span className="text-[11px]" style={{ color: '#8A9E88' }}>Run anyway if late</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        name="stalePolicy"
                        checked={stalePolicy === 'skip_if_late'}
                        onChange={() => setStalePolicy('skip_if_late')}
                      />
                      <span className="text-[11px]" style={{ color: '#8A9E88' }}>Skip if missed</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-3 pt-2" style={{ borderTopWidth: '1px', borderTopColor: 'rgba(61,92,58,.14)' }}>
              <button
                onClick={() => {
                  const isoSchedule = showSchedule && scheduledFor
                    ? new Date(scheduledFor).toISOString()
                    : undefined
                  onCrosslistConfirm?.(isoSchedule, showSchedule ? stalePolicy : undefined)
                }}
                disabled={crosslistTargets.length === 0 || (showSchedule && !scheduledFor)}
                className="flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-40"
                style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
              >
                {showSchedule && scheduledFor
                  ? 'Schedule'
                  : (extensionDetected === false || extensionOutdated) && crosslistTargets.every((p) => p === 'ebay')
                    ? 'Publish now (eBay only)'
                    : 'Publish now'}
              </button>
              <button
                onClick={onCrosslistCancel}
                className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
                style={{ borderWidth: '1px', borderColor: 'rgba(61,92,58,.22)', backgroundColor: 'transparent', color: '#3D5C3A' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {!isEditing && (
          <button
            onClick={onEditClick}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.22)',
              backgroundColor: 'transparent',
              color: '#3D5C3A',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE8DE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Edit
          </button>
        )}
      </div>
    </div>
  )
}
