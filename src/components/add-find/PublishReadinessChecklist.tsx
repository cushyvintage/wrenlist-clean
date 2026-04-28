'use client'

import { useMemo, useState } from 'react'
import { useCategoryTree } from '@/hooks/useCategoryTree'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { formatPlatformName } from '@/lib/crosslist'
import type { Platform, FieldConfig } from '@/types'
import type { PlatformFieldsData } from '@/types/listing-form'

type ReadinessStatus = 'ready' | 'warning' | 'error'

interface PlatformReadiness {
  platform: Platform
  status: ReadinessStatus
  issues: string[]
}

interface PublishReadinessChecklistProps {
  selectedPlatforms: Platform[]
  category: string
  fieldConfig: Record<string, FieldConfig> | null
  platformFields: PlatformFieldsData
  title: string
  price: number | null
  photoCount: number
  platformPrices: Partial<Record<Platform, number | null>>
}

/** Platforms that need a tree-based category mapping */
const MAPPED_PLATFORMS: Platform[] = ['ebay', 'vinted', 'shopify', 'depop']

function checkPlatformReadiness(
  platform: Platform,
  category: string,
  getPlatformId: (value: string, platform: string) => string | undefined,
  fieldConfig: Record<string, FieldConfig> | null,
  platformFields: PlatformFieldsData,
  title: string,
  price: number | null,
  photoCount: number,
  platformPrices: Partial<Record<Platform, number | null>>,
): PlatformReadiness {
  const errors: string[] = []
  const warnings: string[] = []

  // Universal requirements
  if (!title.trim()) errors.push('title')
  if (photoCount === 0) errors.push('photos')

  if (price === null || price <= 0) errors.push('price')

  // Category check
  if (!category) {
    errors.push('category')
  } else if (MAPPED_PLATFORMS.includes(platform)) {
    const id = getPlatformId(category, platform)
    if (!id) warnings.push('no category match')
  }

  // Vinted-specific
  if (platform === 'vinted') {
    if (category.startsWith('clothing_')) {
      const size = platformFields.shared?.size as string | undefined
      if (!size) errors.push('size')
    }
    if (category.startsWith('books_')) {
      const isbn = platformFields.vinted?.isbn
      if (!isbn) warnings.push('ISBN')
    }
  }

  // Etsy-specific
  if (platform === 'etsy') {
    const whoMade = platformFields.shared?.whoMade as string | undefined
    const whenMade = platformFields.shared?.whenMade as string | undefined
    if (!whoMade) errors.push('who made')
    if (!whenMade) errors.push('when made')
  }

  // Check required fields from fieldConfig
  if (fieldConfig) {
    for (const [key, config] of Object.entries(fieldConfig)) {
      if (!config.required) continue
      // Skip fields we already check above
      if (['size', 'whoMade', 'whenMade'].includes(key)) continue
      const val = platformFields.shared?.[key]
      if (val === undefined || val === '' || (Array.isArray(val) && val.length === 0)) {
        warnings.push(key.replace(/_/g, ' '))
      }
    }
  }

  const allIssues = [...errors, ...warnings]
  let status: ReadinessStatus = 'ready'
  if (errors.length > 0) status = 'error'
  else if (warnings.length > 0) status = 'warning'

  return { platform, status, issues: allIssues }
}

export default function PublishReadinessChecklist({
  selectedPlatforms,
  category,
  fieldConfig,
  platformFields,
  title,
  price,
  photoCount,
  platformPrices,
}: PublishReadinessChecklistProps) {
  const { getPlatformId } = useCategoryTree()
  const [hoveredPlatform, setHoveredPlatform] = useState<Platform | null>(null)

  const readiness = useMemo(() => {
    return selectedPlatforms.map((p) =>
      checkPlatformReadiness(p, category, getPlatformId, fieldConfig, platformFields, title, price, photoCount, platformPrices)
    )
  }, [selectedPlatforms, category, getPlatformId, fieldConfig, platformFields, title, price, photoCount, platformPrices])

  if (selectedPlatforms.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {readiness.map((r) => (
        <div
          key={r.platform}
          className="relative"
          onMouseEnter={() => setHoveredPlatform(r.platform)}
          onMouseLeave={() => setHoveredPlatform(null)}
        >
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
              r.status === 'ready'
                ? 'border-green-200 bg-green-50 text-green-700'
                : r.status === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <MarketplaceIcon platform={r.platform} size="sm" />
            <span className="font-medium">{formatPlatformName(r.platform)}</span>
            {r.status === 'ready' && <span>&#10003;</span>}
            {r.status === 'warning' && <span>&#9888;</span>}
            {r.status === 'error' && <span>&#10005;</span>}
          </div>

          {/* Tooltip */}
          {hoveredPlatform === r.platform && r.issues.length > 0 && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-ink text-white text-xs rounded shadow-lg whitespace-nowrap z-50">
              <p className="font-medium mb-1">
                {r.status === 'error' ? 'Missing required:' : 'Recommended:'}
              </p>
              <ul className="space-y-0.5">
                {r.issues.map((issue) => (
                  <li key={issue}>- {issue}</li>
                ))}
              </ul>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-ink" />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
