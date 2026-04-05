'use client'

import type { Platform } from '@/types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { PlatformStatuses } from './types'

interface PlatformGridProps {
  platforms: PlatformStatuses
  onSelectPlatform: (platform: Platform) => void
}

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'ebay', label: 'eBay' },
  { key: 'vinted', label: 'Vinted' },
  { key: 'etsy', label: 'Etsy' },
  { key: 'shopify', label: 'Shopify' },
]

export function PlatformGrid({ platforms, onSelectPlatform }: PlatformGridProps) {
  return (
    <div>
      <p className="text-sm text-ink-lt mb-4">Select a marketplace to import from</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {PLATFORMS.map(({ key, label }) => {
          const status = platforms[key as keyof PlatformStatuses]
          const connected = status?.connected ?? false

          return (
            <button
              key={key}
              onClick={() => onSelectPlatform(key)}
              className={`flex flex-col items-center gap-3 p-6 rounded-md border transition-all ${
                connected
                  ? 'border-sage/20 bg-white hover:border-sage/40 hover:bg-cream cursor-pointer'
                  : 'border-border bg-cream-md opacity-70 hover:opacity-90 cursor-pointer'
              }`}
            >
              <MarketplaceIcon platform={key} size="lg" />
              <span className="text-sm font-medium text-ink">{label}</span>
              {connected ? (
                <span className="text-xs text-sage font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block" />
                  connected
                </span>
              ) : (
                <span className="text-xs text-ink-lt">not connected</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
