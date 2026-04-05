/**
 * PlatformTag Component
 * Small pill badge for marketplace platform status
 *
 * Design: rounded-full, border, small text
 * States: live (sage border + text), inactive (cream bg, ink-lt text)
 * Matches design mockup platform tags
 *
 * @example
 * <PlatformTag platform="vinted" live={true} />
 * <PlatformTag platform="ebay" live={false} />
 */

import type { Platform } from '@/types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

interface PlatformTagProps {
  /** Platform name */
  platform: Platform
  /** Whether listing is live on this platform */
  live?: boolean
  /** Optional custom label */
  label?: string
  /** Optional link to the platform listing */
  href?: string | null
}

const platformConfig: Partial<Record<Platform, string>> = {
  vinted: 'Vinted',
  ebay: 'eBay UK',
  etsy: 'Etsy',
  shopify: 'Shopify',
  depop: 'Depop',
  poshmark: 'Poshmark',
  mercari: 'Mercari',
  facebook: 'Facebook',
  whatnot: 'Whatnot',
  grailed: 'Grailed',
}

export function PlatformTag({
  platform,
  live = false,
  label,
  href,
}: PlatformTagProps) {
  const displayLabel = label || platformConfig[platform] || platform

  const className = `inline-block px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
    live
      ? 'border-sage bg-sage/6 text-sage'
      : 'border-cream-dk bg-cream-md text-ink-lt'
  }${href ? ' hover:opacity-80 cursor-pointer' : ''}`

  const content = (
    <>
      <MarketplaceIcon platform={platform} size="sm" className="inline-block align-text-bottom" />
      {' '}{displayLabel}
      {live && ' · live'}
    </>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {content}
      </a>
    )
  }

  return <span className={className}>{content}</span>
}
