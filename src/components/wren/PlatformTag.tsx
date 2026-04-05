/**
 * PlatformTag Component
 * Small pill badge for marketplace platform status
 *
 * Design: rounded-full, border, small text
 * States:
 *   listed  → green (sage) "· live"
 *   needs_publish → amber "· queued"
 *   needs_delist  → amber "· delisting"
 *   error   → red "· error" with tooltip
 *   default → inactive cream
 *
 * @example
 * <PlatformTag platform="vinted" status="listed" />
 * <PlatformTag platform="shopify" status="needs_publish" />
 * <PlatformTag platform="ebay" status="error" errorMessage="Auth expired" />
 */

import type { Platform, MarketplaceDataStatus } from '@/types'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

interface PlatformTagProps {
  /** Platform name */
  platform: Platform
  /** Whether listing is live on this platform (legacy — prefer `status`) */
  live?: boolean
  /** Marketplace data status — takes precedence over `live` when provided */
  status?: MarketplaceDataStatus
  /** Error message shown as tooltip when status is 'error' */
  errorMessage?: string | null
  /** Optional custom label */
  label?: string
  /** Optional link to the platform listing */
  href?: string | null
  /** Optional collection/category name (shown instead of "live") */
  collection?: string | null
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

/** Resolve visual state from either the new `status` prop or legacy `live` */
function resolveState(
  status: MarketplaceDataStatus | undefined,
  live: boolean
): 'live' | 'queued' | 'delisting' | 'error' | 'inactive' {
  if (status) {
    if (status === 'listed') return 'live'
    if (status === 'needs_publish') return 'queued'
    if (status === 'needs_delist') return 'delisting'
    if (status === 'error') return 'error'
    return 'inactive'
  }
  return live ? 'live' : 'inactive'
}

const stateStyles: Record<ReturnType<typeof resolveState>, string> = {
  live: 'border-sage bg-sage/6 text-sage',
  queued: 'border-amber-400 bg-amber-50 text-amber-700',
  delisting: 'border-amber-400 bg-amber-50 text-amber-700',
  error: 'border-red-300 bg-red-50 text-red-600',
  inactive: 'border-cream-dk bg-cream-md text-ink-lt',
}

const stateSuffix: Record<ReturnType<typeof resolveState>, string | null> = {
  live: null, // handled separately for collection support
  queued: 'queued',
  delisting: 'delisting',
  error: 'error',
  inactive: null,
}

export function PlatformTag({
  platform,
  live = false,
  status,
  errorMessage,
  label,
  href,
  collection,
}: PlatformTagProps) {
  const displayLabel = label || platformConfig[platform] || platform
  const state = resolveState(status, live)

  const className = `inline-block px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
    stateStyles[state]
  }${href ? ' hover:opacity-80 cursor-pointer' : ''}`

  const suffix = stateSuffix[state]
  const showLiveSuffix = state === 'live'

  const content = (
    <>
      <MarketplaceIcon platform={platform} size="sm" className="inline-block align-text-bottom" />
      {' '}{displayLabel}
      {showLiveSuffix && (collection ? ` · ${collection}` : ' · live')}
      {suffix && ` · ${suffix}`}
    </>
  )

  const tag = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  )

  // Wrap in a tooltip container when there is an error message
  if (state === 'error' && errorMessage) {
    return (
      <span className="relative group inline-block">
        {tag}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block px-2 py-1 rounded bg-ink text-cream text-[11px] whitespace-nowrap z-20 shadow-md">
          {errorMessage}
        </span>
      </span>
    )
  }

  return tag
}
