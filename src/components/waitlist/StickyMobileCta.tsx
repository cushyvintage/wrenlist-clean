'use client'

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/plausible'

const DISMISS_KEY = 'wrenlist-sticky-cta-dismissed'
const SHOW_THRESHOLD = 0.5 // appear once user has scrolled past 50% of doc

interface StickyMobileCtaProps {
  /** Called when the user taps the CTA. Should open the waitlist modal. */
  onOpen: () => void
}

/**
 * StickyMobileCta — bottom-anchored "Save my spot" bar shown only on phones
 * after the user has scrolled past 50% of the page. Hidden again if they
 * scroll back above the threshold. Dismissible per-tab via sessionStorage.
 *
 * Below the desktop breakpoint only — `md:hidden` — so it never competes
 * with the hero or feature CTAs on larger screens.
 */
export function StickyMobileCta({ onOpen }: StickyMobileCtaProps) {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const impressionTrackedRef = useRef(false)

  // Hydrate dismissal state on mount (sessionStorage isn't available SSR-side).
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        setDismissed(true)
      }
    } catch {
      // sessionStorage can throw in private mode — fall through.
    }
  }, [])

  useEffect(() => {
    if (dismissed) return

    const onScroll = () => {
      const doc = document.documentElement
      const scrolled = window.scrollY + window.innerHeight
      const total = doc.scrollHeight
      // Avoid div-by-zero on tiny pages (e.g. error states).
      if (total <= window.innerHeight) {
        setVisible(false)
        return
      }
      const ratio = scrolled / total
      setVisible(ratio >= SHOW_THRESHOLD)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [dismissed])

  // Fire 'shown' event once per session.
  useEffect(() => {
    if (visible && !impressionTrackedRef.current) {
      impressionTrackedRef.current = true
      trackEvent('StickyMobileCtaShown')
    }
  }, [visible])

  if (dismissed) return null

  const handleClick = () => {
    trackEvent('StickyMobileCtaClicked')
    onOpen()
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    trackEvent('StickyMobileCtaDismissed')
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  return (
    <div
      aria-hidden={!visible}
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-[#3d5c3a] text-[#f5f0e8] shadow-lg transition-transform duration-200 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={handleClick}
          className="flex-1 text-left text-xs font-medium uppercase tracking-widest hover:opacity-90"
        >
          Save my spot →
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-[#f5f0e8] opacity-70 hover:opacity-100 px-2 py-1 text-base leading-none"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
