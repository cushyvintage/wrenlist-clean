'use client'

import { useState, useEffect, useRef } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { Platform } from '@/types'

interface TaxonomyResult {
  id: string
  name: string
  path: string
  is_leaf: boolean
  depth: number
}

interface TaxonomySearchModalProps {
  platform: Platform
  onSelect: (result: { id: string; name: string; path: string }) => void
  onClose: () => void
}

export default function TaxonomySearchModal({ platform, onSelect, onClose }: TaxonomySearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TaxonomyResult[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/admin/categories/taxonomy-search?platform=${platform}&q=${encodeURIComponent(query)}`
        )
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setResults(data.results ?? [])
        setTotal(data.total ?? 0)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, platform])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[70vh]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-sage/14 flex items-center gap-3">
          <MarketplaceIcon platform={platform} size="md" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-ink capitalize">
              Search {platform} categories
            </h3>
            {total > 0 && (
              <p className="text-xs text-sage-dim">{total.toLocaleString()} categories in taxonomy</p>
            )}
          </div>
          <button onClick={onClose} className="text-sage-dim hover:text-ink text-lg leading-none">
            &times;
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-sage/10">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search by name or path...`}
            className="w-full px-3 py-2 text-sm border border-sage/14 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-sage/30"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-xs text-red-600">{error}</div>
          )}

          {query.length < 2 ? (
            <div className="px-4 py-8 text-center text-sm text-sage-dim">
              Type at least 2 characters to search
            </div>
          ) : isLoading ? (
            <div className="px-4 py-8 text-center text-sm text-sage-dim animate-pulse">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-sage-dim">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-sage/7">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => onSelect({ id: result.id, name: result.name, path: result.path })}
                  className="w-full text-left px-4 py-3 hover:bg-cream/50 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{result.name}</span>
                        {result.is_leaf ? (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded">
                            leaf
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded">
                            parent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-sage-dim mt-0.5 break-words">{result.path}</p>
                    </div>
                    <span className="text-xs text-sage-dim/60 font-mono flex-shrink-0 mt-0.5">
                      {result.id}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
