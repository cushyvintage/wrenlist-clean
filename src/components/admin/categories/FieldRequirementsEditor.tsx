'use client'

import { useState, useEffect } from 'react'
import type { CategoryFieldRequirementRow, Platform } from '@/types'
import { fetchApi } from '@/lib/api-utils'

interface FieldDef {
  name: string
  label: string
  type: 'text' | 'select'
  required: boolean
  highlighted?: boolean
  options?: string[]
}

interface FieldRequirementsEditorProps {
  categoryValue: string
}

const PLATFORMS: Platform[] = ['ebay', 'vinted']

export default function FieldRequirementsEditor({ categoryValue }: FieldRequirementsEditorProps) {
  const [activeTab, setActiveTab] = useState<Platform>('ebay')
  const [fieldReqs, setFieldReqs] = useState<Record<string, FieldDef[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchFields = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/admin/categories/${encodeURIComponent(categoryValue)}/fields`)
        if (!res.ok) throw new Error('Failed to fetch')
        const json = await res.json()
        const reqs: Record<string, FieldDef[]> = {}
        for (const row of json.data ?? []) {
          reqs[row.platform] = row.fields ?? []
        }
        setFieldReqs(reqs)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }
    fetchFields()
  }, [categoryValue])

  const currentFields = fieldReqs[activeTab] ?? []

  const handleFieldChange = (index: number, key: keyof FieldDef, value: unknown) => {
    const updated = [...currentFields]
    updated[index] = { ...updated[index]!, [key]: value }
    setFieldReqs({ ...fieldReqs, [activeTab]: updated })
  }

  const handleAddField = () => {
    const updated = [...currentFields, { name: '', label: '', type: 'text' as const, required: false }]
    setFieldReqs({ ...fieldReqs, [activeTab]: updated })
  }

  const handleRemoveField = (index: number) => {
    const updated = currentFields.filter((_, i) => i !== index)
    setFieldReqs({ ...fieldReqs, [activeTab]: updated })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/admin/categories/${encodeURIComponent(categoryValue)}/fields`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: activeTab, fields: currentFields }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="text-xs text-sage-dim animate-pulse py-4">Loading field requirements...</div>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">Field Requirements</h4>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          {success && <span className="text-xs text-emerald-600">Saved</span>}
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1 border-b border-sage/14">
        {PLATFORMS.map((p) => {
          const count = (fieldReqs[p] ?? []).length
          return (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === p
                  ? 'text-sage border-b-2 border-sage'
                  : 'text-sage-dim hover:text-ink'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
              {count > 0 && <span className="ml-1 text-sage-dim">({count})</span>}
            </button>
          )
        })}
      </div>

      {/* Fields table */}
      {currentFields.length === 0 ? (
        <p className="text-xs text-sage-dim py-4 text-center">No field requirements for {activeTab}.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="grid grid-cols-[1fr_1fr_80px_60px_60px_32px] gap-1.5 text-xs font-medium text-sage-dim px-1">
            <span>Name</span>
            <span>Label</span>
            <span>Type</span>
            <span>Req?</span>
            <span>Highlight</span>
            <span />
          </div>
          {currentFields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_80px_60px_60px_32px] gap-1.5 items-center">
              <input
                type="text"
                value={field.name}
                onChange={(e) => handleFieldChange(i, 'name', e.target.value)}
                className="px-2 py-1 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
                placeholder="Name"
              />
              <input
                type="text"
                value={field.label}
                onChange={(e) => handleFieldChange(i, 'label', e.target.value)}
                className="px-2 py-1 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
                placeholder="Label"
              />
              <select
                value={field.type}
                onChange={(e) => handleFieldChange(i, 'type', e.target.value)}
                className="px-1 py-1 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
              >
                <option value="text">text</option>
                <option value="select">select</option>
              </select>
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => handleFieldChange(i, 'required', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-sage/30 text-sage focus:ring-sage/30"
                />
              </label>
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={field.highlighted ?? false}
                  onChange={(e) => handleFieldChange(i, 'highlighted', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-sage/30 text-sage focus:ring-sage/30"
                />
              </label>
              <button
                onClick={() => handleRemoveField(i)}
                className="text-red-400 hover:text-red-600 text-xs transition-colors"
                title="Remove field"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handleAddField}
          className="text-xs text-sage hover:text-sage-lt transition-colors underline"
        >
          + Add field
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs bg-sage text-white rounded hover:bg-sage-lt transition-colors disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save fields'}
        </button>
      </div>
    </div>
  )
}
