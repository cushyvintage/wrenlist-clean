import { useState, useEffect, useMemo } from 'react'

interface CategoryData {
  value: string
  label: string
  top_level: string
  parent_group: string | null
  platforms: Record<string, { id: string; name: string; path?: string }>
  sort_order: number
}

type CategoryTree = Record<string, CategoryData[]>

let _cache: { tree: CategoryTree; flat: CategoryData[] } | null = null

/**
 * Fetches the category tree from /api/categories?format=tree
 * with aggressive client-side caching (categories rarely change).
 */
export function useCategoryTree() {
  const [tree, setTree] = useState<CategoryTree>(_cache?.tree ?? {})
  const [flat, setFlat] = useState<CategoryData[]>(_cache?.flat ?? [])
  const [isLoading, setIsLoading] = useState(!_cache)

  useEffect(() => {
    if (_cache) return

    const fetchTree = async () => {
      try {
        const res = await fetch('/api/categories?format=tree')
        if (!res.ok) throw new Error('Failed to fetch categories')
        const data: CategoryTree = await res.json()
        const flatList = Object.values(data).flat()
        _cache = { tree: data, flat: flatList }
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
