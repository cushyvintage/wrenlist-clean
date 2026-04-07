'use client'

import { useState, useEffect } from 'react'
import { getSizeGroupForCategory, ALL_SIZE_GROUPS, SIZE_GROUPS, type SizeGroup } from '@/data/size-options'

interface SizePickerProps {
  value: string
  category: string
  required?: boolean
  onChange: (value: string, vintedSizeId?: number) => void
}

export default function SizePicker({ value, category, required, onChange }: SizePickerProps) {
  const [sizeGroup, setSizeGroup] = useState<SizeGroup>(getSizeGroupForCategory(category))
  const [customMode, setCustomMode] = useState(false)

  // Auto-detect size group when category changes
  useEffect(() => {
    const detected = getSizeGroupForCategory(category)
    setSizeGroup(detected)
    setCustomMode(detected.id === 'none')
  }, [category])

  // If current value matches a size in the group, select it
  const selectedSize = sizeGroup.sizes.find(s => s.label === value)

  if (customMode || sizeGroup.sizes.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
            placeholder="e.g. M, 12, EU 38..."
          />
          {sizeGroup.sizes.length > 0 && (
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
            >
              Use presets
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Size type selector (small row above the main picker) */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-sage-dim">Type:</span>
        <select
          value={sizeGroup.id}
          onChange={(e) => {
            const group = SIZE_GROUPS[e.target.value]
            if (group) {
              setSizeGroup(group)
              onChange('') // Clear value when switching type
            }
          }}
          className="px-2 py-1 border border-sage/14 rounded text-xs focus:outline-none focus:ring-1 focus:ring-sage/30"
        >
          {ALL_SIZE_GROUPS.map((g) => (
            <option key={g.id} value={g.id}>{g.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setCustomMode(true)}
          className="text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
        >
          Custom
        </button>
      </div>

      {/* Size chips */}
      <div className="flex flex-wrap gap-1.5">
        {sizeGroup.sizes.map((size) => {
          const isSelected = value === size.label
          return (
            <button
              key={size.label}
              type="button"
              onClick={() => onChange(size.label, size.vintedId)}
              className={`px-3 py-1.5 rounded border text-xs transition-colors ${
                isSelected
                  ? 'border-sage bg-sage/10 text-sage font-medium'
                  : 'border-sage/14 text-sage-dim hover:border-sage/30'
              }`}
            >
              {size.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
