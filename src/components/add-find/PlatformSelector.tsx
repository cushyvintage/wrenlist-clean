'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Platform } from '@/types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

const PLATFORM_LABELS: Record<string, string> = {
  vinted: 'Vinted',
  ebay: 'eBay UK',
  shopify: 'Shopify',
  etsy: 'Etsy',
  depop: 'Depop',
}

interface PlatformSelectorProps {
  selectedPlatforms: Platform[]
  onPlatformToggle: (platform: Platform) => void
}

export default function PlatformSelector({
  selectedPlatforms,
  onPlatformToggle,
}: PlatformSelectorProps) {
  const [connectedPlatforms, setConnectedPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/platforms/status')
        if (!res.ok) return
        const json = await res.json()
        const platforms = json.data?.platforms ?? json.platforms ?? {}
        const connected: Platform[] = []
        for (const [key, value] of Object.entries(platforms)) {
          if ((value as { connected: boolean }).connected) {
            connected.push(key as Platform)
          }
        }
        setConnectedPlatforms(connected)
      } catch {
        // Fallback — assume nothing connected
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-ink mb-4">Where to list</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 bg-sage/10 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (connectedPlatforms.length === 0) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-ink mb-4">Where to list</h2>
        <p className="text-sm text-ink/60 mb-2">No marketplaces connected yet.</p>
        <Link
          href="/platform-connect"
          className="text-sm text-sage hover:text-sage-dk underline"
        >
          Connect a marketplace →
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink mb-4">Where to list</h2>
      <div className="space-y-3">
        {connectedPlatforms.map((platform) => (
          <label
            key={platform}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selectedPlatforms.includes(platform)}
              onChange={() => onPlatformToggle(platform)}
              className="w-4 h-4 border border-sage/30 rounded cursor-pointer"
            />
            <MarketplaceIcon platform={platform} size="sm" />
            <span className="text-sm text-ink group-hover:text-sage transition-colors">
              {PLATFORM_LABELS[platform] ?? platform}
            </span>
          </label>
        ))}
      </div>
      <Link
        href="/platform-connect"
        className="block mt-4 text-xs text-ink/40 hover:text-sage transition-colors"
      >
        Manage connections →
      </Link>
    </div>
  )
}
