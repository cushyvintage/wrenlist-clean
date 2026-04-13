'use client'

import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { Platform } from '@/types'

interface StatsData {
  total: number
  platformCoverage: Record<string, { mapped: number; total: number; pct: number }>
  topLevelCounts: Record<string, number>
  fieldRequirementRows: number
}

interface CategoryStatsProps {
  stats: StatsData | null
  isLoading: boolean
}

const PLATFORM_ORDER: Platform[] = ['ebay', 'vinted', 'shopify', 'etsy', 'depop']

export default function CategoryStats({ stats, isLoading }: CategoryStatsProps) {
  if (isLoading || !stats) {
    return (
      <div className="bg-white rounded-lg border border-sage/14 p-4 animate-pulse">
        <div className="h-4 w-32 bg-cream-md rounded mb-3" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-24 bg-cream-md rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-sage/14 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">
          {stats.total} categories &middot; {stats.fieldRequirementRows} field rules
        </h2>
        <span className="text-xs text-sage-dim">
          {Object.keys(stats.topLevelCounts).length} top-level groups
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {PLATFORM_ORDER.map((platform) => {
          const cov = stats.platformCoverage[platform]
          if (!cov) return null
          const barColor = cov.pct >= 90 ? 'bg-emerald-500' : cov.pct >= 70 ? 'bg-amber-400' : 'bg-red-400'
          return (
            <div key={platform} className="flex items-center gap-2 min-w-[140px]">
              <MarketplaceIcon platform={platform} size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-ink font-medium capitalize">{platform}</span>
                  <span className="text-sage-dim">{cov.pct}%</span>
                </div>
                <div className="h-1.5 bg-cream-md rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${cov.pct}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
