/**
 * Canonical platform definitions — single source of truth.
 * Import this instead of defining platform arrays inline.
 */

/** All supported marketplace platforms */
export const ALL_PLATFORMS = ['vinted', 'ebay', 'etsy', 'shopify', 'depop', 'poshmark', 'mercari', 'facebook', 'whatnot', 'grailed'] as const

/** Platforms that use tree-based category IDs for publishing */
export const PUBLISH_PLATFORMS = ['ebay', 'vinted', 'shopify', 'depop'] as const
// Note: Etsy uses text search at publish time (no category IDs), so it's excluded from PUBLISH_PLATFORMS
// but included in CATEGORY_PLATFORMS for mapping purposes

/** Platforms that should have category mappings in the admin UI */
export const CATEGORY_PLATFORMS = ['ebay', 'vinted', 'shopify', 'etsy', 'depop'] as const

export type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number]
export type CategoryPlatform = (typeof CATEGORY_PLATFORMS)[number]
