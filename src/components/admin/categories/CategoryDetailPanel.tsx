'use client'

import { useState, useEffect } from 'react'
import type { CategoryRow } from '@/types'
import PlatformMappingEditor from './PlatformMappingEditor'
import FieldRequirementsEditor from './FieldRequirementsEditor'

interface CategoryDetailPanelProps {
  category: CategoryRow | null
  isNew: boolean
  onSave: (data: Partial<CategoryRow> & { value: string }) => Promise<void>
  onDelete: (value: string) => Promise<void>
  onClose: () => void
}

const TOP_LEVELS = [
  'antiques', 'art', 'baby_toddler', 'books_media', 'clothing', 'craft_supplies',
  'collectibles', 'electronics', 'health_beauty', 'home_garden', 'musical_instruments',
  'other', 'pet_supplies', 'sports_outdoors', 'toys_games', 'vehicles_parts',
]

function slugify(label: string, topLevel: string): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim()
  return `${topLevel}_${slug}`
}

export default function CategoryDetailPanel({
  category,
  isNew,
  onSave,
  onDelete,
  onClose,
}: CategoryDetailPanelProps) {
  const [label, setLabel] = useState(category?.label ?? '')
  const [value, setValue] = useState(category?.value ?? '')
  const [topLevel, setTopLevel] = useState(category?.top_level ?? 'other')
  const [parentGroup, setParentGroup] = useState(category?.parent_group ?? '')
  const [platforms, setPlatforms] = useState<Record<string, { id: string; name: string; path?: string }>>(category?.platforms ?? {})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (category) {
      setLabel(category.label)
      setValue(category.value)
      setTopLevel(category.top_level)
      setParentGroup(category.parent_group ?? '')
      setPlatforms(category.platforms ?? {})
    } else {
      setLabel('')
      setValue('')
      setTopLevel('other')
      setParentGroup('')
      setPlatforms({})
    }
    setError(null)
    setConfirmDelete(false)
  }, [category])

  const handleLabelChange = (newLabel: string) => {
    setLabel(newLabel)
    if (isNew) {
      setValue(slugify(newLabel, topLevel))
    }
  }

  const handleTopLevelChange = (newTopLevel: string) => {
    setTopLevel(newTopLevel)
    if (isNew && label) {
      setValue(slugify(label, newTopLevel))
    }
  }

  const handleSave = async () => {
    if (!value || !label || !topLevel) {
      setError('Value, label, and top-level are required')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        value,
        label,
        top_level: topLevel,
        parent_group: parentGroup || null,
        platforms,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setIsDeleting(true)
    try {
      await onDelete(value)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white border-l border-sage/14 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-sage/14 bg-cream/50">
        <h2 className="text-sm font-semibold text-ink">
          {isNew ? 'New Category' : `Edit: ${label}`}
        </h2>
        <button onClick={onClose} className="text-sage-dim hover:text-ink transition-colors text-lg leading-none">
          &times;
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
        )}

        {/* General */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-ink">General</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-sage-dim mb-1">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => handleLabelChange(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-sage/14 rounded focus:outline-none focus:ring-2 focus:ring-sage/30"
                placeholder="Women's Dresses"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-dim mb-1">Top-level</label>
              <select
                value={topLevel}
                onChange={(e) => handleTopLevelChange(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-sage/14 rounded focus:outline-none focus:ring-2 focus:ring-sage/30"
              >
                {TOP_LEVELS.map((tl) => (
                  <option key={tl} value={tl}>
                    {tl.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-sage-dim mb-1">
                Value (slug){!isNew && <span className="text-sage-dim/60"> — read-only</span>}
              </label>
              <input
                type="text"
                value={value}
                onChange={(e) => isNew && setValue(e.target.value)}
                readOnly={!isNew}
                className={`w-full px-2 py-1.5 text-sm border border-sage/14 rounded font-mono ${
                  !isNew ? 'bg-cream-md text-sage-dim cursor-not-allowed' : 'focus:outline-none focus:ring-2 focus:ring-sage/30'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-sage-dim mb-1">Parent group</label>
              <input
                type="text"
                value={parentGroup}
                onChange={(e) => setParentGroup(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-sage/14 rounded focus:outline-none focus:ring-2 focus:ring-sage/30"
                placeholder="e.g. womenswear"
              />
            </div>
          </div>
        </div>

        {/* Platform Mappings */}
        <PlatformMappingEditor platforms={platforms} onChange={setPlatforms} />

        {/* Field Requirements — only for existing categories */}
        {!isNew && (
          <FieldRequirementsEditor categoryValue={value} />
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-sage/14 bg-cream/50 flex items-center justify-between">
        <div>
          {!isNew && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`text-xs transition-colors ${
                confirmDelete ? 'text-red-600 font-medium' : 'text-red-400 hover:text-red-600'
              }`}
            >
              {confirmDelete ? 'Click again to confirm delete' : isDeleting ? 'Deleting...' : 'Delete category'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border border-sage/14 rounded hover:bg-cream-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-sm bg-sage text-white rounded hover:bg-sage-lt transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : isNew ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
