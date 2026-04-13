'use client'

import { useState, useEffect, useRef } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import TaxonomySearchModal from './TaxonomySearchModal'
import type { Platform } from '@/types'

interface PlatformMapping {
  id: string
  name: string
  path?: string
}

interface PlatformMappingEditorProps {
  platforms: Record<string, PlatformMapping>
  categoryLabel: string
  onChange: (platforms: Record<string, PlatformMapping>) => void
}

const PLATFORM_LIST: Platform[] = ['ebay', 'vinted', 'shopify', 'etsy', 'depop']

// Platforms that require leaf node IDs for publishing
const LEAF_REQUIRED: Set<string> = new Set(['vinted'])

// Simple similarity check — flags obvious mismatches like "Brass" vs "Bras"
function isSuspiciousMismatch(categoryLabel: string, mappingName: string): boolean {
  if (!categoryLabel || !mappingName) return false
  const a = categoryLabel.toLowerCase().replace(/[^a-z]/g, '')
  const b = mappingName.toLowerCase().replace(/[^a-z]/g, '')
  if (a === b) return false
  // Check if one is a substring of the other (ok) or very different (suspicious)
  if (a.includes(b) || b.includes(a)) return false
  // Check first 3 chars match — if so, likely a prefix issue not a mismatch
  if (a.slice(0, 3) === b.slice(0, 3) && Math.abs(a.length - b.length) <= 2) return false
  // Simple Levenshtein-ish: if names share < 40% of characters, flag it
  const setA = new Set(a.split(''))
  const setB = new Set(b.split(''))
  const intersection = [...setA].filter(c => setB.has(c)).length
  const similarity = intersection / Math.max(setA.size, setB.size)
  return similarity < 0.4
}

export default function PlatformMappingEditor({
  platforms,
  categoryLabel,
  onChange,
}: PlatformMappingEditorProps) {
  const [searchPlatform, setSearchPlatform] = useState<Platform | null>(null)
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)

  const handleSearchSelect = (result: { id: string; name: string; path: string }) => {
    if (!searchPlatform) return
    onChange({
      ...platforms,
      [searchPlatform]: { id: result.id, name: result.name, path: result.path },
    })
    setSearchPlatform(null)
  }

  const handleClear = (platform: string) => {
    const next = { ...platforms }
    delete next[platform]
    onChange(next)
    setEditingPlatform(null)
  }

  const handleManualChange = (platform: string, field: keyof PlatformMapping, value: string) => {
    const current = platforms[platform] ?? { id: '', name: '' }
    onChange({ ...platforms, [platform]: { ...current, [field]: value } })
  }

  // Auto-suggest: fetch best match for unmapped platforms
  const [suggestions, setSuggestions] = useState<Record<string, { id: string; name: string; path: string; is_leaf: boolean } | null>>({})
  const suggestFetchedRef = useRef(false)

  useEffect(() => {
    if (!categoryLabel || suggestFetchedRef.current) return
    suggestFetchedRef.current = true

    // Only fetch suggestions for unmapped platforms
    const unmapped = PLATFORM_LIST.filter((p) => !platforms[p]?.id)
    if (unmapped.length === 0) return

    for (const platform of unmapped) {
      fetch(`/api/admin/categories/taxonomy-search?platform=${platform}&q=${encodeURIComponent(categoryLabel)}`)
        .then((r) => r.json())
        .then((data) => {
          const best = (data.results ?? [])[0]
          if (best) {
            setSuggestions((prev) => ({ ...prev, [platform]: best }))
          }
        })
        .catch(() => {})
    }
  }, [categoryLabel, platforms])

  const handleApplySuggestion = (platform: string) => {
    const suggestion = suggestions[platform]
    if (!suggestion) return
    onChange({
      ...platforms,
      [platform]: { id: suggestion.id, name: suggestion.name, path: suggestion.path },
    })
    setSuggestions((prev) => ({ ...prev, [platform]: null }))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-ink">Platform Mappings</h4>
        {Object.values(suggestions).some(Boolean) && (
          <button
            onClick={() => {
              for (const [p, s] of Object.entries(suggestions)) {
                if (s) handleApplySuggestion(p)
              }
            }}
            className="px-2 py-1 text-[11px] font-medium text-sage hover:text-ink border border-sage/20 rounded hover:border-sage/40 transition-colors"
          >
            Apply all suggestions
          </button>
        )}
      </div>

      {PLATFORM_LIST.map((platform) => {
        const mapping = platforms[platform]
        const isMapped = !!(mapping?.id)
        const isEditing = editingPlatform === platform
        const mismatch = isMapped && isSuspiciousMismatch(categoryLabel, mapping!.name)

        // Status
        let statusColor = 'bg-sage/20'
        let statusLabel = 'Not mapped'
        if (isMapped) {
          if (LEAF_REQUIRED.has(platform) && mapping!.path && !mapping!.path.includes('>')) {
            statusColor = 'bg-amber-400'
            statusLabel = 'Mapped (check leaf)'
          } else {
            statusColor = 'bg-emerald-500'
            statusLabel = 'Mapped'
          }
        }

        return (
          <div
            key={platform}
            className={`rounded-lg border transition-colors ${
              mismatch ? 'border-red-300 bg-red-50/30' : 'border-sage/10 bg-cream/30'
            }`}
          >
            {/* Card header */}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
                <MarketplaceIcon platform={platform} size="sm" />
                <span className="text-xs font-medium text-ink capitalize">{platform}</span>
              </div>

              <div className="flex-1 min-w-0">
                {isMapped ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{mapping!.name}</span>
                      <span className="text-xs text-sage-dim font-mono">{mapping!.id}</span>
                    </div>
                    {mapping!.path && (
                      <p className="text-xs text-sage-dim mt-0.5 break-words leading-relaxed">
                        {mapping!.path}
                      </p>
                    )}
                  </div>
                ) : suggestions[platform] ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-sage-dim italic">Suggested:</span>
                      <span className="text-sm font-medium text-ink">{suggestions[platform]!.name}</span>
                      {suggestions[platform]!.is_leaf ? (
                        <span className="px-1 py-0.5 text-[9px] font-medium bg-emerald-50 text-emerald-700 rounded">leaf</span>
                      ) : (
                        <span className="px-1 py-0.5 text-[9px] font-medium bg-amber-50 text-amber-700 rounded">parent</span>
                      )}
                    </div>
                    <p className="text-xs text-sage-dim mt-0.5">{suggestions[platform]!.path}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApplySuggestion(platform) }}
                      className="mt-1 px-2 py-0.5 text-[11px] font-medium text-white bg-sage rounded hover:bg-sage-lt transition-colors"
                    >
                      Apply suggestion
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-sage-dim italic">Not mapped</span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`w-2 h-2 rounded-full ${statusColor}`} title={statusLabel} />
                <button
                  onClick={() => setSearchPlatform(platform)}
                  className="px-2 py-1 text-[11px] font-medium text-sage hover:text-ink border border-sage/20 rounded hover:border-sage/40 transition-colors"
                >
                  {isMapped ? 'Change' : 'Search'}
                </button>
                {isMapped && (
                  <button
                    onClick={() => setEditingPlatform(isEditing ? null : platform)}
                    className="text-[11px] text-sage-dim hover:text-ink transition-colors"
                    title="Edit manually"
                  >
                    {isEditing ? '▲' : '▼'}
                  </button>
                )}
              </div>
            </div>

            {/* Warnings */}
            {mismatch && (
              <div className="px-3 pb-2 -mt-1">
                <p className="text-[11px] text-red-600 flex items-center gap-1">
                  <span>⚠</span>
                  Name mismatch: &ldquo;{categoryLabel}&rdquo; mapped to &ldquo;{mapping!.name}&rdquo; — check this is correct
                </p>
              </div>
            )}

            {/* Expand to manual edit */}
            {isEditing && (
              <div className="px-3 pb-3 border-t border-sage/7 pt-2 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Platform ID"
                    value={mapping?.id ?? ''}
                    onChange={(e) => handleManualChange(platform, 'id', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={mapping?.name ?? ''}
                    onChange={(e) => handleManualChange(platform, 'name', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
                  />
                  <input
                    type="text"
                    placeholder="Path"
                    value={mapping?.path ?? ''}
                    onChange={(e) => handleManualChange(platform, 'path', e.target.value)}
                    className="px-2 py-1.5 text-xs border border-sage/14 rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage/30"
                  />
                </div>
                <button
                  onClick={() => handleClear(platform)}
                  className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
                >
                  Remove mapping
                </button>
              </div>
            )}
          </div>
        )
      })}

      {/* Taxonomy search modal */}
      {searchPlatform && (
        <TaxonomySearchModal
          platform={searchPlatform}
          onSelect={handleSearchSelect}
          onClose={() => setSearchPlatform(null)}
        />
      )}
    </div>
  )
}
