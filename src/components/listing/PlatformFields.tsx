'use client'

import { useState, useMemo } from 'react'
import {
  getFieldSetForCategory,
  getFieldsForMarketplaces,
  transformField,
  type ComponentField,
  type FieldDefinition,
} from '@/lib/marketplace/fieldSchemaLoader'

interface PlatformFieldsProps {
  wrenlistCategory?: string // e.g., 'clothing'
  selectedMarketplaces: string[]
  dynamicFields: Record<string, string>
  onFieldChange: (fieldName: string, value: string) => void
}

export default function PlatformFields({
  wrenlistCategory,
  selectedMarketplaces = ['ebay', 'vinted'],
  dynamicFields = {},
  onFieldChange,
}: PlatformFieldsProps) {
  // For now, use hardcoded category UUID for demo
  // In production, this would map wrenlistCategory to the real UUID
  const categoryUuid = '66e20dc3-8277-50f1-235f-61189e750a90' // Ceramics example

  const fields = useMemo(() => {
    const fieldSet = getFieldSetForCategory(categoryUuid)
    if (!fieldSet) return []

    const fieldsForMarkets = getFieldsForMarketplaces(fieldSet, selectedMarketplaces)

    return fieldsForMarkets.map((f) => ({
      ...transformField(f, dynamicFields[f.n] || ''),
      schemaField: f, // Keep original for reference
    }))
  }, [selectedMarketplaces])

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
          Fields required by{' '}
          {selectedMarketplaces
            .map((m) => (m === 'ebay' ? 'eBay UK' : m === 'vinted' ? 'Vinted' : m))
            .join(' and ')}
          . Wren-suggested fields are pre-filled — review and confirm.
        </span>
      </div>

      {/* Fields */}
      <div className="p-6 space-y-4">
        {fields.length === 0 ? (
          <div className="text-xs text-sage-dim py-4">No fields for selected marketplaces</div>
        ) : (
          fields.map((field) => (
            <div
              key={field.name}
              className={`flex gap-3 items-start pb-4 border-b border-sage/14 last:pb-0 last:border-0 ${
                field.isWrenSuggested ? 'bg-sage-pale/30 -mx-6 px-6 py-4' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-ink mb-2">
                  {field.label}
                  {field.required && <span className="text-red ml-1">*</span>}
                  {field.isWrenSuggested && (
                    <div className="text-sage-lt text-xs font-normal mt-0.5">✦ Wren suggested</div>
                  )}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={field.value}
                    onChange={(e) => onFieldChange(field.name, e.target.value)}
                    className="w-full px-2 py-1.5 border border-sage/14 rounded text-xs text-ink focus:outline-none focus:border-sage/30"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={field.value}
                    onChange={(e) => onFieldChange(field.name, e.target.value)}
                    rows={2}
                    className={`w-full px-2 py-1.5 border rounded text-xs text-ink focus:outline-none focus:border-sage/30 ${
                      field.isWrenSuggested ? 'border-sage/30' : 'border-sage/14'
                    }`}
                  />
                ) : field.type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={field.value === 'true'}
                    onChange={(e) => onFieldChange(field.name, e.target.checked ? 'true' : 'false')}
                    className="h-4 w-4 border border-sage/14 rounded"
                  />
                ) : (
                  <input
                    type={field.type === 'year' ? 'number' : 'text'}
                    value={field.value}
                    onChange={(e) => onFieldChange(field.name, e.target.value)}
                    placeholder={field.isWrenSuggested ? 'Review & confirm' : undefined}
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
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-cream-md px-6 py-3 flex items-center justify-between border-t border-sage/14">
        <div className="text-xs text-sage-dim">
          <strong className="text-ink">{filledCount}</strong> filled · <strong className="text-amber">{totalCount - filledCount}</strong> need input
        </div>
      </div>
    </div>
  )
}
