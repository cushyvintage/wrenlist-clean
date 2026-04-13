'use client'

import { DEPOP_SOURCES, DEPOP_AGES, DEPOP_STYLE_TAGS } from '@/data/unified-colours'
import type { PlatformFieldProps } from './types'

export default function DepopFields({
  platformFields,
  onSharedFieldChange,
}: PlatformFieldProps) {
  return (
    <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-5">
      <h3 className="text-xs font-medium text-sage border-b border-sage/14 pb-2 -mt-1">Depop</h3>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Source <span className="text-xs text-sage-dim font-normal">(optional, max 2)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {DEPOP_SOURCES.map((s) => {
            const selected = ((platformFields.shared?.depopSource as string) ?? '').split(',').filter(Boolean).includes(s.value)
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  const current = ((platformFields.shared?.depopSource as string) ?? '').split(',').filter(Boolean)
                  const next = selected ? current.filter(v => v !== s.value) : [...current, s.value].slice(0, 2)
                  onSharedFieldChange('depopSource', next.join(','))
                }}
                className={`px-3 py-1.5 rounded-full border text-xs transition-colors ${
                  selected ? 'border-sage bg-sage/10 text-sage font-medium' : 'border-sage/20 text-sage-dim hover:border-sage/40'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Age / era <span className="text-xs text-sage-dim font-normal">(optional)</span>
        </label>
        <select
          value={(platformFields.shared?.depopAge as string) ?? ''}
          onChange={(e) => onSharedFieldChange('depopAge', e.target.value)}
          className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
        >
          <option value="">Select</option>
          {DEPOP_AGES.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Style tags <span className="text-xs text-sage-dim font-normal">(optional, max 3)</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DEPOP_STYLE_TAGS.map((tag) => {
            const selected = ((platformFields.shared?.depopStyleTags as string) ?? '').split(',').filter(Boolean).includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const current = ((platformFields.shared?.depopStyleTags as string) ?? '').split(',').filter(Boolean)
                  const next = selected ? current.filter(v => v !== tag) : [...current, tag].slice(0, 3)
                  onSharedFieldChange('depopStyleTags', next.join(','))
                }}
                className={`px-2 py-1 rounded border text-xs transition-colors ${
                  selected ? 'border-sage bg-sage/10 text-sage font-medium' : 'border-sage/14 text-sage-dim hover:border-sage/30'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
