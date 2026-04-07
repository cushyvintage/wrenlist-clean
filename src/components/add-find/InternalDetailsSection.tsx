'use client'

import { useState } from 'react'

interface InternalDetailsSectionProps {
  sku: string
  internalNote: string
  category: string
  onSkuChange: (value: string) => void
  onInternalNoteChange: (value: string) => void
  onRegenerateSKU: () => void
}

export default function InternalDetailsSection({
  sku,
  internalNote,
  category,
  onSkuChange,
  onInternalNoteChange,
  onRegenerateSKU,
}: InternalDetailsSectionProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-sage/14 p-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
      >
        {expanded ? 'Hide internal details' : 'Internal details (SKU, notes)'} →
      </button>

      {expanded && (
        <div className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">SKU</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sku}
                onChange={(e) => onSkuChange(e.target.value)}
                className="flex-1 px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                placeholder="Optional"
              />
              <button
                type="button"
                onClick={onRegenerateSKU}
                disabled={!category}
                className="px-2 py-2 text-sm text-sage-lt hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Regenerate SKU"
              >
                🔄
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Internal note</label>
            <textarea
              value={internalNote}
              onChange={(e) => onInternalNoteChange(e.target.value)}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
              rows={3}
              placeholder="For your reference only"
            />
          </div>
        </div>
      )}
    </div>
  )
}
