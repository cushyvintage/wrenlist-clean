'use client'

import { useState, useEffect } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { Platform } from '@/types'

interface FreshnessInfo {
  last_checked: string | null
  days_ago: number | null
  category_count: number | null
  leaf_count: number | null
  status: 'fresh' | 'stale' | 'warning' | 'never'
}

const PLATFORMS: Platform[] = ['ebay', 'vinted', 'shopify', 'etsy', 'depop']

export default function FreshnessBanner() {
  const [data, setData] = useState<Record<string, FreshnessInfo> | null>(null)

  useEffect(() => {
    fetch('/api/admin/categories/freshness')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data) return null

  const hasWarning = Object.values(data).some((d) => d.status === 'warning' || d.status === 'stale' || d.status === 'never')
  if (!hasWarning) return null

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-4 flex-wrap">
      <span className="text-xs font-semibold text-amber-800">Taxonomy freshness</span>
      {PLATFORMS.map((platform) => {
        const info = data[platform]
        if (!info) return null

        let color = 'text-emerald-700'
        let label = ''
        if (info.status === 'fresh') {
          color = 'text-emerald-700'
          label = `${info.days_ago}d ago`
        } else if (info.status === 'warning') {
          color = 'text-amber-700'
          label = `${info.days_ago}d ago`
        } else if (info.status === 'stale') {
          color = 'text-red-600'
          label = `${info.days_ago}d ago`
        } else {
          color = 'text-sage-dim'
          label = 'never'
        }

        const dot = info.status === 'fresh' ? 'bg-emerald-500'
          : info.status === 'warning' ? 'bg-amber-400'
          : info.status === 'stale' ? 'bg-red-400'
          : 'bg-sage/30'

        return (
          <div key={platform} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            <MarketplaceIcon platform={platform} size="sm" />
            <span className={`text-xs ${color}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}
