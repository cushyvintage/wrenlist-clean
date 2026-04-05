'use client'

import Link from 'next/link'
import { Platform } from '@/types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

interface PlatformSelectorProps {
  selectedPlatforms: Platform[]
  onPlatformToggle: (platform: Platform) => void
  availablePlatforms?: Platform[]
  /** Platforms that have a valid connection (e.g. Shopify store linked). Unconnected platforms are greyed out. */
  connectedPlatforms?: Platform[]
}

export default function PlatformSelector({
  selectedPlatforms,
  onPlatformToggle,
  availablePlatforms = ['vinted', 'ebay', 'shopify'],
  connectedPlatforms,
}: PlatformSelectorProps) {
  const getPlatformLabel = (platform: Platform): string => {
    switch (platform) {
      case 'vinted':
        return 'Vinted'
      case 'ebay':
        return 'eBay UK'
      case 'shopify':
        return 'Shopify'
      default:
        return platform
    }
  }

  const isConnected = (platform: Platform): boolean => {
    // If connectedPlatforms isn't provided, assume all are connected (backwards compat)
    if (!connectedPlatforms) return true
    // Vinted + eBay don't require a stored connection — they work via the extension
    if (platform === 'vinted' || platform === 'ebay') return true
    return connectedPlatforms.includes(platform)
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink mb-4">Where to list</h2>
      <div className="space-y-3">
        {availablePlatforms.map((platform) => {
          const connected = isConnected(platform)
          return (
            <label
              key={platform}
              className={`flex items-center gap-3 group ${connected ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
            >
              <input
                type="checkbox"
                checked={selectedPlatforms.includes(platform)}
                onChange={() => connected && onPlatformToggle(platform)}
                disabled={!connected}
                className="w-4 h-4 border border-sage/30 rounded cursor-pointer disabled:cursor-not-allowed"
              />
              <MarketplaceIcon platform={platform} size="sm" />
              <span className={`text-sm ${connected ? 'text-ink group-hover:text-sage' : 'text-ink/50'} transition-colors`}>
                {getPlatformLabel(platform)}
                {!connected && (
                  <>
                    <span className="ml-1 text-xs text-ink/40">(not connected)</span>
                    <Link
                      href="/platform-connect"
                      className="ml-1.5 text-xs text-sage hover:text-sage-dk underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Connect →
                    </Link>
                  </>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
