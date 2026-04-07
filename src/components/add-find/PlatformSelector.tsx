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
  variant?: 'vertical' | 'chips'
}

export default function PlatformSelector({
  selectedPlatforms,
  onPlatformToggle,
  variant = 'vertical',
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
    return variant === 'chips' ? (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-20 bg-sage/10 rounded-full animate-pulse" />
        ))}
      </div>
    ) : (
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
        {variant === 'vertical' && <h2 className="text-sm font-semibold text-ink mb-4">Where to list</h2>}
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

  if (variant === 'chips') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {connectedPlatforms.map((platform) => {
          const selected = selectedPlatforms.includes(platform)
          return (
            <button
              key={platform}
              type="button"
              onClick={() => onPlatformToggle(platform)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${
                selected
                  ? 'border-sage bg-sage/10 text-sage font-medium'
                  : 'border-sage/20 text-sage-dim hover:border-sage/40'
              }`}
            >
              <MarketplaceIcon platform={platform} size="sm" />
              {PLATFORM_LABELS[platform] ?? platform}
            </button>
          )
        })}
        <Link
          href="/platform-connect"
          className="text-xs text-ink/30 hover:text-sage transition-colors"
        >
          +
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
