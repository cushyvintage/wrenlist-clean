'use client'

interface InternalFieldsSidebarProps {
  sku: string
  costPrice: number | null
  price: number | null
  internalNote: string
  category: string
  onSkuChange: (value: string) => void
  onCostPriceChange: (value: number | null) => void
  onInternalNoteChange: (value: string) => void
  onRegenerateSKU: () => void
}

export default function InternalFieldsSidebar({
  sku,
  costPrice,
  price,
  internalNote,
  category,
  onSkuChange,
  onCostPriceChange,
  onInternalNoteChange,
  onRegenerateSKU,
}: InternalFieldsSidebarProps) {
  return (
    <div className="md:col-span-3">
      <div className="bg-white rounded-lg border border-sage/14 p-6 md:sticky md:top-24 space-y-6">
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
          <label className="block text-sm font-semibold text-ink mb-2">Cost price</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-sage-dim">£</span>
            <input
              type="number"
              value={costPrice ?? ''}
              onChange={(e) =>
                onCostPriceChange(e.target.value ? parseFloat(e.target.value) : null)
              }
              className="flex-1 px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          {price && costPrice && (
            <div className="text-xs text-sage-dim mt-1">
              Margin: {Math.round(((price - costPrice) / price) * 100)}%
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Internal note</label>
          <textarea
            value={internalNote}
            onChange={(e) => onInternalNoteChange(e.target.value)}
            className="w-full px-3 py-2 border border-sage/14 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
            rows={4}
            placeholder="For your reference only"
          />
        </div>
      </div>
    </div>
  )
}
