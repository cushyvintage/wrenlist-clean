'use client'

import { useEffect } from 'react'

interface MobileSidebarProps {
  open: boolean
  onClose: () => void
  children?: React.ReactNode
  userInfo?: {
    name: string
    plan: string
  }
}

export function MobileSidebar({ open, onClose, children, userInfo }: MobileSidebarProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="absolute left-0 top-0 h-full w-[260px] flex flex-col overflow-y-auto shadow-xl"
        style={{ backgroundColor: '#1E2E1C' }}
      >
        {/* Header with close button */}
        <div
          className="flex items-center justify-between px-[18px] py-6 border-b"
          style={{ borderColor: 'rgba(255,255,255,.07)' }}
        >
          <div>
            <div className="font-serif text-base font-medium" style={{ color: '#C8DEC6' }}>
              Wrenlist
            </div>
            <div className="text-[9px] uppercase tracking-[.12em] mt-1" style={{ color: '#3D5C3A', fontWeight: 600 }}>
              Resale
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors"
            style={{ color: '#7A9A78' }}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1">{children}</nav>

        {/* Footer */}
        <div className="px-[18px] py-4 border-t" style={{ borderColor: 'rgba(255,255,255,.07)' }}>
          {userInfo && (
            <>
              <div className="text-[9px] uppercase tracking-[.08em] mb-1" style={{ color: '#3D5C3A', fontWeight: 600 }}>
                Plan
              </div>
              <div className="text-sm" style={{ color: '#7A9A78' }}>
                {userInfo.plan}
              </div>
              <div className="text-[11px] mt-1" style={{ color: '#4A6A48' }}>
                {userInfo.name}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
