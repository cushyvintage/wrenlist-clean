'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/wren/Badge'
import type { Find, Platform } from '@/types'

interface InventoryItemHeaderProps {
  find: Find
  isEditing: boolean
  isSyncing: boolean
  isListingOnVinted?: boolean
  isListingOnEbay?: boolean
  isCrosslisting?: boolean
  showCrosslistPicker?: boolean
  crosslistTargets?: Platform[]
  availableForCrosslist?: Platform[]
  onMarkAsSoldClick: () => void
  onEditClick: () => void
  onSyncClick: () => Promise<void>
  onListOnVintedClick: () => void
  onListOnEbayClick: () => void
  onCrosslistClick?: () => void
  onCrosslistTargetToggle?: (platform: Platform) => void
  onCrosslistConfirm?: () => void
  onCrosslistCancel?: () => void
}

const PLATFORM_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  vinted: { border: 'rgba(0,102,153,.3)', text: '#006699', bg: 'rgba(0,102,153,.08)' },
  ebay: { border: 'rgba(255,80,0,.3)', text: '#E05200', bg: 'rgba(255,80,0,.08)' },
  shopify: { border: 'rgba(100,170,70,.3)', text: '#5E8E3E', bg: 'rgba(100,170,70,.08)' },
}

export default function InventoryItemHeader({
  find,
  isEditing,
  isSyncing,
  isCrosslisting = false,
  showCrosslistPicker = false,
  crosslistTargets = [],
  availableForCrosslist = [],
  onMarkAsSoldClick,
  onEditClick,
  onSyncClick,
  onListOnVintedClick,
  onListOnEbayClick,
  onCrosslistClick,
  onCrosslistTargetToggle,
  onCrosslistConfirm,
  onCrosslistCancel,
}: InventoryItemHeaderProps) {
  const router = useRouter()

  return (
    <div
      className="flex items-center justify-between pb-4"
      style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/inventory')}
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
              const colors = PLATFORM_COLORS[platform] || { border: 'rgba(61,92,58,.3)', text: '#3D5C3A', bg: 'rgba(61,92,58,.08)' }
              const isSelected = crosslistTargets.includes(platform)
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
                  <span
                    className="text-sm font-medium capitalize"
                    style={{ color: colors.text }}
                  >
                    {platform}
                  </span>
                </label>
              )
            })}
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
