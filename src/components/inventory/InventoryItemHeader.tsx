'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/wren/Badge'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
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
  extensionDetected?: boolean | null
  marketplaceData?: MarketplaceDataItem[]
  onMarkAsSoldClick: () => void
  onEditClick: () => void
  onSyncClick: () => Promise<void>
  onListOnVintedClick: () => void
  onListOnEbayClick: () => void
  onDelistVintedClick?: () => Promise<void>
  onRelistVintedClick?: () => Promise<void>
  onCrosslistClick?: () => void
  onCrosslistTargetToggle?: (platform: Platform) => void
  onCrosslistConfirm?: () => void
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
  extensionDetected,
  marketplaceData = [],
  onMarkAsSoldClick,
  onEditClick,
  onSyncClick,
  onListOnVintedClick,
  onListOnEbayClick,
  onDelistVintedClick,
  onRelistVintedClick,
  onCrosslistClick,
  onCrosslistTargetToggle,
  onCrosslistConfirm,
  onCrosslistCancel,
}: InventoryItemHeaderProps) {
  const router = useRouter()

  const vintedData = marketplaceData.find((m) => m.marketplace === 'vinted')
  const vintedIsListed = vintedData?.status === 'listed'
  const vintedNeedsDelist = vintedData?.status === 'needs_delist' || vintedData?.status === 'delisted'

  return (
    <div
      className="flex items-center justify-between pb-4"
      style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/finds')}
          className="text-sm text-sage hover:text-sage-dk transition"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-medium" style={{ color: '#1E2E1C' }}>
          {find.name}
        </h1>
      </div>
      <div className="flex items-center gap-2 relative">
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
        {!isEditing && find.status !== 'sold' && availableForCrosslist.length > 0 && (
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
        )}
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
              const formatName = (p: string) => p === 'ebay' ? 'eBay' : p.charAt(0).toUpperCase() + p.slice(1)
              return (
                <label
                  key={platform}
                  className="flex items-center gap-2 py-1.5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onCrosslistTargetToggle?.(platform)}
                    className="rounded"
                  />
                  <MarketplaceIcon platform={platform} size="sm" />
                  <span className="text-sm font-medium" style={{ color: '#1E2E1C' }}>
                    {formatName(platform)}
                    {username && (
                      <span className="font-normal ml-1" style={{ color: '#8A9E88' }}>· {username}</span>
                    )}
                  </span>
                </label>
              )
            })}
            {extensionDetected === false && (
              <p className="text-xs py-1" style={{ color: '#8A9E88' }}>
                Install the extension to connect more platforms
              </p>
            )}
            <Link href="/platform-connect" className="block text-xs py-1" style={{ color: '#8A9E88' }} onClick={(e) => e.stopPropagation()}>
              Manage connections →
            </Link>
            <div className="flex gap-2 mt-3 pt-2" style={{ borderTopWidth: '1px', borderTopColor: 'rgba(61,92,58,.14)' }}>
              <button
                onClick={onCrosslistConfirm}
                disabled={crosslistTargets.length === 0}
                className="flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-40"
                style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
              >
                Publish
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
