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

interface AiMatchResult {
  suggestion: {
    id: string
    name: string
    path: string
    is_leaf: boolean
    confidence: 'high' | 'medium' | 'low'
  } | null
  reasoning: string
}

interface PlatformMappingEditorProps {
  platforms: Record<string, PlatformMapping>
  categoryLabel: string
  categoryValue: string
  topLevel: string
  onChange: (platforms: Record<string, PlatformMapping>) => void
}

const PLATFORM_LIST: Platform[] = ['ebay', 'vinted', 'shopify', 'etsy', 'depop']

// Platforms that require leaf node IDs for publishing
const LEAF_REQUIRED: Set<string> = new Set(['vinted'])

// Words that are common prefixes/qualifiers — not meaningful for noun comparison
const FILLER_WORDS = new Set([
  'antique', 'antiques', 'vintage', 'other', 'others', 'general', 'misc',
  'miscellaneous', 'various', 'assorted', 'mixed', 'used', 'new', 'modern',
  'classic', 'retro', 'old', 'rare', 'handmade', 'custom', 'mens', 'womens',
  'mens', 'womens', 'kids', 'baby', 'small', 'large', 'medium', 'mini',
])

/** Extract the "core noun" — the last significant word after stripping filler */
function coreNoun(name: string): string {
  const words = name.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/)
  // Walk from the end to find the first non-filler word
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i] ?? ''
    if (!FILLER_WORDS.has(w) && w.length > 1) return w
  }
  // All words are filler — return the last word as-is
  return words.at(-1) ?? ''
}

// Flags obvious mismatches like "Antique electronics" mapped to "Other accessories"
function isSuspiciousMismatch(categoryLabel: string, mappingName: string): boolean {
  if (!categoryLabel || !mappingName) return false

  const a = categoryLabel.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const b = mappingName.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  if (a === b) return false

  // Full-string substring check (handles "Books" vs "Antique books")
  const aStripped = a.replace(/\s+/g, '')
  const bStripped = b.replace(/\s+/g, '')
  if (aStripped.includes(bStripped) || bStripped.includes(aStripped)) return false

  // Core noun comparison — the main check
  const nounA = coreNoun(categoryLabel)
  const nounB = coreNoun(mappingName)

  if (nounA && nounB) {
    // Exact match or one contains the other (e.g. "dress" vs "dresses")
    if (nounA === nounB || nounA.includes(nounB) || nounB.includes(nounA)) return false
    // Core nouns are completely different → flag mismatch
    return true
  }

  // Fallback: character-set similarity for edge cases (both nouns empty, etc.)
  const setA = new Set(aStripped.split(''))
  const setB = new Set(bStripped.split(''))
  const intersection = [...setA].filter(c => setB.has(c)).length
  const similarity = intersection / Math.max(setA.size, setB.size)
  return similarity < 0.4
}

/** Fire-and-forget POST to suggestion log — never blocks UI */
function logSuggestion(payload: {
  categoryValue: string
  platform: string
  suggestedId?: string
  suggestedName?: string
  action: 'accepted' | 'rejected' | 'changed'
  finalId?: string
  finalName?: string
  source?: string
}) {
  fetch('/api/admin/categories/suggestion-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {/* silent */})
}

export default function PlatformMappingEditor({
  platforms,
  categoryLabel,
  categoryValue,
  topLevel,
  onChange,
}: PlatformMappingEditorProps) {
  const [searchPlatform, setSearchPlatform] = useState<Platform | null>(null)
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null)
  const [aiMatchLoading, setAiMatchLoading] = useState<Record<string, boolean>>({})
  const [aiMatchResults, setAiMatchResults] = useState<Record<string, AiMatchResult>>({})

  const handleAiMatch = async (platform: string) => {
    if (!categoryLabel || !categoryValue || !topLevel) return
    setAiMatchLoading((prev) => ({ ...prev, [platform]: true }))
    try {
      const res = await fetch('/api/admin/categories/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryLabel, categoryValue, topLevel, platform }),
      })
      if (!res.ok) {
        const err = await res.json()
        setAiMatchResults((prev) => ({
          ...prev,
          [platform]: { suggestion: null, reasoning: (err as { error?: string }).error ?? 'Request failed' },
        }))
        return
      }
      const data = (await res.json()) as AiMatchResult
      setAiMatchResults((prev) => ({ ...prev, [platform]: data }))
    } catch (err) {
      setAiMatchResults((prev) => ({
        ...prev,
        [platform]: { suggestion: null, reasoning: (err as Error).message },
      }))
    } finally {
      setAiMatchLoading((prev) => ({ ...prev, [platform]: false }))
    }
  }

  const handleApplyAiMatch = (platform: string) => {
    const result = aiMatchResults[platform]
    if (!result?.suggestion) return
    onChange({
      ...platforms,
      [platform]: { id: result.suggestion.id, name: result.suggestion.name, path: result.suggestion.path },
    })
    logSuggestion({
      categoryValue,
      platform,
      suggestedId: result.suggestion.id,
      suggestedName: result.suggestion.name,
      action: 'accepted',
      source: 'ai_match',
    })
    setAiMatchResults((prev) => ({ ...prev, [platform]: undefined as unknown as AiMatchResult }))
  }

  const handleSearchSelect = (result: { id: string; name: string; path: string }) => {
    if (!searchPlatform) return
    onChange({
      ...platforms,
      [searchPlatform]: { id: result.id, name: result.name, path: result.path },
    })

    // Log as 'changed' if there was a pending suggestion or AI match for this platform
    const pendingSuggestion = suggestions[searchPlatform]
    const pendingAi = aiMatchResults[searchPlatform]?.suggestion
    if (pendingSuggestion) {
      logSuggestion({
        categoryValue,
        platform: searchPlatform,
        suggestedId: pendingSuggestion.id,
        suggestedName: pendingSuggestion.name,
        action: 'changed',
        finalId: result.id,
        finalName: result.name,
        source: 'auto_suggest',
      })
    } else if (pendingAi) {
      logSuggestion({
        categoryValue,
        platform: searchPlatform,
        suggestedId: pendingAi.id,
        suggestedName: pendingAi.name,
        action: 'changed',
        finalId: result.id,
        finalName: result.name,
        source: 'ai_match',
      })
    }

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
  const platformsRef = useRef(platforms)
  platformsRef.current = platforms

  useEffect(() => {
    if (!categoryLabel) return
    let cancelled = false

    const STOP_WORDS = new Set(['and', 'the', 'of', 'for', 'in', 'on', 'at', 'to', 'a', 'an', 'other', 'general', 'misc'])
    const words = categoryLabel.replace(/[&,()]/g, '').split(/\s+/).filter(Boolean)
    const queries = [categoryLabel]
    if (words.length > 2) queries.push(words.slice(0, 2).join(' '))
    const individualWords = [...words]
      .sort((a, b) => b.length - a.length)
      .filter((w) => w.length >= 3 && !STOP_WORDS.has(w.toLowerCase()))
    for (const w of individualWords) {
      if (!queries.includes(w)) queries.push(w)
    }

    const unmapped = PLATFORM_LIST.filter((p) => !platformsRef.current[p]?.id)
    if (unmapped.length === 0) return

    async function fetchSuggestion(platform: string) {
      for (const q of queries) {
        if (q.length < 2 || cancelled) continue
        try {
          const res = await fetch(`/api/admin/categories/taxonomy-search?platform=${platform}&q=${encodeURIComponent(q)}`)
          const data = await res.json()
          const best = (data.results ?? [])[0]
          if (best && !cancelled) {
            setSuggestions((prev) => ({ ...prev, [platform]: best }))
            return
          }
        } catch { /* continue to next query */ }
      }
    }

    setSuggestions({})
    for (const platform of unmapped) {
      fetchSuggestion(platform)
    }

    return () => { cancelled = true }
  }, [categoryLabel]) // only re-run when label changes, not on every platforms object change

  const handleApplySuggestion = (platform: string) => {
    const suggestion = suggestions[platform]
    if (!suggestion) return
    onChange({
      ...platforms,
      [platform]: { id: suggestion.id, name: suggestion.name, path: suggestion.path },
    })
    logSuggestion({
      categoryValue,
      platform,
      suggestedId: suggestion.id,
      suggestedName: suggestion.name,
      action: 'accepted',
      source: 'auto_suggest',
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
                ) : aiMatchResults[platform]?.suggestion ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-500 font-medium">AI Match:</span>
                      <span className="text-sm font-medium text-ink">{aiMatchResults[platform]!.suggestion!.name}</span>
                      <span className={`px-1 py-0.5 text-[9px] font-medium rounded ${
                        aiMatchResults[platform]!.suggestion!.confidence === 'high'
                          ? 'bg-emerald-50 text-emerald-700'
                          : aiMatchResults[platform]!.suggestion!.confidence === 'medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {aiMatchResults[platform]!.suggestion!.confidence}
                      </span>
                      {aiMatchResults[platform]!.suggestion!.is_leaf && (
                        <span className="px-1 py-0.5 text-[9px] font-medium bg-emerald-50 text-emerald-700 rounded">leaf</span>
                      )}
                    </div>
                    <p className="text-xs text-sage-dim mt-0.5">{aiMatchResults[platform]!.suggestion!.path}</p>
                    <p className="text-[11px] text-sage-dim/70 mt-0.5 italic">{aiMatchResults[platform]!.reasoning}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApplyAiMatch(platform) }}
                      className="mt-1 px-2 py-0.5 text-[11px] font-medium text-white bg-indigo-500 rounded hover:bg-indigo-600 transition-colors"
                    >
                      Apply AI match
                    </button>
                  </div>
                ) : aiMatchResults[platform] && !aiMatchResults[platform]!.suggestion ? (
                  <div>
                    <span className="text-xs text-sage-dim italic">No AI match found</span>
                    <p className="text-[11px] text-sage-dim/70 mt-0.5 italic">{aiMatchResults[platform]!.reasoning}</p>
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
                {!isMapped && !suggestions[platform] && categoryValue && (
                  <button
                    onClick={() => handleAiMatch(platform)}
                    disabled={!!aiMatchLoading[platform]}
                    className="px-2 py-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-700 border border-indigo-200 rounded hover:border-indigo-400 transition-colors disabled:opacity-50"
                  >
                    {aiMatchLoading[platform] ? 'Matching...' : 'AI Match'}
                  </button>
                )}
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
