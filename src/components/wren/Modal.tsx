'use client'

/**
 * Modal Component
 * Centered modal with backdrop, title, and close button
 *
 * @example
 * <Modal open={isOpen} onClose={handleClose} title="Confirm delete">
 *   Are you sure?
 * </Modal>
 */

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,.3)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md border border-sage/20 shadow-lg w-full max-w-md max-h-[90vh] flex flex-col modal-enter"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage/14">
          <h2 className="text-lg font-medium text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="text-ink-lt hover:text-ink transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>
  )
}
