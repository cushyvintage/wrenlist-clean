'use client'

import type { Find } from '@/types'

interface DeleteConfirmModalProps {
  find: Find
  isOpen: boolean
  isLoading: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export default function DeleteConfirmModal({
  find,
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="p-8 rounded text-center"
        style={{
          backgroundColor: '#FFF9F3',
          borderWidth: '1px',
          borderColor: 'rgba(196,138,58,.2)',
        }}
      >
        <h2 className="text-lg font-medium mb-2" style={{ color: '#1E2E1C' }}>
          Delete "{find.name}"?
        </h2>
        <p className="text-sm mb-6" style={{ color: '#6B7D6A' }}>
          This action cannot be undone.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded transition-colors"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.22)',
              backgroundColor: 'transparent',
              color: '#3D5C3A',
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#EDE8DE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#C4883A', color: '#FFF9F3' }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#A5723A')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C4883A')}
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
