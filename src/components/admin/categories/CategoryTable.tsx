'use client'

import { useState } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { CategoryRow, Platform } from '@/types'

interface CategoryTableProps {
  categories: CategoryRow[]
  search: string
  onSearchChange: (s: string) => void
  onSelect: (cat: CategoryRow) => void
  onAdd: () => void
  onBulkAction?: (values: string[], action: string) => void
}

const PLATFORMS: Platform[] = ['ebay', 'vinted', 'shopify', 'etsy', 'depop']

export default function CategoryTable({
  categories,
  search,
  onSearchChange,
  onSelect,
  onAdd,
  onBulkAction,
}: CategoryTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleSelect = (value: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === categories.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(categories.map((c) => c.value)))
    }
  }

  const handleBulk = (action: string) => {
    if (onBulkAction && selected.size > 0) {
      onBulkAction([...selected], action)
      setSelected(new Set())
    }
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Search + Add */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-sage/14 rounded bg-white focus:outline-none focus:ring-2 focus:ring-sage/30"
        />
        <button
          onClick={onAdd}
          className="px-3 py-2 text-sm bg-sage text-white rounded hover:bg-sage-lt transition-colors flex-shrink-0"
        >
          + Add category
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-2 px-3 py-2 bg-sage/5 border border-sage/14 rounded-lg flex items-center gap-3 text-xs">
          <span className="font-medium text-ink">{selected.size} selected</span>
          <button
            onClick={() => handleBulk('auto_match_vinted')}
            className="px-2 py-1 bg-white border border-sage/20 rounded hover:bg-cream transition-colors"
          >
            Auto-match Vinted
          </button>
          <button
            onClick={() => handleBulk('auto_match_ebay')}
            className="px-2 py-1 bg-white border border-sage/20 rounded hover:bg-cream transition-colors"
          >
            Auto-match eBay
          </button>
          <button
            onClick={() => handleBulk('import_fields')}
            className="px-2 py-1 bg-white border border-sage/20 rounded hover:bg-cream transition-colors"
          >
            Import field requirements
          </button>
          <button
            onClick={() => handleBulk('delete')}
            className="px-2 py-1 bg-white border border-red-200 rounded text-red-500 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setSelected(new Set())}
            className="text-sage-dim hover:text-ink transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-sage/14 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-md border-b border-sage/14">
                <th className="text-center px-2 py-2 w-8">
                  <input
                    type="checkbox"
                    checked={categories.length > 0 && selected.size === categories.length}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-sage/30 text-sage focus:ring-sage/30"
                  />
                </th>
                <th className="text-left px-3 py-2 font-medium text-sage-dim">Label</th>
                <th className="text-left px-3 py-2 font-medium text-sage-dim">Value</th>
                {PLATFORMS.map((p) => (
                  <th key={p} className="text-center px-2 py-2 font-medium text-sage-dim">
                    <MarketplaceIcon platform={p} size="sm" />
                  </th>
                ))}
                <th className="text-center px-2 py-2 font-medium text-sage-dim">Fields</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-sage-dim">
                    {search ? 'No categories match your search.' : 'No categories found.'}
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.value}
                    onClick={() => onSelect(cat)}
                    className={`border-b border-sage/7 hover:bg-cream/50 cursor-pointer transition-colors ${
                      selected.has(cat.value) ? 'bg-sage/5' : ''
                    }`}
                  >
                    <td className="text-center px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(cat.value)}
                        onClick={(e) => toggleSelect(cat.value, e)}
                        onChange={() => {}} // controlled by onClick
                        className="w-3.5 h-3.5 rounded border-sage/30 text-sage focus:ring-sage/30"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-ink max-w-[200px] truncate">
                      {cat.label}
                    </td>
                    <td className="px-3 py-2 text-sage-dim text-xs font-mono max-w-[200px] truncate">
                      {cat.value}
                    </td>
                    {PLATFORMS.map((p) => {
                      const mapped = !!(cat.platforms as Record<string, unknown>)?.[p]
                      return (
                        <td key={p} className="text-center px-2 py-2">
                          {mapped ? (
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title={`Mapped to ${p}`} />
                          ) : (
                            <span className="inline-block w-2 h-2 rounded-full bg-sage/20" title={`Not mapped to ${p}`} />
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center px-2 py-2 text-xs">
                      {(() => {
                        const fc = (cat as any).field_counts as Record<string, { total: number; required: number }> | undefined
                        if (!fc || Object.keys(fc).length === 0) {
                          return <span className="text-sage/30">&mdash;</span>
                        }
                        const ebay = fc.ebay
                        const vinted = fc.vinted
                        const parts: string[] = []
                        if (ebay) parts.push(`E:${ebay.total}${ebay.required > 0 ? `(${ebay.required}*)` : ''}`)
                        if (vinted) parts.push(`V:${vinted.total}${vinted.required > 0 ? `(${vinted.required}*)` : ''}`)
                        return (
                          <span className="text-sage-dim" title="E=eBay, V=Vinted, *=required fields">
                            {parts.join(' ')}
                          </span>
                        )
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {categories.length > 0 && (
          <div className="px-3 py-2 bg-cream-md border-t border-sage/14 text-xs text-sage-dim">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </div>
        )}
      </div>
    </div>
  )
}
