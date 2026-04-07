import { FindCondition, Platform } from '@/types'

export const WRENLIST_CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'new_with_tags', label: 'New with tags' },
  { value: 'new_without_tags', label: 'New without tags / Like new' },
  { value: 'very_good', label: 'Very good' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]

interface PlatformCondition {
  id?: number | string
  label: string
}

type ConditionPlatformEntry = Partial<Record<Platform, PlatformCondition>>

export const CONDITION_PLATFORM_MAP: Record<FindCondition, ConditionPlatformEntry> = {
  new_with_tags: {
    vinted: { id: 6, label: 'New with tags' },
    ebay: { id: 'NEW', label: 'New' },
    depop: { id: 'brand_new', label: 'Brand new' },
    etsy: { label: 'New' },
    shopify: { label: 'New' },
  },
  new_without_tags: {
    vinted: { id: 1, label: 'Like new' },
    ebay: { id: 'LIKE_NEW', label: 'Like New / Open box' },
    depop: { id: 'used_like_new', label: 'Like new' },
    etsy: { label: 'Like new' },
    shopify: { label: 'Like new' },
  },
  very_good: {
    vinted: { id: 2, label: 'Very good' },
    ebay: { id: 'USED_VERY_GOOD', label: 'Used - Very Good' },
    depop: { id: 'used_excellent', label: 'Excellent' },
    etsy: { label: 'Very good' },
    shopify: { label: 'Very good' },
  },
  good: {
    vinted: { id: 3, label: 'Good' },
    ebay: { id: 'USED_GOOD', label: 'Used - Good' },
    depop: { id: 'used_good', label: 'Good' },
    etsy: { label: 'Good' },
    shopify: { label: 'Good' },
  },
  fair: {
    vinted: { id: 4, label: 'Satisfactory' },
    ebay: { id: 'USED_ACCEPTABLE', label: 'Used - Acceptable' },
    depop: { id: 'used_fair', label: 'Fair' },
    etsy: { label: 'Fair' },
    shopify: { label: 'Fair' },
  },
  poor: {
    vinted: { id: 4, label: 'Satisfactory' },
    ebay: { id: 'USED_ACCEPTABLE', label: 'Used - Acceptable' },
    depop: { id: 'used_poor', label: 'Poor' },
    etsy: { label: 'Poor' },
    shopify: { label: 'Poor' },
  },
}

/** Get per-platform condition labels for a set of selected platforms */
export function getConditionPlatformLabels(
  condition: FindCondition,
  platforms: Platform[]
): string {
  const entry = CONDITION_PLATFORM_MAP[condition]
  return platforms
    .map((p) => {
      const mapped = entry[p]
      if (!mapped) return null
      const name = p.charAt(0).toUpperCase() + p.slice(1)
      return `${name}: ${mapped.label}`
    })
    .filter(Boolean)
    .join(' · ')
}
