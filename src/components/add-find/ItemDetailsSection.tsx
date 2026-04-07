'use client'

import { FindCondition, Platform, FieldConfig } from '@/types'
import { WRENLIST_CONDITIONS, getConditionPlatformLabels } from '@/data/marketplace-conditions'

interface ItemDetailsSectionProps {
  brand: string
  condition: FindCondition
  quantity: number
  selectedPlatforms: Platform[]
  fieldConfig: Record<string, FieldConfig> | null
  incompleteRequiredFields: Set<string>
  onBrandChange: (value: string) => void
  onConditionChange: (value: FindCondition) => void
  onQuantityChange: (value: number) => void
}

export default function ItemDetailsSection({
  brand,
  condition,
  quantity,
  selectedPlatforms,
  fieldConfig,
  incompleteRequiredFields,
  onBrandChange,
  onConditionChange,
  onQuantityChange,
}: ItemDetailsSectionProps) {
  const brandConfig = fieldConfig?.brand
  const showBrand = !fieldConfig || brandConfig?.show !== false
  const brandRequired = brandConfig?.required === true

  const platformLabels = selectedPlatforms.length > 0
    ? getConditionPlatformLabels(condition, selectedPlatforms)
    : ''

  return (
    <>
      {/* Brand */}
      {showBrand && (
        <div className="bg-white rounded-lg border border-sage/14 p-6">
          <label className="block text-sm font-semibold text-ink mb-2">
            Brand
            {brandRequired && <span className="text-red-500"> *</span>}
            {!brandRequired && (
              <span className="text-xs text-sage-dim font-normal"> (optional)</span>
            )}
          </label>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={brand}
              onChange={(e) => onBrandChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
                incompleteRequiredFields.has('brand')
                  ? 'border-amber-400 focus:ring-amber-400'
                  : 'border-sage/14 focus:ring-sage/30'
              }`}
              placeholder="Leave blank if unsure"
            />
            {incompleteRequiredFields.has('brand') && (
              <span className="text-xs text-amber-600">Required — complete before publishing</span>
            )}
          </div>
        </div>
      )}

      {/* Condition */}
      <div className="bg-white rounded-lg border border-sage/14 p-6">
        <label className="block text-sm font-semibold text-ink mb-2">Condition</label>
        <div className="flex flex-col gap-2">
          <select
            value={condition}
            onChange={(e) => onConditionChange(e.target.value as FindCondition)}
            className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
              incompleteRequiredFields.has('condition')
                ? 'border-amber-400 focus:ring-amber-400'
                : 'border-sage/14 focus:ring-sage/30'
            }`}
          >
            {WRENLIST_CONDITIONS.map((cond) => (
              <option key={cond.value} value={cond.value}>
                {cond.label}
              </option>
            ))}
          </select>
          {platformLabels && (
            <p className="text-xs text-sage-dim">{platformLabels}</p>
          )}
          {incompleteRequiredFields.has('condition') && (
            <span className="text-xs text-amber-600">Required — complete before publishing</span>
          )}
        </div>
      </div>

      {/* Quantity */}
      <div className="bg-white rounded-lg border border-sage/14 p-6">
        <label className="block text-sm font-semibold text-ink mb-2">Quantity</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) =>
              onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))
            }
            min="1"
            className="w-20 px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
          />
          <span className="text-xs text-sage-dim">pcs</span>
        </div>
      </div>
    </>
  )
}
