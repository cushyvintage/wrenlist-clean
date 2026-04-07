'use client'

interface ShippingDimensions {
  length: number | null
  width: number | null
  height: number | null
}

interface ShippingSectionProps {
  shippingWeight: number | null
  shippingDimensions: ShippingDimensions
  onWeightChange: (value: number | null) => void
  onDimensionChange: (dimension: keyof ShippingDimensions, value: number | null) => void
}

export default function ShippingSection({
  shippingWeight,
  shippingDimensions,
  onWeightChange,
  onDimensionChange,
}: ShippingSectionProps) {
  return (
    <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-4">
      <h3 className="text-sm font-semibold text-ink">Shipping</h3>

      <div>
        <label className="block text-xs text-sage-dim mb-2">Weight (kg)</label>
        <input
          type="number"
          value={shippingWeight ?? ''}
          onChange={(e) =>
            onWeightChange(e.target.value ? parseFloat(e.target.value) : null)
          }
          className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
          placeholder="0.00"
          step="0.1"
        />
      </div>

      <div>
        <label className="block text-xs text-sage-dim mb-2">Dimensions (L × W × H, cm)</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            type="number"
            value={shippingDimensions.length ?? ''}
            onChange={(e) =>
              onDimensionChange('length', e.target.value ? parseFloat(e.target.value) : null)
            }
            className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            placeholder="Length"
            step="0.1"
          />
          <input
            type="number"
            value={shippingDimensions.width ?? ''}
            onChange={(e) =>
              onDimensionChange('width', e.target.value ? parseFloat(e.target.value) : null)
            }
            className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            placeholder="Width"
            step="0.1"
          />
          <input
            type="number"
            value={shippingDimensions.height ?? ''}
            onChange={(e) =>
              onDimensionChange('height', e.target.value ? parseFloat(e.target.value) : null)
            }
            className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            placeholder="Height"
            step="0.1"
          />
        </div>
      </div>
    </div>
  )
}
