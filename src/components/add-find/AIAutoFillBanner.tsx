'use client'

import { useState, useEffect } from 'react'
import { useCategoryTree } from '@/hooks/useCategoryTree'
import { WRENLIST_CONDITIONS } from '@/data/marketplace-conditions'
import WrenIcon from '@/components/ui/WrenIcon'

export interface AIAutoFillData {
  title?: string
  description?: string
  category?: string
  condition?: string
  suggestedQuery?: string
  suggestedPrice?: number
  priceReasoning?: string
  priceLoading?: boolean
  confidence: 'high' | 'medium' | 'low'
}

export interface AIAutoFillResult {
  title?: string
  description?: string
  category?: string
  condition?: string
  price?: number
}

interface AIAutoFillBannerProps {
  data: AIAutoFillData | null
  hasTitle: boolean
  hasDescription: boolean
  hasCategory: boolean
  hasCondition: boolean
  hasPrice: boolean
  onApply: (fields: AIAutoFillResult, outcomes: Record<string, 'kept' | 'rejected'>) => void
  onDismiss: () => void
  onRefine?: (feedback: string) => Promise<void> | void
  isRefining?: boolean
}

function formatCondition(value: string): string {
  return WRENLIST_CONDITIONS.find(c => c.value === value)?.label ?? value
}

export default function AIAutoFillBanner({
  data,
  hasTitle,
  hasDescription,
  hasCategory,
  hasCondition,
  hasPrice,
  onApply,
  onDismiss,
  onRefine,
  isRefining,
}: AIAutoFillBannerProps) {
  const [refineOpen, setRefineOpen] = useState(false)
  const [refineText, setRefineText] = useState('')
  const { getNode, getTopLevel } = useCategoryTree()

  const formatCategory = (value: string): string => {
    const node = getNode(value)
    if (node) {
      const topLevel = getTopLevel(value)
      const topLabel = topLevel.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      return node.label !== topLabel ? `${topLabel} > ${node.label}` : node.label
    }
    return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const [applyTitle, setApplyTitle] = useState(!hasTitle)
  const [applyDescription, setApplyDescription] = useState(!hasDescription)
  const [applyCategory, setApplyCategory] = useState(!hasCategory)
  const [applyCondition, setApplyCondition] = useState(!hasCondition)
  const [applyPrice, setApplyPrice] = useState(!hasPrice)

  useEffect(() => { if (hasTitle) setApplyTitle(false) }, [hasTitle])
  useEffect(() => { if (hasDescription) setApplyDescription(false) }, [hasDescription])
  useEffect(() => { if (hasCategory) setApplyCategory(false) }, [hasCategory])
  useEffect(() => { if (hasCondition) setApplyCondition(false) }, [hasCondition])
  useEffect(() => { if (hasPrice) setApplyPrice(false) }, [hasPrice])

  if (!data) return null

  const fields: { key: string; label: string; value: string; subtext?: string; loading?: boolean; enabled: boolean; toggle: (v: boolean) => void; hasExisting: boolean }[] = []

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
  if (data.condition) {
    fields.push({
      key: 'condition',
      label: 'Condition',
      value: formatCondition(data.condition),
      enabled: applyCondition,
      toggle: setApplyCondition,
      hasExisting: hasCondition,
    })
  }
  // Price: show loading state or value
  if (data.suggestedPrice || data.priceLoading) {
    fields.push({
      key: 'price',
      label: 'Price',
      value: data.suggestedPrice ? `£${data.suggestedPrice.toFixed(2)}` : '',
      subtext: data.priceReasoning,
      loading: data.priceLoading,
      enabled: applyPrice,
      toggle: setApplyPrice,
      hasExisting: hasPrice,
    })
  }

  if (fields.length === 0) return null

  const anyEnabled = fields.some(f => f.enabled && !f.loading)

  const handleApply = () => {
    const result: AIAutoFillResult = {}
    const outcomes: Record<string, 'kept' | 'rejected'> = {}
    if (data.title) {
      if (applyTitle) { result.title = data.title; outcomes.title = 'kept' }
      else outcomes.title = 'rejected'
    }
    if (data.description) {
      if (applyDescription) { result.description = data.description; outcomes.description = 'kept' }
      else outcomes.description = 'rejected'
    }
    if (data.category) {
      if (applyCategory) { result.category = data.category; outcomes.category = 'kept' }
      else outcomes.category = 'rejected'
    }
    if (data.condition) {
      if (applyCondition) { result.condition = data.condition; outcomes.condition = 'kept' }
      else outcomes.condition = 'rejected'
    }
    if (data.suggestedPrice) {
      if (applyPrice) { result.price = data.suggestedPrice; outcomes.price = 'kept' }
      else outcomes.price = 'rejected'
    }
    onApply(result, outcomes)
  }

  const handleRefineSubmit = async () => {
    const trimmed = refineText.trim()
    if (!trimmed || !onRefine || isRefining) return
    await onRefine(trimmed)
    setRefineText('')
    setRefineOpen(false)
  }

  const confidenceColor = data.confidence === 'high'
    ? 'bg-sage/5 border-sage/20'
    : data.confidence === 'medium'
      ? 'bg-amber-50 border-amber-200'
      : 'bg-slate-50 border-slate-200'

  const confidenceText = data.confidence === 'high'
    ? 'Wren found this'
    : data.confidence === 'medium'
      ? 'Wren suggests'
      : "Wren isn't sure"

  return (
    <div className={`rounded-lg border p-4 ${confidenceColor}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-ink flex items-center gap-1.5">
          <WrenIcon size="sm" />
          {confidenceText}
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
              disabled={field.loading}
              onChange={(e) => field.toggle(e.target.checked)}
              className="mt-0.5 rounded border-sage/30 text-sage focus:ring-sage/30 disabled:opacity-40"
            />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-sage-dim">{field.label}</span>
              {field.hasExisting && !field.loading && (
                <span className="text-xs text-amber-600 ml-1">(will overwrite)</span>
              )}
              {field.loading ? (
                <p className="text-sm text-sage-dim animate-pulse">Loading price...</p>
              ) : (
                <>
                  <p className="text-sm text-ink truncate">{field.value}</p>
                  {field.subtext && (
                    <p className="text-xs text-sage-dim mt-0.5 truncate">{field.subtext}</p>
                  )}
                </>
              )}
            </div>
          </label>
        ))}
      </div>

      {onRefine && (
        <div className="mb-3">
          {!refineOpen ? (
            <button
              type="button"
              onClick={() => setRefineOpen(true)}
              disabled={isRefining}
              className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2 disabled:opacity-50"
            >
              Not quite right? Tell Wren what to fix →
            </button>
          ) : (
            <div className="rounded border border-sage/20 bg-white p-2 space-y-2">
              <textarea
                value={refineText}
                onChange={(e) => setRefineText(e.target.value)}
                placeholder="e.g. it's actually 1970s Hornsea, not Denby. The mark on the base says Saffron."
                rows={2}
                maxLength={500}
                disabled={isRefining}
                className="w-full text-sm px-2 py-1.5 border border-sage/20 rounded resize-none focus:outline-none focus:ring-1 focus:ring-sage/30 disabled:opacity-50"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-sage-dim">{refineText.length}/500</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setRefineOpen(false); setRefineText('') }}
                    disabled={isRefining}
                    className="text-xs text-sage-dim hover:text-ink transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRefineSubmit}
                    disabled={!refineText.trim() || isRefining}
                    className="text-xs px-3 py-1.5 rounded bg-sage text-white hover:bg-sage-lt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isRefining ? 'Wren is rethinking…' : 'Send to Wren'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleApply}
        disabled={!anyEnabled || isRefining}
        className="w-full text-sm px-3 py-2 rounded bg-sage text-white hover:bg-sage-lt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Apply selected
      </button>
    </div>
  )
}
