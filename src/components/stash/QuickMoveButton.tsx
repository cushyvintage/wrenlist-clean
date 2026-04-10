'use client'

import { useState, useEffect, useRef } from 'react'
import { Package } from 'lucide-react'
import { fetchStashesCached, invalidateStashCache, subscribeToStashCache } from '@/lib/stash-cache'
import type { StashWithCount } from '@/types'

interface QuickMoveButtonProps {
  findId: string
  currentStashId: string | null
  currentStashName?: string | null
  onMoved?: () => void
}

/**
 * QuickMoveButton — inline dropdown to move a single find to a stash.
 * Used on the finds list for one-click reassignment without entering edit mode.
 */
export default function QuickMoveButton({ findId, currentStashId, currentStashName, onMoved }: QuickMoveButtonProps) {
  const [open, setOpen] = useState(false)
  const [stashes, setStashes] = useState<StashWithCount[]>([])
  const [moving, setMoving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    fetchStashesCached().then(setStashes).catch(() => {})
    const unsub = subscribeToStashCache(setStashes)
    return unsub
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function move(stashId: string | null) {
    setMoving(true)
    try {
      await fetch('/api/finds/bulk-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findIds: [findId], stashId }),
      })
      // Counts shifted — refresh cache so other cards see the change
      invalidateStashCache()
      fetchStashesCached(true).catch(() => {})
      setOpen(false)
      onMoved?.()
    } finally {
      setMoving(false)
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] hover:bg-sage/20 transition-colors"
        style={{ backgroundColor: 'rgba(90,122,87,0.1)', color: '#5A7A57' }}
        title="Move to stash"
      >
        <Package className="w-3 h-3" />
        {currentStashName ?? 'no stash'}
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 left-0 mt-1 w-56 bg-white border border-sage/14 rounded shadow-lg max-h-64 overflow-y-auto"
        >
          <button
            onClick={() => move(null)}
            disabled={moving || currentStashId === null}
            className="w-full text-left px-3 py-2 text-xs hover:bg-cream-md disabled:opacity-40 border-b border-sage/10"
          >
            — Clear stash —
          </button>
          {stashes.length === 0 && (
            <div className="px-3 py-2 text-xs text-sage-dim">No stashes yet</div>
          )}
          {stashes.map((s) => (
            <button
              key={s.id}
              onClick={() => move(s.id)}
              disabled={moving || s.id === currentStashId}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs hover:bg-cream-md disabled:opacity-40"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Package className="w-3 h-3 text-sage-dim flex-shrink-0" />
                {s.name}
              </span>
              <span className="text-sage-dim">{s.item_count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
