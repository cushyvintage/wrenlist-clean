'use client'

import { FieldConfig } from '@/types'

interface DynamicFieldRendererProps {
  fieldKey: string
  config: FieldConfig
  value: string | string[] | boolean | undefined
  onChange: (value: string | string[] | boolean | undefined) => void
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function DynamicFieldRenderer({
  fieldKey,
  config,
  value,
  onChange,
}: DynamicFieldRendererProps) {
  const label = formatLabel(fieldKey)
  const inputClasses = 'w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30'

  return (
    <div>
      <label className="block text-sm font-semibold text-ink mb-2">
        {label}
        {config.required && <span className="text-red-500"> *</span>}
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
