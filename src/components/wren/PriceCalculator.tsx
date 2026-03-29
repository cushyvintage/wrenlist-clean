/**
 * PriceCalculator Component
 * Interactive pricing tool for calculating margins and suggesting prices
 *
 * Design: cream-md bg, input fields for cost/asking price, live margin % display
 * Used in add-find page for price optimization
 * Formula: margin = (asking_price - cost) / asking_price * 100
 *
 * @example
 * <PriceCalculator
 *   cost={12}
 *   askingPrice={145}
 *   onCostChange={(val) => setCost(val)}
 *   onAskingPriceChange={(val) => setAskingPrice(val)}
 * />
 */

interface PriceCalculatorProps {
  /** Cost in GBP (supplier/sourcing cost) */
  cost?: number | null
  /** Asking price in GBP (retail/selling price) */
  askingPrice?: number | null
  /** Fired when cost input changes */
  onCostChange?: (cost: number | null) => void
  /** Fired when asking price input changes */
  onAskingPriceChange?: (price: number | null) => void
  /** Optional eyebrow label */
  label?: string
}

/** Calculate margin percentage: (asking - cost) / asking * 100 */
function calculateMargin(cost: number | null, asking: number | null): number | null {
  if (!cost || !asking || asking <= 0) return null
  return Math.round(((asking - cost) / asking) * 100)
}

export function PriceCalculator({
  cost = null,
  askingPrice = null,
  onCostChange,
  onAskingPriceChange,
  label = 'pricing calculator',
}: PriceCalculatorProps) {
  const margin = calculateMargin(cost, askingPrice)

  const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value)
    onCostChange?.(val)
  }

  const handleAskingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value === '' ? null : parseFloat(e.target.value)
    onAskingPriceChange?.(val)
  }

  // Margin color logic
  let marginColor = 'text-ink-lt'
  if (margin !== null) {
    if (margin >= 70) marginColor = 'text-green-600'
    else if (margin >= 50) marginColor = 'text-sage'
    else if (margin >= 30) marginColor = 'text-amber-600'
    else marginColor = 'text-red-600'
  }

  return (
    <div className="bg-cream-md rounded-md p-5 border border-sage/14">
      {/* Eyebrow label */}
      <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-4">
        {label}
      </div>

      {/* Cost input */}
      <div className="mb-4">
        <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
          Cost
        </label>
        <div className="flex items-center">
          <span className="font-mono text-sm text-ink-md mr-2">£</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={cost ?? ''}
            onChange={handleCostChange}
            placeholder="0.00"
            className="flex-1 font-mono text-sm px-2 py-1.5 bg-white border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
          />
        </div>
      </div>

      {/* Asking price input */}
      <div className="mb-4">
        <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
          Asking price
        </label>
        <div className="flex items-center">
          <span className="font-mono text-sm text-ink-md mr-2">£</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={askingPrice ?? ''}
            onChange={handleAskingChange}
            placeholder="0.00"
            className="flex-1 font-mono text-sm px-2 py-1.5 bg-white border border-sage/14 rounded text-ink placeholder-ink-lt focus:outline-none focus:border-sage/30"
          />
        </div>
      </div>

      {/* Margin display */}
      <div className="pt-3 border-t border-sage/14">
        <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">
          Margin
        </div>
        <div className={`font-mono text-lg font-medium ${marginColor}`}>
          {margin !== null ? `${margin}%` : '—'}
        </div>
      </div>

      {/* Profit amount (if both values present) */}
      {cost !== null && askingPrice !== null && askingPrice > cost && (
        <div className="mt-3 pt-3 border-t border-sage/14">
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-1">
            Profit
          </div>
          <div className="font-mono text-sm text-green-600">£{(askingPrice - cost).toFixed(2)}</div>
        </div>
      )}
    </div>
  )
}
