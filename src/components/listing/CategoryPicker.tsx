'use client'

import { useState, useMemo } from 'react'
import { CATEGORY_TREE } from '@/data/marketplace-category-map'
import type { CategoryNode } from '@/types/categories'

interface CategoryPickerProps {
  value: string
  onChange: (categoryValue: string, categoryNode?: CategoryNode) => void
  selectedPlatforms: string[]
}

/** Threshold: show search + grouping when subcategory count exceeds this */
const SEARCH_THRESHOLD = 20

export default function CategoryPicker({
  value,
  onChange,
  selectedPlatforms,
}: CategoryPickerProps) {
  const [step, setStep] = useState<'category' | 'subcategory'>('category')
  const [search, setSearch] = useState('')

  const topLevelCategories = useMemo(
    () => Object.keys(CATEGORY_TREE).sort(),
    []
  )

  const selectedTopLevel = useMemo(() => {
    if (!value) return null
    for (const [topKey, subcats] of Object.entries(CATEGORY_TREE)) {
      for (const node of Object.values(subcats)) {
        if (node.value === value) return topKey
      }
    }
    const parts = value.split('_')
    return parts[0] ?? null
  }, [value])

  const subcategories = useMemo(() => {
    if (!selectedTopLevel) return []
    const catTree = CATEGORY_TREE[selectedTopLevel]
    if (!catTree) return []
    return Object.values(catTree)
  }, [selectedTopLevel])

  // Filter subcategories by search query
  const filteredSubcategories = useMemo(() => {
    if (!search.trim()) return subcategories
    const q = search.toLowerCase().trim()
    return subcategories.filter(
      (node) =>
        node.label.toLowerCase().includes(q) ||
        node.value.toLowerCase().includes(q)
    )
  }, [subcategories, search])

  // Group subcategories by L2 prefix when the list is large
  // e.g. "advertising_general" and "advertising_food_and_bev" → group "Advertising"
  const groupedSubcategories = useMemo(() => {
    if (!selectedTopLevel) return []
    const items = filteredSubcategories
    if (items.length <= SEARCH_THRESHOLD) {
      // Small list — no grouping needed
      return [{ group: null, items }]
    }

    // Extract the group prefix from subcategory keys
    // key format: "advertising_general" → group = "advertising"
    const catTree = CATEGORY_TREE[selectedTopLevel]
    if (!catTree) return [{ group: null, items }]

    const groups: { group: string | null; items: CategoryNode[] }[] = []
    const groupMap = new Map<string, CategoryNode[]>()

    for (const node of items) {
      // Get the subcategory key by removing the top-level prefix from the value
      const suffix = node.value.replace(`${selectedTopLevel}_`, '')
      const parts = suffix.split('_')
      // Group key is the first segment of the suffix (e.g. "advertising", "womenswear")
      const groupKey = parts.length > 1 ? (parts[0] ?? '__ungrouped') : '__ungrouped'
      const existing = groupMap.get(groupKey)
      if (existing) {
        existing.push(node)
      } else {
        groupMap.set(groupKey, [node])
      }
    }

    // Only use grouping if there are multiple groups
    if (groupMap.size <= 1) {
      return [{ group: null, items }]
    }

    for (const [key, nodes] of groupMap.entries()) {
      const label = key === '__ungrouped'
        ? 'Other'
        : key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      groups.push({ group: label, items: nodes })
    }

    return groups.sort((a, b) => (a.group ?? '').localeCompare(b.group ?? ''))
  }, [filteredSubcategories, selectedTopLevel])

  const selectedNode = useMemo(() => {
    if (!value || !selectedTopLevel) return null
    const subs = CATEGORY_TREE[selectedTopLevel]
    if (!subs) return null
    for (const sub of Object.values(subs)) {
      if (sub.value === value) return sub
    }
    return null
  }, [value, selectedTopLevel])

  const handleSelectSubcategory = (node: CategoryNode) => {
    onChange(node.value, node)
    setStep('category')
    setSearch('')
  }

  const handleBack = () => {
    setStep('category')
    setSearch('')
  }

  const handleCategoryClick = (cat: string) => {
    const catTree = CATEGORY_TREE[cat]
    if (!catTree) return
    const subs = Object.values(catTree)
    if (subs.length === 1 && subs[0]) {
      onChange(subs[0].value, subs[0])
      return
    }
    const firstSub = subs[0]
    if (firstSub) {
      onChange(firstSub.value, firstSub)
    }
    setStep('subcategory')
  }

  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  const showSearch = subcategories.length > SEARCH_THRESHOLD

  const renderPlatformInfo = (node: CategoryNode, small = false) => {
    const cls = small ? 'text-xs opacity-75' : 'text-xs text-sage-dim'
    return (
      <>
        {selectedPlatforms.includes('ebay') && node.platforms.ebay && (
          <p className={cls}>eBay: {node.platforms.ebay.name}</p>
        )}
        {selectedPlatforms.includes('vinted') && node.platforms.vinted && (
          <p className={cls}>Vinted: {node.platforms.vinted.name}</p>
        )}
        {selectedPlatforms.includes('shopify') && node.platforms.shopify && (
          <p className={cls}>Shopify: {node.platforms.shopify.name}</p>
        )}
        {selectedPlatforms.includes('etsy') && node.platforms.etsy && (
          <p className={cls}>Etsy: {node.platforms.etsy.name}</p>
        )}
        {selectedPlatforms.includes('depop') && node.platforms.depop && (
          <p className={cls}>Depop: {node.platforms.depop.name}</p>
        )}
      </>
    )
  }

  return (
    <div className="space-y-3">
      {step === 'category' ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {topLevelCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  selectedTopLevel === cat
                    ? 'bg-sage text-white ring-2 ring-sage/50'
                    : 'bg-cream-md border border-sage/14 text-ink hover:bg-cream'
                }`}
              >
                {formatLabel(cat)}
              </button>
            ))}
          </div>

          {selectedNode && (
            <div className="mt-4 p-3 bg-cream-md rounded-lg border border-sage/14">
              <p className="text-xs text-sage-dim mb-1">Selected subcategory:</p>
              <p className="text-sm font-semibold text-ink">{selectedNode.label}</p>
              <div className="mt-2 space-y-1">
                {renderPlatformInfo(selectedNode)}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleBack}
              className="text-sm text-sage-dim hover:text-ink"
            >
              ← Back
            </button>
            <span className="text-sm font-medium text-ink">
              {selectedTopLevel ? formatLabel(selectedTopLevel) : ''}
            </span>
            <span className="text-xs text-sage-dim">
              ({filteredSubcategories.length})
            </span>
          </div>

          {showSearch && (
            <input
              type="text"
              placeholder="Search subcategories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-sage/14 bg-white focus:outline-none focus:ring-2 focus:ring-sage/30"
              autoFocus
            />
          )}

          <div className="max-h-80 overflow-y-auto space-y-1">
            {groupedSubcategories.map(({ group, items }) => (
              <div key={group ?? '__all'}>
                {group && (
                  <div className="text-xs font-semibold text-sage-dim uppercase tracking-wide mt-3 mb-1 px-1">
                    {group}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-1">
                  {items.map((node) => (
                    <button
                      key={node.value}
                      onClick={() => handleSelectSubcategory(node)}
                      className={`px-3 py-2 rounded text-sm text-left transition-all ${
                        selectedNode?.value === node.value
                          ? 'bg-sage text-white ring-2 ring-sage/50'
                          : 'bg-cream-md border border-sage/14 text-ink hover:bg-cream'
                      }`}
                    >
                      <div className="font-medium">{node.label}</div>
                      {renderPlatformInfo(node, true)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {filteredSubcategories.length === 0 && search && (
              <p className="text-sm text-sage-dim py-4 text-center">
                No subcategories match &ldquo;{search}&rdquo;
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
