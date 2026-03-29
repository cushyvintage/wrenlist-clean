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

type Platform = 'vinted' | 'ebay' | 'etsy' | 'shopify'

interface PlatformTagProps {
  /** Platform name */
  platform: Platform
  /** Whether listing is live on this platform */
  live?: boolean
  /** Optional custom label */
  label?: string
}

const platformConfig: Record<Platform, string> = {
  vinted: 'Vinted',
  ebay: 'eBay UK',
  etsy: 'Etsy',
  shopify: 'Shopify',
}

export function PlatformTag({
  platform,
  live = false,
  label,
}: PlatformTagProps) {
  const displayLabel = label || platformConfig[platform]

  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        live
          ? 'border-sage bg-sage/6 text-sage'
          : 'border-cream-dk bg-cream-md text-ink-lt'
      }`}
    >
      {displayLabel}
      {live && ' · live'}
    </span>
  )
}
