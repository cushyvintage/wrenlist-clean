'use client'

interface DeleteConfirmModalProps {
  itemName: string
  message?: string
  isOpen: boolean
  isLoading: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  itemName,
  message = 'This action cannot be undone.',
  isOpen,
  isLoading,
  error,
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
        <h2 className="text-lg font-medium mb-2 text-ink">
          Delete &ldquo;{itemName}&rdquo;?
        </h2>
        <p className="text-sm mb-6 text-ink-lt">{message}</p>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded transition-colors border border-sage/20 bg-transparent text-sage hover:bg-sage/5 disabled:opacity-50"
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
