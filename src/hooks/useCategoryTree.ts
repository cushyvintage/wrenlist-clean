import { useState, useEffect, useMemo } from 'react'

interface CategoryData {
  value: string
  label: string
  top_level: string
  parent_group: string | null
  platforms: Record<string, { id: string; name: string; path?: string }>
  sort_order: number
  /** Historical aliases (e.g. "ceramics_plates") kept so picker search still finds
   *  categories under their old names. Not shown in UI; used by search filter. */
  legacy_values: string[] | null
}

type CategoryTree = Record<string, CategoryData[]>

let _cache: { tree: CategoryTree; flat: CategoryData[]; fetchedAt: number } | null = null
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Fetches the category tree from /api/categories?format=tree
 * with client-side caching (TTL: 10 minutes).
 */
export function useCategoryTree() {
  const [tree, setTree] = useState<CategoryTree>(_cache?.tree ?? {})
  const [flat, setFlat] = useState<CategoryData[]>(_cache?.flat ?? [])
  const [isLoading, setIsLoading] = useState(!_cache || Date.now() - _cache.fetchedAt >= CACHE_TTL_MS)

  useEffect(() => {
    if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) return

    const fetchTree = async () => {
      try {
        const res = await fetch('/api/categories?format=tree')
        if (!res.ok) throw new Error('Failed to fetch categories')
        const data: CategoryTree = await res.json()
        const flatList = Object.values(data).flat()
        _cache = { tree: data, flat: flatList, fetchedAt: Date.now() }
        setTree(data)
        setFlat(flatList)
      } catch {
        // Silent fail — CategoryPicker will show empty state
      } finally {
        setIsLoading(false)
      }
    }

    fetchTree()
  }, [])

  const topLevelKeys = useMemo(() => Object.keys(tree).sort(), [tree])

  /** Get the platform-specific category ID for a canonical value */
  const getPlatformId = (value: string, platform: string): string | undefined => {
    const node = flat.find((c) => c.value === value)
    return node?.platforms?.[platform]?.id
  }

  /** Get a category node by value */
  const getNode = (value: string): CategoryData | undefined => {
    return flat.find((c) => c.value === value)
  }

  /** Get the top-level key for a canonical value */
  const getTopLevel = (value: string): string => {
    const node = flat.find((c) => c.value === value)
    if (node) return node.top_level
    // Fallback: derive from value string
    const parts = value.split('_')
    return parts[0] ?? value
  }

  /** Invalidate cache (call after admin edits) */
  const invalidate = () => {
    _cache = null
  }

  return { tree, flat, topLevelKeys, isLoading, getPlatformId, getNode, getTopLevel, invalidate }
}
