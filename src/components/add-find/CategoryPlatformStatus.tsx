'use client'

import { useCategoryTree } from '@/hooks/useCategoryTree'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { formatPlatformName } from '@/lib/crosslist'
import type { Platform } from '@/types'

interface CategoryPlatformStatusProps {
  category: string
  selectedPlatforms: Platform[]
}

/** Platforms that use tree-based category IDs */
const MAPPED_PLATFORMS: Platform[] = ['ebay', 'vinted', 'shopify', 'depop']

/**
 * Shows which selected platforms have a matched category for the current item.
 * Helps users understand that not every category maps perfectly to every marketplace.
 */
export default function CategoryPlatformStatus({ category, selectedPlatforms }: CategoryPlatformStatusProps) {
  const { getPlatformId } = useCategoryTree()

  if (!category || selectedPlatforms.length === 0) return null

  const relevant = selectedPlatforms.filter((p) => MAPPED_PLATFORMS.includes(p))
  if (relevant.length === 0) return null

  const matched: Platform[] = []
  const fallback: Platform[] = []

  for (const platform of relevant) {
    const id = getPlatformId(category, platform)
    if (id) {
      matched.push(platform)
    } else {
      fallback.push(platform)
    }
  }

  // Etsy always uses search terms — always "matched"
  if (selectedPlatforms.includes('etsy')) matched.push('etsy')
  // Facebook uses generic categories — always "matched"
  if (selectedPlatforms.includes('facebook')) matched.push('facebook')

  // Don't show anything if everything is matched
  if (fallback.length === 0) return null

  return (
    <div className="mt-3 rounded border border-amber-200 bg-amber-50/50 px-3 py-2 text-xs text-amber-700">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex-shrink-0">⚠</span>
        <div>
          <p>
            {fallback.length === 1
              ? `${formatPlatformName(fallback[0]!)} doesn't have an exact category match — it'll use a general category.`
              : `${fallback.map((p) => formatPlatformName(p)).join(', ')} don't have exact category matches — they'll use general categories.`
            }
          </p>
          <p className="mt-1 text-amber-600/80">
            You can refine the category on each platform after publishing.
          </p>
        </div>
      </div>
    </div>
  )
}
