/**
 * Category types for multi-marketplace mapping
 * Architecture: Option C (Hybrid) — canonical category for inventory/UX
 * + per-marketplace overrides in product_marketplace_data.platform_category_id
 */

/** Native platform category ID + display name */
export interface PlatformCategoryMapping {
  id: string
  name: string
  path?: string
}

/**
 * A leaf node in the canonical category tree.
 * Each leaf maps to the best-match native category on each supported platform.
 */
export interface CategoryNode {
  /** Canonical key stored in finds.category, e.g. "ceramics_plates" */
  value: string
  /** Human-readable label, e.g. "Plates" */
  label: string
  /** Per-platform native category mappings */
  platforms: {
    ebay?: PlatformCategoryMapping
    vinted?: PlatformCategoryMapping
    shopify?: PlatformCategoryMapping
    etsy?: PlatformCategoryMapping
    depop?: PlatformCategoryMapping
    // Future: poshmark, mercari, facebook, whatnot, grailed
  }
}

export type TopLevelCategory = string
export type CategoryTree = Record<TopLevelCategory, Record<string, CategoryNode>>

/** Field requirement for a single field on a specific platform */
export interface PlatformFieldRequirement {
  show: boolean
  required?: boolean
  options?: string[]
  type?: 'text' | 'select' | 'multiselect'
}

/** Map of field name → requirement for one platform */
export type PlatformFieldMap = Record<string, PlatformFieldRequirement>
