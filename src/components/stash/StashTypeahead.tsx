'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Package, Plus } from 'lucide-react'
import type { Stash, StashWithCount } from '@/types'
import { unwrapApiResponse } from '@/lib/api-utils'

interface StashTypeaheadProps {
  /** Currently selected stash id (or null) */
  value: string | null
  /** Called when user picks an existing stash or creates a new one */
  onChange: (stashId: string | null, stashName: string | null) => void
  placeholder?: string
}

/**
 * StashTypeahead — search existing stashes with inline "+ Create new" option.
 * Fetches all user stashes once on mount (there are typically <50), filters client-side.
 */
export default function StashTypeahead({ value, onChange, placeholder = 'Search or create a stash…' }: StashTypeaheadProps) {
  const [allStashes, setAllStashes] = useState<StashWithCount[]>([])
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Load stashes once
  const loadStashes = useCallback(async () => {
    try {
      const res = await fetch('/api/stashes')
      if (!res.ok) return
      const json = await res.json()
      const data = unwrapApiResponse<StashWithCount[]>(json)
      setAllStashes(data ?? [])
    } catch {
      // Silent failure — typeahead will just be empty
    }
  }, [])

  useEffect(() => { loadStashes() }, [loadStashes])

  // Reflect selected stash name in the input when value changes externally
  useEffect(() => {
    if (value && allStashes.length > 0) {
      const found = allStashes.find(s => s.id === value)
      if (found) setQuery(found.name)
    } else if (value === null) {
      setQuery('')
    }
  }, [value, allStashes])

  const trimmed = query.trim()
  const lower = trimmed.toLowerCase()
  const filtered = trimmed
    ? allStashes.filter(s => s.name.toLowerCase().includes(lower))
    : allStashes.slice(0, 8)
  const exactMatch = allStashes.find(s => s.name.toLowerCase() === lower)
  const showCreate = trimmed.length > 0 && !exactMatch

  const handleSelect = (stash: Stash) => {
    setQuery(stash.name)
    onChange(stash.id, stash.name)
    setIsOpen(false)
  }

  const handleCreate = async () => {
    if (!trimmed || isCreating) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/stashes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) return
      const json = await res.json()
      const created = unwrapApiResponse<Stash>(json)
      if (created) {
        setAllStashes(prev => [...prev, { ...created, item_count: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
        handleSelect(created)
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleClear = () => {
    setQuery('')
    onChange(null, null)
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    const maxIndex = filtered.length - 1 + (showCreate ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => Math.min(prev + 1, maxIndex))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        handleSelect(filtered[activeIndex]!)
      } else if (showCreate) {
        void handleCreate()
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  return (
    <div className="relative">
      <div className="relative">
        <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sage-dim pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setActiveIndex(-1) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full pl-9 pr-9 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
          placeholder={placeholder}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sage-dim hover:text-ink text-sm px-1"
            tabIndex={-1}
            aria-label="Clear stash"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (filtered.length > 0 || showCreate) && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-sage/14 rounded shadow-lg max-h-64 overflow-y-auto"
        >
          {filtered.map((stash, i) => (
            <li
              key={stash.id}
              onMouseDown={() => handleSelect(stash)}
              className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors ${
                i === activeIndex ? 'bg-sage/10 text-sage' : 'text-ink hover:bg-cream-md'
              }`}
            >
              <span className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-sage-dim" />
                {stash.name}
              </span>
              <span className="text-xs text-sage-dim">{stash.item_count}</span>
            </li>
          ))}
          {showCreate && (
            <li
              onMouseDown={() => void handleCreate()}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer border-t border-sage/10 ${
                activeIndex === filtered.length ? 'bg-sage/10 text-sage' : 'text-sage hover:bg-cream-md'
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              {isCreating ? 'Creating…' : <>Create new: <strong>{trimmed}</strong></>}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
