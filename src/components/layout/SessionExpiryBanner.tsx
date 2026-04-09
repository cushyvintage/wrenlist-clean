'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Platform } from '@/types'
import { formatPlatformName } from '@/lib/crosslist'

const PLATFORM_URLS: Partial<Record<Platform, string>> = {
  vinted: 'https://www.vinted.co.uk',
  depop: 'https://www.depop.com',
  etsy: 'https://www.etsy.com',
  facebook: 'https://www.facebook.com/marketplace',
}

interface SessionExpiryBannerProps {
  disconnected: Platform[]
}

export function SessionExpiryBanner({ disconnected }: SessionExpiryBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || disconnected.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <span className="text-amber-600 flex-shrink-0">&#9888;</span>
        <span className="text-amber-800">
          {disconnected.map((p, i) => {
            const url = PLATFORM_URLS[p]
            return (
              <span key={p}>
                {i > 0 && ', '}
                <strong>{formatPlatformName(p)}</strong>
                {' session expired'}
                {url && (
                  <>
                    {' — '}
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors"
                    >
                      open {formatPlatformName(p)}
                    </a>
                  </>
                )}
              </span>
            )
          })}
          {' | '}
          <Link
            href="/platform-connect"
            className="text-amber-700 font-medium underline underline-offset-2 hover:text-amber-900 transition-colors"
          >
            Platform Connect &rarr;
          </Link>
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-500 hover:text-amber-700 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M3 3l8 8M11 3l-8 8" />
        </svg>
      </button>
    </div>
  )
}
