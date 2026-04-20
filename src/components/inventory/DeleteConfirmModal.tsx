'use client'

interface DeleteConfirmModalProps {
  itemName: string
  message?: string
  isLoading: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function DeleteConfirmModal({
  itemName,
  message = 'This action cannot be undone.',
  isLoading,
  error,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div
        role="alertdialog"
        aria-labelledby="delete-confirm-heading"
        aria-describedby="delete-confirm-message"
        className="p-8 rounded text-center modal-enter"
        style={{
          backgroundColor: '#FFF9F3',
          borderWidth: '2px',
          borderColor: '#C4883A',
        }}
      >
        {/* Warning marker — amber circle with exclamation. Signals "destructive,
            armed, waiting for confirm" at a glance so users who click through
            patterns on muscle memory get a second reminder. */}
        <div
          className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
          style={{ backgroundColor: 'rgba(196,138,58,.15)', color: '#C4883A', fontWeight: 700, fontSize: '20px' }}
          aria-hidden
        >
          !
        </div>
        <h2 id="delete-confirm-heading" className="text-lg font-medium mb-2 text-ink">
          Delete &ldquo;{itemName}&rdquo;?
        </h2>
        <p id="delete-confirm-message" className="text-sm mb-6 text-ink-lt">{message}</p>
        {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            disabled={isLoading}
            autoFocus
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
            {isLoading ? 'Deleting...' : `Yes, delete`}
          </button>
        </div>
      </div>
    </div>
  )
}
