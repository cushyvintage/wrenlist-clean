'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/wren/Badge'
import type { Find } from '@/types'

interface InventoryItemHeaderProps {
  find: Find
  isEditing: boolean
  isSyncing: boolean
  isListingOnVinted?: boolean
  isListingOnEbay?: boolean
  onMarkAsSoldClick: () => void
  onEditClick: () => void
  onSyncClick: () => Promise<void>
  onListOnVintedClick: () => void
  onListOnEbayClick: () => void
}

export default function InventoryItemHeader({
  find,
  isEditing,
  isSyncing,
  isListingOnVinted = false,
  isListingOnEbay = false,
  onMarkAsSoldClick,
  onEditClick,
  onSyncClick,
  onListOnVintedClick,
  onListOnEbayClick,
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
      <div className="flex items-center gap-2">
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
        {!isEditing && find.status !== 'sold' && (
          <button
            onClick={onListOnVintedClick}
            disabled={isListingOnVinted}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(0,102,153,.3)',
              backgroundColor: 'transparent',
              color: '#006699',
            }}
            onMouseEnter={(e) => !isListingOnVinted && (e.currentTarget.style.backgroundColor = 'rgba(0,102,153,.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {isListingOnVinted ? '⏳ Listing...' : '↗ List on Vinted'}
          </button>
        )}
        {!isEditing && find.status !== 'sold' && (
          <button
            onClick={onListOnEbayClick}
            disabled={isListingOnEbay}
            className="px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(255,80,0,.3)',
              backgroundColor: 'transparent',
              color: '#E05200',
            }}
            onMouseEnter={(e) => !isListingOnEbay && (e.currentTarget.style.backgroundColor = 'rgba(255,80,0,.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {isListingOnEbay ? '⏳ Listing...' : '↗ List on eBay'}
          </button>
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
