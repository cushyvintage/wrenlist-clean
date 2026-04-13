'use client'

import { FieldConfig } from '@/types'

const PLATFORM_LABELS: Record<string, string> = {
  vinted: 'Vinted', ebay: 'eBay', etsy: 'Etsy', shopify: 'Shopify',
  depop: 'Depop', poshmark: 'Poshmark', mercari: 'Mercari',
  facebook: 'Facebook', whatnot: 'Whatnot', grailed: 'Grailed',
}

interface DynamicFieldRendererProps {
  fieldKey: string
  config: FieldConfig
  value: string | string[] | boolean | undefined
  onChange: (value: string | string[] | boolean | undefined) => void
  /** When true and the field is required+empty, show amber border */
  highlightEmpty?: boolean
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatAttribution(requiredBy?: string[]): string | null {
  if (!requiredBy || requiredBy.length === 0) return null
  const names = requiredBy.map(p => PLATFORM_LABELS[p] || p)
  return `Required by ${names.join(' & ')}`
}

function isFieldEmpty(value: string | string[] | boolean | undefined): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export default function DynamicFieldRenderer({
  fieldKey,
  config,
  value,
  onChange,
  highlightEmpty,
}: DynamicFieldRendererProps) {
  const label = formatLabel(fieldKey)
  const showAmber = !!(config.required && highlightEmpty && isFieldEmpty(value))
  const borderClass = showAmber ? 'border-amber-400' : 'border-sage/14'
  const inputClasses = `w-full px-3 py-2 border ${borderClass} rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30`
  const attribution = formatAttribution(config.requiredBy)

  return (
    <div>
      <label className="block text-sm font-semibold text-ink mb-2">
        {label}
        {config.required && (
          <>
            <span className="text-red-500"> *</span>
            {attribution && <span className="ml-1.5 text-[10px] font-normal text-amber-600">{attribution}</span>}
          </>
        )}
        {!config.required && (
          <span className="text-xs text-sage-dim font-normal"> (optional)</span>
        )}
      </label>

      {config.options && config.options.length > 0 ? (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">Select...</option>
          {config.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      )}
    </div>
  )
}
