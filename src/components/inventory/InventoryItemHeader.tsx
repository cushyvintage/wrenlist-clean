'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/wren/Badge'
import type { Find } from '@/types'

interface InventoryItemHeaderProps {
  find: Find
  isEditing: boolean
  isSyncing: boolean
  onMarkAsSoldClick: () => void
  onEditClick: () => void
  onSyncClick: () => Promise<void>
}

export default function InventoryItemHeader({
  find,
  isEditing,
  isSyncing,
  onMarkAsSoldClick,
  onEditClick,
  onSyncClick,
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
