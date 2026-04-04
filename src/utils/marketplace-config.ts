/**
 * Marketplace Integration Configuration
 * Defines platform-specific features, fields, and requirements
 */

/** Platforms with full marketplace config (fees, fields, shipping) */
export type ConfiguredPlatform = 'vinted' | 'ebay' | 'etsy' | 'shopify'

/** @deprecated Use ConfiguredPlatform for this module, or import Platform from @/types */
export type Platform = ConfiguredPlatform

export interface MarketplaceFeatures {
  id: Platform
  label: string
  icon: string
  supportsAutoSync: boolean
  supportsScheduling: boolean
  platformFeePercent: number
  requiredFields: string[]
  platformSpecificFields: PlatformField[]
  shippingMethods: ShippingMethod[]
  categoryMapping?: Record<string, string>
}

export interface PlatformField {
  name: string
  label: string
  type: 'text' | 'select' | 'number' | 'textarea'
  required: boolean
  options?: string[]
  helpText?: string
}

export interface ShippingMethod {
  id: string
  label: string
  estimatedDays: number
  costFixed?: number
  costPercent?: number
}

/**
 * Marketplace configurations with platform-specific requirements
 */
export const MARKETPLACE_FEATURES: Record<Platform, MarketplaceFeatures> = {
  vinted: {
    id: 'vinted',
    label: 'Vinted',
    icon: '👚',
    supportsAutoSync: true,
    supportsScheduling: false,
    platformFeePercent: 5,
    requiredFields: ['title', 'description', 'price', 'shippingMethod'],
    platformSpecificFields: [
      {
        name: 'shippingMethod',
        label: 'Shipping method',
        type: 'select',
        required: true,
        options: ['UNTRACKED', 'TRACKED', 'PICK_UP'],
        helpText: 'Choose shipping method for this item',
      },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: true,
        options: ['Never worn', 'Good', 'Very good', 'Fair', 'Poor'],
      },
    ],
    shippingMethods: [
      { id: 'UNTRACKED', label: 'Untracked', estimatedDays: 7, costPercent: 0 },
      { id: 'TRACKED', label: 'Tracked', estimatedDays: 3, costPercent: 2 },
      { id: 'PICK_UP', label: 'Pick up', estimatedDays: 0, costFixed: 0 },
    ],
  },
  ebay: {
    id: 'ebay',
    label: 'eBay UK',
    icon: '🛒',
    supportsAutoSync: true,
    supportsScheduling: true,
    platformFeePercent: 12.8,
    requiredFields: ['title', 'description', 'price', 'category', 'condition'],
    platformSpecificFields: [
      {
        name: 'category',
        label: 'eBay Category',
        type: 'select',
        required: true,
        options: [
          'Vintage Clothing',
          'Designer Handbags',
          'Shoes & Footwear',
          'Casual Shirts & Tops',
          'Workwear',
        ],
        helpText: 'Select appropriate eBay category for visibility',
      },
      {
        name: 'listingDuration',
        label: 'Listing duration',
        type: 'select',
        required: false,
        options: ['1', '3', '7', '30'],
        helpText: 'How long to list this item (days)',
      },
      {
        name: 'condition',
        label: 'Condition',
        type: 'select',
        required: true,
        options: ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'For Parts/Not Working'],
      },
    ],
    shippingMethods: [
      { id: 'STANDARD', label: 'Standard (2-4 days)', estimatedDays: 4, costFixed: 2.99 },
      { id: 'SPECIAL', label: 'Special Delivery (Next day)', estimatedDays: 1, costFixed: 7.99 },
      { id: 'ROYAL_MAIL', label: 'Royal Mail Special', estimatedDays: 2, costFixed: 4.50 },
    ],
  },
  etsy: {
    id: 'etsy',
    label: 'Etsy',
    icon: '🎨',
    supportsAutoSync: true,
    supportsScheduling: true,
    platformFeePercent: 6.5,
    requiredFields: ['title', 'description', 'price', 'tags'],
    platformSpecificFields: [
      {
        name: 'tags',
        label: 'Tags (comma-separated)',
        type: 'textarea',
        required: true,
        helpText: 'Add 13 relevant tags (max)',
      },
      {
        name: 'shopSectionId',
        label: 'Shop section',
        type: 'select',
        required: false,
        options: ['Vintage Clothing', 'Accessories', 'Home Decor'],
      },
      {
        name: 'processingTime',
        label: 'Processing time',
        type: 'select',
        required: true,
        options: ['Same day', '1-2 days', '2-3 days', '3-5 days'],
      },
    ],
    shippingMethods: [
      { id: 'STANDARD', label: 'Standard worldwide', estimatedDays: 10, costPercent: 15 },
      { id: 'EXPEDITED', label: 'Expedited', estimatedDays: 5, costPercent: 25 },
    ],
  },
  shopify: {
    id: 'shopify',
    label: 'Shopify',
    icon: '🏪',
    supportsAutoSync: false,
    supportsScheduling: false,
    platformFeePercent: 2.9,
    requiredFields: ['title', 'description', 'price'],
    platformSpecificFields: [
      {
        name: 'collection',
        label: 'Collection',
        type: 'select',
        required: false,
        options: ['Vintage Finds', 'New Arrivals', 'Sale'],
      },
    ],
    shippingMethods: [
      { id: 'STANDARD', label: 'Standard (3-5 days)', estimatedDays: 5, costFixed: 3.99 },
      { id: 'EXPRESS', label: 'Express (1-2 days)', estimatedDays: 2, costFixed: 9.99 },
    ],
  },
}

/**
 * Get marketplace config by platform
 */
export function getMarketplaceConfig(platform: Platform): MarketplaceFeatures {
  return MARKETPLACE_FEATURES[platform]
}

/**
 * Get all active marketplace configs
 */
export function getAllMarketplaces(): MarketplaceFeatures[] {
  return Object.values(MARKETPLACE_FEATURES)
}

/**
 * Check if platform requires specific field
 */
export function requiresField(platform: Platform, fieldName: string): boolean {
  const config = getMarketplaceConfig(platform)
  return config.requiredFields.includes(fieldName)
}

/**
 * Get platform-specific fields for UI form
 */
export function getPlatformFields(platform: Platform): PlatformField[] {
  const config = getMarketplaceConfig(platform)
  return config.platformSpecificFields
}

/**
 * Calculate final price after platform fees
 */
export function calculateFinalPrice(
  listPrice: number,
  platform: Platform,
  shippingCost: number = 0
): number {
  const config = getMarketplaceConfig(platform)
  const fees = (listPrice * config.platformFeePercent) / 100
  return listPrice - fees - shippingCost
}

/**
 * Get shipping method details
 */
export function getShippingMethod(
  platform: Platform,
  methodId: string
): ShippingMethod | undefined {
  const config = getMarketplaceConfig(platform)
  return config.shippingMethods.find((m) => m.id === methodId)
}

/**
 * Category mapping for cross-platform listings
 * Maps custom categories to platform-specific categories
 */
export const CATEGORY_MAPPINGS: Record<string, Record<Platform, string>> = {
  workwear: {
    vinted: 'Jackets & Coats',
    ebay: 'Workwear',
    etsy: 'Vintage Clothing',
    shopify: 'Vintage Finds',
  },
  denim: {
    vinted: 'Jeans',
    ebay: 'Jeans',
    etsy: 'Vintage Clothing',
    shopify: 'Vintage Finds',
  },
  footwear: {
    vinted: 'Shoes & Footwear',
    ebay: 'Shoes & Footwear',
    etsy: 'Vintage Clothing',
    shopify: 'Vintage Finds',
  },
  accessories: {
    vinted: 'Accessories',
    ebay: 'Watches & Accessories',
    etsy: 'Accessories',
    shopify: 'Accessories',
  },
  tops: {
    vinted: 'Shirts',
    ebay: 'Casual Shirts & Tops',
    etsy: 'Vintage Clothing',
    shopify: 'Vintage Finds',
  },
  bags: {
    vinted: 'Bags',
    ebay: 'Designer Handbags',
    etsy: 'Accessories',
    shopify: 'Accessories',
  },
  outerwear: {
    vinted: 'Jackets & Coats',
    ebay: 'Coats & Jackets',
    etsy: 'Vintage Clothing',
    shopify: 'Vintage Finds',
  },
}

/**
 * Map category to platform category
 */
export function mapCategory(category: string | undefined, platform: Platform): string {
  if (!category) return 'Vintage'
  const mapping = CATEGORY_MAPPINGS[category.toLowerCase()]
  return mapping?.[platform] || 'Vintage'
}
