'use client'

import { Panel } from '@/components/wren/Panel'
import type { ImportableItem } from './types'

interface ImportItemListProps {
  items: ImportableItem[]
  onToggleItem: (id: string) => void
  onToggleAll: () => void
  allSelected: boolean
  totalCount: number
}

export function ImportItemList({
  items,
  onToggleItem,
  onToggleAll,
  allSelected,
  totalCount,
}: ImportItemListProps) {
  if (items.length === 0) {
    return (
      <Panel>
        <div className="text-center py-12 text-sm text-ink-lt">
          No listings found.
        </div>
      </Panel>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-ink-lt">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="w-4 h-4 accent-sage"
          />
          Select all
        </label>
        <span className="text-sm text-ink-lt font-mono">
          showing {items.length} of {totalCount}
        </span>
      </div>

      <Panel className="p-0">
        <div className="divide-y divide-sage/10">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 px-4 py-3 transition ${
                item.alreadyImported ? 'opacity-50' : 'hover:bg-cream'
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked}
                disabled={item.alreadyImported}
                onChange={() => onToggleItem(item.id)}
                className="w-4 h-4 accent-sage flex-shrink-0"
              />

              {/* Thumbnail */}
              <div className="w-10 h-10 rounded bg-cream-md flex-shrink-0 overflow-hidden">
                {item.photo ? (
                  <img
                    src={item.photo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg text-ink-lt">
                    ?
                  </div>
                )}
              </div>

              {/* Info — clickable to open listing */}
              <div className="flex-1 min-w-0">
                {item.listingUrl ? (
                  <a
                    href={item.listingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-ink hover:text-sage truncate block group"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.title}
                    <span className="inline-block ml-1 opacity-0 group-hover:opacity-60 transition text-xs">↗</span>
                  </a>
                ) : (
                  <div className="text-sm font-medium text-ink truncate">{item.title}</div>
                )}
                {item.listingId && (
                  <div className="text-xs text-ink-lt mt-0.5">
                    #{item.listingId}
                  </div>
                )}
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.listingStatus === 'draft' && (
                  <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    draft
                  </span>
                )}
                {item.alreadyImported ? (
                  <span className="text-xs text-ink-lt bg-cream-dk px-2 py-1 rounded">
                    already in wren
                  </span>
                ) : (
                  <span className="text-xs text-sage bg-sage-pale px-2 py-1 rounded">
                    not in wren
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0 w-20">
                {item.price != null ? (
                  <>
                    <div className="text-sm font-mono font-semibold text-ink">
                      £{item.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-ink-lt">asking</div>
                  </>
                ) : (
                  <div className="text-xs text-ink-lt">—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
