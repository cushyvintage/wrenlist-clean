'use client'

interface WrenAIProps {
  onUseSuggestedPrice: (price: number) => void
}

export default function WrenAI({ onUseSuggestedPrice }: WrenAIProps) {
  const suggestedPriceMin = 135
  const suggestedPriceMax = 155

  return (
    <div className="bg-white border border-sage/14 rounded overflow-hidden" style={{ backgroundColor: '#f0f4f0' }}>
      {/* Header with badge */}
      <div className="border-b border-sage/14 px-5 py-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-green-600">●</span>
            <span className="text-xs uppercase tracking-widest text-sage-dim font-medium">wren AI</span>
          </span>
        </div>
        <p className="text-xs text-ink-lt font-light">Based on your photo and similar recent sales:</p>
      </div>

      {/* AI suggestions */}
      <div className="p-5 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-lt">suggested price</span>
          <span className="font-semibold text-ink font-mono">£{suggestedPriceMin}–£{suggestedPriceMax}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-lt">avg sell time</span>
          <span className="font-semibold text-ink font-mono">8 days</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-lt">best platform</span>
          <span className="font-semibold text-ink">eBay UK</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-ink-lt">projected margin</span>
          <span className="font-semibold text-sage font-mono">91%</span>
        </div>
      </div>

      {/* Use suggested price button */}
      <div className="px-5 py-3 border-t border-sage/14">
        <button
          onClick={() => onUseSuggestedPrice(suggestedPriceMax)}
          className="w-full text-xs font-medium py-2 px-3 bg-sage text-white rounded hover:bg-sage-dk transition-colors"
        >
          use suggested price
        </button>
      </div>
    </div>
  )
}
