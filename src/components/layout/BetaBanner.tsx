'use client'

import { useState } from 'react'

const FEEDBACK_URL = 'mailto:admin@wrenlist.com?subject=Wrenlist%20Beta%20Feedback'

export function BetaBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="sticky top-0 z-10 bg-sage/10 border-b border-sage/20 px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
      <span className="w-2 h-2 rounded-full bg-sage animate-pulse flex-shrink-0" />
      <span className="text-ink-md">
        <span className="font-medium text-ink">Beta access</span>
        {' — all features free. '}
        <a
          href={FEEDBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sage font-medium hover:text-sage-dk underline underline-offset-2 transition-colors"
        >
          Share feedback
        </a>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 text-ink-lt hover:text-ink transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
      </button>
    </div>
  )
}
