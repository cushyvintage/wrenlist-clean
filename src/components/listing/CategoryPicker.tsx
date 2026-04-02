'use client'

import { useState, useMemo } from 'react'
import { CATEGORY_TREE, CategoryNode } from '@/data/marketplace-category-map'

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

  const handleSelectTopLevel = (category: string) => {
    setStep('subcategory')
  }

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
    const firstSub = Object.values(catTree)[0]
    if (firstSub) {
      onChange(firstSub.value, firstSub)
    }
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
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {selectedNode && (
            <div className="mt-4 p-3 bg-cream-md rounded-lg border border-sage/14">
              <p className="text-xs text-sage-dim mb-1">Selected subcategory:</p>
              <p className="text-sm font-semibold text-ink">{selectedNode.label}</p>
              <div className="mt-2 space-y-1 text-xs text-sage-dim">
                {selectedPlatforms.includes('ebay') && (
                  <p>eBay: {selectedNode.ebayName}</p>
                )}
                {selectedPlatforms.includes('vinted') && (
                  <p>Vinted: {selectedNode.vintedName}</p>
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
                {selectedPlatforms.includes('ebay') && (
                  <div className="text-xs opacity-75 mt-1">eBay: {node.ebayName}</div>
                )}
                {selectedPlatforms.includes('vinted') && (
                  <div className="text-xs opacity-75">Vinted: {node.vintedName}</div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
