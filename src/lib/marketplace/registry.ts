/**
 * Marketplace Registry
 * Centralized configuration for all supported marketplaces
 */

export type MarketplaceId = 'vinted' | 'ebay' | 'etsy' | 'shopify'

export interface MarketplaceConfig {
  id: MarketplaceId
  label: string
  color: string
  fields: string[]
  requiresExtension: boolean
  apiStatus: 'active' | 'pending' | 'not_connected'
}

export const MARKETPLACES: Record<MarketplaceId, MarketplaceConfig> = {
  vinted: {
    id: 'vinted',
    label: 'Vinted',
    color: '#1BB0CE',
    fields: [
      'condition_id',
      'size_id',
      'color_id',
      'brand_id',
      'category_id',
      'description',
      'photos',
    ],
    requiresExtension: true,
    apiStatus: 'pending',
  },
  ebay: {
    id: 'ebay',
    label: 'eBay UK',
    color: '#E53238',
    fields: [
      'category',
      'condition_id',
      'shipping_profile_id',
      'payment_profile_id',
      'pictures',
    ],
    requiresExtension: false,
    apiStatus: 'pending',
  },
  etsy: {
    id: 'etsy',
    label: 'Etsy',
    color: '#F1641E',
    fields: [
      'category',
      'tags',
      'who_made',
      'when_made',
      'shipping_template_id',
      'photos',
    ],
    requiresExtension: false,
    apiStatus: 'pending',
  },
  shopify: {
    id: 'shopify',
    label: 'Shopify',
    color: '#96BE25',
    fields: [
      'collection_id',
      'vendor',
      'tags',
      'type',
      'photos',
    ],
    requiresExtension: false,
    apiStatus: 'not_connected',
  },
}

/**
 * Get marketplace config by ID
 */
export function getMarketplace(id: MarketplaceId): MarketplaceConfig | null {
  return MARKETPLACES[id] || null
}

/**
 * Get all marketplace configs
 */
export function getAllMarketplaces(): MarketplaceConfig[] {
  return Object.values(MARKETPLACES)
}

/**
 * Get only active marketplaces (not 'not_connected')
 */
export function getActiveMarketplaces(): MarketplaceConfig[] {
  return Object.values(MARKETPLACES).filter(
    (mp) => mp.apiStatus !== 'not_connected'
  )
}

/**
 * Get marketplace color for UI
 */
export function getMarketplaceColor(id: MarketplaceId): string {
  const marketplace = getMarketplace(id)
  return marketplace?.color || '#999999'
}

/**
 * Check if marketplace requires extension (Vinted only currently)
 */
export function marketplaceRequiresExtension(id: MarketplaceId): boolean {
  const marketplace = getMarketplace(id)
  return marketplace?.requiresExtension || false
}

/**
 * Get label for marketplace
 */
export function getMarketplaceLabel(id: MarketplaceId): string {
  const marketplace = getMarketplace(id)
  return marketplace?.label || id
}

/**
 * Validate marketplace ID
 */
export function isValidMarketplaceId(id: string): id is MarketplaceId {
  return id in MARKETPLACES
}

/**
 * Get marketplace fields for a given marketplace
 */
export function getMarketplaceFields(id: MarketplaceId): string[] {
  const marketplace = getMarketplace(id)
  return marketplace?.fields || []
}
