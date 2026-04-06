'use client'

import type { Platform } from '@/types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { formatPlatformName } from '@/lib/crosslist'
import type { ConnectedPlatform } from '@/hooks/useConnectedPlatforms'

interface PlatformGridProps {
  connected: ConnectedPlatform[]
  loading: boolean
  onSelectPlatform: (platform: Platform) => void
}

/** Platforms that have working import handlers */
const IMPORT_SUPPORTED: Platform[] = ['ebay', 'vinted', 'shopify']

/** All platforms shown in the grid, in display order */
const ALL_PLATFORMS: Platform[] = [
  'ebay', 'vinted', 'etsy', 'shopify', 'depop',
  'facebook', 'poshmark', 'mercari', 'whatnot', 'grailed',
]

export function PlatformGrid({ connected, loading, onSelectPlatform }: PlatformGridProps) {
  const connectedSet = new Set(connected.map((c) => c.platform))

  return (
    <div>
      <p className="text-sm text-ink-lt mb-4">Select a marketplace to import from</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {ALL_PLATFORMS.map((platform) => {
          const isConnected = connectedSet.has(platform)
          const hasImport = IMPORT_SUPPORTED.includes(platform)

          return (
            <button
              key={platform}
              onClick={() => onSelectPlatform(platform)}
              className={`flex flex-col items-center gap-3 p-6 rounded-md border transition-all ${
                isConnected
                  ? 'border-sage/20 bg-white hover:border-sage/40 hover:bg-cream cursor-pointer'
                  : 'border-border bg-cream-md opacity-70 hover:opacity-90 cursor-pointer'
              }`}
            >
              <MarketplaceIcon platform={platform} size="lg" />
              <span className="text-sm font-medium text-ink">{formatPlatformName(platform)}</span>
              {isConnected ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-xs text-sage font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block" />
                    connected
                  </span>
                  {!hasImport && (
                    <span className="text-[10px] text-ink-lt">import coming soon</span>
                  )}
                </div>
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
