'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

export default function AICaveatBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
      <span className="shrink-0 mt-0.5">⚠️</span>
      <p className="flex-1">
        Prices are estimates based on eBay UK listed prices and AI analysis — not confirmed sales.
        Actual selling prices may vary. Always verify before pricing.
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-500 hover:text-amber-700 transition"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
