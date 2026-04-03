'use client'

import { Platform } from '@/types'

interface PlatformSelectorProps {
  selectedPlatforms: Platform[]
  onPlatformToggle: (platform: Platform) => void
  availablePlatforms?: Platform[]
}

export default function PlatformSelector({
  selectedPlatforms,
  onPlatformToggle,
  availablePlatforms = ['vinted', 'ebay', 'shopify'],
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

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink mb-4">Where to list</h2>
      <div className="space-y-3">
        {availablePlatforms.map((platform) => (
          <label key={platform} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={selectedPlatforms.includes(platform)}
              onChange={() => onPlatformToggle(platform)}
              className="w-4 h-4 border border-sage/30 rounded cursor-pointer"
            />
            <span className="text-sm text-ink group-hover:text-sage transition-colors">
              {getPlatformLabel(platform)}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}
