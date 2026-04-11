'use client'

/**
 * ConfirmProvider
 * Imperative confirmation dialog to replace window.confirm().
 *
 * Usage:
 *   const confirm = useConfirm()
 *   const ok = await confirm({
 *     title: 'Disconnect eBay?',
 *     message: 'This will disconnect your eBay account and delete all stored policies.',
 *     confirmLabel: 'Disconnect',
 *     tone: 'danger',
 *   })
 *   if (!ok) return
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm must be used within <ConfirmProvider>')
  }
  return ctx
}

interface PendingState extends ConfirmOptions {
  resolve: (result: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve })
    })
  }, [])

  const close = useCallback(
    (result: boolean) => {
      if (pending) {
        pending.resolve(result)
        setPending(null)
      }
    },
    [pending]
  )

  useEffect(() => {
    if (!pending) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
      if (e.key === 'Enter') close(true)
    }

    document.addEventListener('keydown', handleKey)
    confirmBtnRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKey)
  }, [pending, close])

  const tone = pending?.tone ?? 'default'
  const confirmBg = tone === 'danger' ? '#C0392B' : '#3D5C3A'
  const confirmHover = tone === 'danger' ? '#A5301E' : '#2D4628'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,.3)' }}
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="bg-white rounded-md border border-sage/20 shadow-lg w-full max-w-md modal-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5">
              <h2
                id="confirm-dialog-title"
                className="text-lg font-medium text-ink mb-2"
              >
                {pending.title}
              </h2>
              {pending.message && (
                <p className="text-sm text-ink-lt">{pending.message}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end px-6 pb-5">
              <button
                type="button"
                onClick={() => close(false)}
                className="px-4 py-2 text-sm font-medium rounded transition-colors border border-sage/20 bg-transparent text-sage hover:bg-sage/5"
              >
                {pending.cancelLabel ?? 'Cancel'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                onClick={() => close(true)}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{ backgroundColor: confirmBg, color: '#FFF9F3' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = confirmHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = confirmBg)}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
