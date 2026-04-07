'use client'

import { Trash2 } from 'lucide-react'
import { Panel } from '@/components/wren/Panel'
import type { PriceResearchRecord } from '@/types'

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

interface RecentSearchesProps {
  searches: PriceResearchRecord[]
  onReplay: (entry: PriceResearchRecord) => void
  onDelete: (id: string) => void
  isLoading: boolean
}

export default function RecentSearches({ searches, onReplay, onDelete, isLoading }: RecentSearchesProps) {
  if (isLoading) {
    return (
      <Panel>
        <div className="text-xs text-ink-lt text-center py-4">Loading recent searches...</div>
      </Panel>
    )
  }

  if (searches.length === 0) return null

  return (
    <Panel>
      <h3 className="text-xs font-medium text-ink-lt mb-3">recent searches</h3>
      <div className="space-y-2">
        {searches.map((entry) => (
          <div key={entry.id} className="flex items-start gap-2 group">
            <button
              onClick={() => onReplay(entry)}
              className="flex-1 text-left flex items-start gap-3 px-3 py-2 rounded hover:bg-cream-md transition"
            >
              {entry.image_url ? (
                <img
                  src={entry.image_url}
                  alt=""
                  className="w-10 h-10 rounded object-cover shrink-0 border border-border"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-cream-md border border-border flex items-center justify-center text-ink-lt text-sm shrink-0">
                  🔍
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink truncate group-hover:text-sage transition">
                  {entry.title || entry.query}
                </div>
                {entry.description && (
                  <div className="text-xs text-ink-lt truncate mt-0.5">
                    {entry.description}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-ink-lt">
                  {entry.suggested_price && (
                    <span className="font-medium text-ink">£{entry.suggested_price}</span>
                  )}
                  {entry.best_platform && (
                    <span>on {entry.best_platform}</span>
                  )}
                  <span className="ml-auto">{timeAgo(entry.created_at)}</span>
                </div>
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(entry.id) }}
              className="shrink-0 p-2 text-ink-lt hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Panel>
  )
}
