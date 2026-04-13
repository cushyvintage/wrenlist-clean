'use client'

import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { CategoryRow, Platform } from '@/types'

interface CategoryTableProps {
  categories: CategoryRow[]
  search: string
  onSearchChange: (s: string) => void
  onSelect: (cat: CategoryRow) => void
  onAdd: () => void
}

const PLATFORMS: Platform[] = ['ebay', 'vinted', 'shopify', 'etsy', 'depop']

function formatLabel(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function CategoryTable({
  categories,
  search,
  onSearchChange,
  onSelect,
  onAdd,
}: CategoryTableProps) {
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

      {/* Table */}
      <div className="bg-white rounded-lg border border-sage/14 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream-md border-b border-sage/14">
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
                  <td colSpan={8} className="text-center py-8 text-sage-dim">
                    {search ? 'No categories match your search.' : 'No categories found.'}
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.value}
                    onClick={() => onSelect(cat)}
                    className="border-b border-sage/7 hover:bg-cream/50 cursor-pointer transition-colors"
                  >
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
                    <td className="text-center px-2 py-2 text-xs text-sage-dim">
                      {/* Field count will be populated when we have that data */}
                      &mdash;
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
