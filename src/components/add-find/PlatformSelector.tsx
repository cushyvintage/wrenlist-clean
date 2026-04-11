'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Platform } from '@/types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { PLAN_LIMITS, getPlan, type PlanId } from '@/config/plans'

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
  const [planId, setPlanId] = useState<PlanId>('free')

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [statusRes, profileRes] = await Promise.all([
          fetch('/api/platforms/status'),
          fetch('/api/profiles/me'),
        ])

        if (statusRes.ok) {
          const json = await statusRes.json()
          const platforms = json.data?.platforms ?? json.platforms ?? {}
          const connected: Platform[] = []
          for (const [key, value] of Object.entries(platforms)) {
            if ((value as { connected: boolean }).connected) {
              connected.push(key as Platform)
            }
          }
          setConnectedPlatforms(connected)
        }

        if (profileRes.ok) {
          const json = await profileRes.json()
          const plan = (json?.data?.plan ?? json?.plan ?? 'free') as PlanId
          if (plan in PLAN_LIMITS) setPlanId(plan)
        }
      } catch {
        // Fallback — assume nothing connected, free plan
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  const marketplaceLimit = PLAN_LIMITS[planId]?.marketplaces ?? null
  const atLimit =
    marketplaceLimit !== null && selectedPlatforms.length >= marketplaceLimit
  const planName = getPlan(planId).name

  const handleToggle = (platform: Platform) => {
    const isSelected = selectedPlatforms.includes(platform)
    // Block adding a new platform when at the cap; always allow removal.
    if (!isSelected && atLimit) return
    onPlatformToggle(platform)
  }

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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {connectedPlatforms.map((platform) => {
            const selected = selectedPlatforms.includes(platform)
            const locked = !selected && atLimit
            return (
              <button
                key={platform}
                type="button"
                onClick={() => handleToggle(platform)}
                disabled={locked}
                title={locked ? `${planName} plan allows ${marketplaceLimit} marketplace${marketplaceLimit === 1 ? '' : 's'}. Upgrade for more.` : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${
                  selected
                    ? 'border-sage bg-sage/10 text-sage font-medium'
                    : locked
                    ? 'border-sage/10 text-sage-dim/40 cursor-not-allowed'
                    : 'border-sage/20 text-sage-dim hover:border-sage/40'
                }`}
              >
                <MarketplaceIcon platform={platform} size="sm" />
                {PLATFORM_LABELS[platform] ?? platform}
                {locked && <span aria-hidden>🔒</span>}
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
        {atLimit && marketplaceLimit !== null && (
          <div className="text-[11px] text-sage-dim">
            {planName} plan: {marketplaceLimit} marketplace{marketplaceLimit === 1 ? '' : 's'} per listing.{' '}
            <Link href="/billing" className="underline text-sage hover:text-sage-dk">
              Upgrade for more →
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-ink mb-4">Where to list</h2>
      <div className="space-y-3">
        {connectedPlatforms.map((platform) => {
          const selected = selectedPlatforms.includes(platform)
          const locked = !selected && atLimit
          return (
            <label
              key={platform}
              className={`flex items-center gap-3 group ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              title={locked ? `${planName} plan allows ${marketplaceLimit} marketplace${marketplaceLimit === 1 ? '' : 's'}. Upgrade for more.` : undefined}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={locked}
                onChange={() => handleToggle(platform)}
                className="w-4 h-4 border border-sage/30 rounded cursor-pointer disabled:cursor-not-allowed"
              />
              <MarketplaceIcon platform={platform} size="sm" />
              <span className="text-sm text-ink group-hover:text-sage transition-colors">
                {PLATFORM_LABELS[platform] ?? platform}
              </span>
              {locked && <span className="text-[10px] text-sage-dim ml-auto">🔒</span>}
            </label>
          )
        })}
      </div>
      {atLimit && marketplaceLimit !== null && (
        <div className="mt-3 text-[11px] text-sage-dim">
          {planName} plan: {marketplaceLimit} marketplace{marketplaceLimit === 1 ? '' : 's'} per listing.{' '}
          <Link href="/billing" className="underline text-sage hover:text-sage-dk">
            Upgrade for more →
          </Link>
        </div>
      )}
      <Link
        href="/platform-connect"
        className="block mt-4 text-xs text-ink/40 hover:text-sage transition-colors"
      >
        Manage connections →
      </Link>
    </div>
  )
}
