'use client'

import { useState } from 'react'

interface Field {
  name: string
  label: string
  type: 'text' | 'select'
  value: string
  isWrenSuggested?: boolean
  platforms: string[]
  options?: string[]
}

interface PlatformFieldsProps {
  categoryPath: string
}

const mockFields: Field[] = [
  {
    name: 'ukSize',
    label: 'UK Size',
    type: 'text',
    value: 'M',
    platforms: ['ebay', 'vinted'],
  },
  {
    name: 'department',
    label: 'Department',
    type: 'select',
    value: "Men's",
    platforms: ['ebay'],
    options: ["Men's", "Women's", 'Unisex'],
  },
  {
    name: 'type',
    label: 'Type',
    type: 'select',
    value: 'Jacket',
    platforms: ['ebay'],
    options: ['Jacket', 'Coat', 'Gilet', 'Overshirt'],
  },
  {
    name: 'style',
    label: 'Style',
    type: 'text',
    value: 'Chore Coat',
    isWrenSuggested: true,
    platforms: ['ebay'],
  },
  {
    name: 'material',
    label: 'Material',
    type: 'text',
    value: 'Cotton Canvas',
    isWrenSuggested: true,
    platforms: ['ebay'],
  },
  {
    name: 'closure',
    label: 'Closure',
    type: 'text',
    value: 'Zip',
    isWrenSuggested: true,
    platforms: ['ebay', 'vinted'],
  },
]

export default function PlatformFields({ categoryPath }: PlatformFieldsProps) {
  const [fields, setFields] = useState<Field[]>(mockFields)

  const handleFieldChange = (index: number, value: string) => {
    const updated = [...fields]
    if (updated[index]) {
      updated[index].value = value
      setFields(updated)
    }
  }

  const filledCount = fields.filter((f) => f.value.trim()).length
  const totalCount = fields.length

  return (
    <div className="bg-white border border-sage/14 rounded overflow-hidden">
      {/* Header */}
      <div className="border-b border-sage/14 px-6 py-4 flex justify-between items-center">
        <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">platform fields</h2>
        <div className="flex items-center gap-2">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M5 3v2l1.2 1" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
          </svg>
          <span className="text-xs text-sage font-medium">Wren filled {filledCount} of {totalCount}</span>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-cream-md px-6 py-3 text-xs text-sage-dim border-b border-sage/14">
        <span>
          Fields required by <strong className="text-ink">eBay UK</strong> and <strong className="text-ink">Vinted</strong> for{' '}
          <em>{categoryPath}</em>. Wren-suggested fields are pre-filled — review and confirm.
        </span>
      </div>

      {/* Fields */}
      <div className="p-6 space-y-4">
        {fields.map((field, idx) => (
          <div
            key={field.name}
            className={`flex gap-3 items-start pb-4 border-b border-sage/14 last:pb-0 last:border-0 ${
              field.isWrenSuggested ? 'bg-sage-pale/30 -mx-6 px-6 py-4' : ''
            }`}
          >
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-ink mb-2">
                {field.label}
                {field.isWrenSuggested && <div className="text-sage-lt text-xs font-normal mt-0.5">✦ Wren suggested</div>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={field.value}
                  onChange={(e) => handleFieldChange(idx, e.target.value)}
                  className="w-full px-2 py-1.5 border border-sage/14 rounded text-xs text-ink focus:outline-none focus:border-sage/30"
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleFieldChange(idx, e.target.value)}
                  className={`w-full px-2 py-1.5 border rounded text-xs text-ink focus:outline-none focus:border-sage/30 ${
                    field.isWrenSuggested ? 'border-sage/30' : 'border-sage/14'
                  }`}
                />
              )}
            </div>
            <div className="flex gap-1 flex-wrap justify-end min-w-fit">
              {field.platforms.map((p) => (
                <span
                  key={p}
                  className={`text-xs px-2 py-0.5 rounded font-medium whitespace-nowrap ${
                    p === 'ebay'
                      ? 'bg-amber/20 text-amber'
                      : p === 'vinted'
                        ? 'bg-blue/20 text-blue'
                        : 'bg-sage/20 text-sage'
                  }`}
                >
                  {p === 'ebay' ? 'eBay' : p === 'vinted' ? 'Vinted' : p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-cream-md px-6 py-3 flex items-center justify-between border-t border-sage/14">
        <div className="text-xs text-sage-dim">
          <strong className="text-ink">{filledCount}</strong> filled by Wren · <strong className="text-amber">{totalCount - filledCount}</strong> need your input
        </div>
        <button className="text-xs px-3 py-1.5 border border-sage/14 rounded hover:bg-white transition-colors">
          + save as template
        </button>
      </div>
    </div>
  )
}
