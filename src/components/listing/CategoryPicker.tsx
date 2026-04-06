'use client'

import { useState, useMemo } from 'react'
import { CATEGORY_TREE } from '@/data/marketplace-category-map'
import type { CategoryNode } from '@/types/categories'

interface CategoryPickerProps {
  value: string
  onChange: (categoryValue: string, categoryNode?: CategoryNode) => void
  selectedPlatforms: string[]
}

export default function CategoryPicker({
  value,
  onChange,
  selectedPlatforms,
}: CategoryPickerProps) {
  const [step, setStep] = useState<'category' | 'subcategory'>('category')

  // Get top-level categories from CATEGORY_TREE
  const topLevelCategories = useMemo(
    () => Object.keys(CATEGORY_TREE).sort(),
    []
  )

  // Get selected top-level category
  const selectedTopLevel = useMemo(() => {
    if (!value) return null
    // Extract top-level from leaf node (e.g., "ceramics_plates" → "ceramics")
    for (const [topKey, subcats] of Object.entries(CATEGORY_TREE)) {
      for (const node of Object.values(subcats)) {
        if (node.value === value) return topKey
      }
    }
    // Fallback: split on first underscore
    const parts = value.split('_')
    return parts[0]
  }, [value])

  // Get subcategories for selected top-level
  const subcategories = useMemo(() => {
    if (!selectedTopLevel) return []
    const catTree = CATEGORY_TREE[selectedTopLevel]
    if (!catTree) return []
    return Object.values(catTree)
  }, [selectedTopLevel])

  // Get selected leaf node
  const selectedNode = useMemo(() => {
    if (!value) return null
    if (!selectedTopLevel) return null
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
  }

  const handleBack = () => {
    setStep('category')
  }

  const handleCategoryClick = (cat: string) => {
    const catTree = CATEGORY_TREE[cat]
    if (!catTree) return
    // If only one subcategory, select it directly
    const subs = Object.values(catTree)
    if (subs.length === 1 && subs[0]) {
      onChange(subs[0].value, subs[0])
      return
    }
    // Otherwise show subcategory picker
    // Temporarily set the top-level so subcategories render
    const firstSub = subs[0]
    if (firstSub) {
      onChange(firstSub.value, firstSub)
    }
    setStep('subcategory')
  }

  // Format top-level key for display
  const formatLabel = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
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
              <div className="mt-2 space-y-1 text-xs text-sage-dim">
                {selectedPlatforms.includes('ebay') && selectedNode.platforms.ebay && (
                  <p>eBay: {selectedNode.platforms.ebay.name}</p>
                )}
                {selectedPlatforms.includes('vinted') && selectedNode.platforms.vinted && (
                  <p>Vinted: {selectedNode.platforms.vinted.name}</p>
                )}
                {selectedPlatforms.includes('shopify') && selectedNode.platforms.shopify && (
                  <p>Shopify: {selectedNode.platforms.shopify.name}</p>
                )}
                {selectedPlatforms.includes('etsy') && selectedNode.platforms.etsy && (
                  <p>Etsy: {selectedNode.platforms.etsy.name}</p>
                )}
                {selectedPlatforms.includes('depop') && selectedNode.platforms.depop && (
                  <p>Depop: {selectedNode.platforms.depop.name}</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <button
            onClick={handleBack}
            className="text-sm text-sage-dim hover:text-ink mb-2"
          >
            ← Back to categories
          </button>
          <div className="grid grid-cols-1 gap-2">
            {subcategories.map((node) => (
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
                {selectedPlatforms.includes('ebay') && node.platforms.ebay && (
                  <div className="text-xs opacity-75 mt-1">eBay: {node.platforms.ebay.name}</div>
                )}
                {selectedPlatforms.includes('vinted') && node.platforms.vinted && (
                  <div className="text-xs opacity-75">Vinted: {node.platforms.vinted.name}</div>
                )}
                {selectedPlatforms.includes('shopify') && node.platforms.shopify && (
                  <div className="text-xs opacity-75">Shopify: {node.platforms.shopify.name}</div>
                )}
                {selectedPlatforms.includes('etsy') && node.platforms.etsy && (
                  <div className="text-xs opacity-75">Etsy: {node.platforms.etsy.name}</div>
                )}
                {selectedPlatforms.includes('depop') && node.platforms.depop && (
                  <div className="text-xs opacity-75">Depop: {node.platforms.depop.name}</div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
