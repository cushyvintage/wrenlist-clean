'use client'

import { useState } from 'react'
import { getCategoryNode, getTopLevelCategory } from '@/data/marketplace-category-map'

export interface AIAutoFillData {
  title?: string
  description?: string
  category?: string
  suggestedQuery?: string
  confidence: 'high' | 'medium' | 'low'
}

interface AIAutoFillBannerProps {
  data: AIAutoFillData | null
  /** True if form already has user-entered data (don't overwrite) */
  hasTitle: boolean
  hasDescription: boolean
  hasCategory: boolean
  onApply: (fields: { title?: string; description?: string; category?: string }) => void
  onDismiss: () => void
}

function formatCategory(value: string): string {
  const node = getCategoryNode(value)
  if (node) {
    const topLevel = getTopLevelCategory(value)
    const topLabel = topLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    return node.label !== topLabel ? `${topLabel} > ${node.label}` : node.label
  }
  return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function AIAutoFillBanner({
  data,
  hasTitle,
  hasDescription,
  hasCategory,
  onApply,
  onDismiss,
}: AIAutoFillBannerProps) {
  // Toggle state for each field — default ON if the form field is empty
  const [applyTitle, setApplyTitle] = useState(true)
  const [applyDescription, setApplyDescription] = useState(true)
  const [applyCategory, setApplyCategory] = useState(true)

  if (!data) return null

  const fields: { key: string; label: string; value: string; enabled: boolean; toggle: (v: boolean) => void; hasExisting: boolean }[] = []

  if (data.category) {
    fields.push({
      key: 'category',
      label: 'Category',
      value: formatCategory(data.category),
      enabled: applyCategory,
      toggle: setApplyCategory,
      hasExisting: hasCategory,
    })
  }
  if (data.title) {
    fields.push({
      key: 'title',
      label: 'Title',
      value: data.title.length > 60 ? data.title.slice(0, 57) + '...' : data.title,
      enabled: applyTitle,
      toggle: setApplyTitle,
      hasExisting: hasTitle,
    })
  }
  if (data.description) {
    fields.push({
      key: 'description',
      label: 'Description',
      value: data.description.length > 80 ? data.description.slice(0, 77) + '...' : data.description,
      enabled: applyDescription,
      toggle: setApplyDescription,
      hasExisting: hasDescription,
    })
  }

  if (fields.length === 0) return null

  const anyEnabled = fields.some(f => f.enabled)

  const handleApply = () => {
    const result: { title?: string; description?: string; category?: string } = {}
    if (applyTitle && data.title) result.title = data.title
    if (applyDescription && data.description) result.description = data.description
    if (applyCategory && data.category) result.category = data.category
    onApply(result)
  }

  const confidenceColor = data.confidence === 'high'
    ? 'bg-sage/5 border-sage/20'
    : data.confidence === 'medium'
      ? 'bg-amber-50 border-amber-200'
      : 'bg-slate-50 border-slate-200'

  const confidenceIcon = data.confidence === 'high' ? '✓' : '?'
  const confidenceText = data.confidence === 'high'
    ? 'AI identified this item'
    : data.confidence === 'medium'
      ? 'AI thinks this might be'
      : 'AI made a guess'

  return (
    <div className={`rounded-lg border p-4 ${confidenceColor}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-ink">
          {confidenceIcon} {confidenceText}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-sage-dim hover:text-ink transition-colors"
        >
          Dismiss
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {fields.map((field) => (
          <label
            key={field.key}
            className="flex items-start gap-2 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={field.enabled}
              onChange={(e) => field.toggle(e.target.checked)}
              className="mt-0.5 rounded border-sage/30 text-sage focus:ring-sage/30"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-sage-dim">{field.label}</span>
              {field.hasExisting && (
                <span className="text-xs text-amber-600 ml-1">(will overwrite)</span>
              )}
              <p className="text-sm text-ink truncate">{field.value}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={handleApply}
        disabled={!anyEnabled}
        className="w-full text-sm px-3 py-2 rounded bg-sage text-white hover:bg-sage-lt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Apply selected
      </button>
    </div>
  )
}
