/**
 * Marketplace Integration Exports
 * Central hub for all marketplace service wrappers
 */

import { default as VintedServiceClass } from './vinted'
import { default as EbayServiceClass } from './ebay'
import { default as EtsyServiceClass } from './etsy'
import { default as ShopifyServiceClass } from './shopify'

export { default as VintedService } from './vinted'
export type { VintedListingInput, VintedListingResponse } from './vinted'

export { default as EbayService } from './ebay'
export type { EbayListingInput, EbayListingResponse } from './ebay'

export { default as EtsyService } from './etsy'
export type { EtsyListingInput, EtsyListingResponse } from './etsy'

export { default as ShopifyService } from './shopify'
export type { ShopifyProductInput, ShopifyProductResponse } from './shopify'

/**
 * Factory for creating marketplace service instances
 * Automatically routes to correct service based on platform
 */
export function createMarketplaceService(platform: string, credentials: Record<string, string>) {
  switch (platform) {
    case 'vinted': {
      const apiKey = credentials.VINTED_API_KEY || ''
      const bearerToken = credentials.VINTED_BEARER_TOKEN
      return new VintedServiceClass(apiKey, bearerToken)
    }

    case 'ebay': {
      const accessToken = credentials.EBAY_ACCESS_TOKEN || ''
      const clientId = credentials.EBAY_CLIENT_ID || ''
      const clientSecret = credentials.EBAY_CLIENT_SECRET || ''
      return new EbayServiceClass(accessToken, clientId, clientSecret)
    }

    case 'etsy': {
      const accessToken = credentials.ETSY_ACCESS_TOKEN || ''
      const shopId = credentials.ETSY_SHOP_ID || ''
      return new EtsyServiceClass(accessToken, shopId)
    }

    case 'shopify': {
      const shopUrl = credentials.SHOPIFY_STORE_URL || ''
      const accessToken = credentials.SHOPIFY_ACCESS_TOKEN || ''
      return new ShopifyServiceClass(shopUrl, accessToken)
    }

    default:
      throw new Error(`Unknown marketplace platform: ${platform}`)
  }
}

/**
 * Get marketplace service by name
 * Useful for dynamic platform handling
 */
export function getMarketplaceServiceConstructor(
  platform: string
): typeof VintedServiceClass | typeof EbayServiceClass | typeof EtsyServiceClass | typeof ShopifyServiceClass {
  switch (platform) {
    case 'vinted':
      return VintedServiceClass
    case 'ebay':
      return EbayServiceClass
    case 'etsy':
      return EtsyServiceClass
    case 'shopify':
      return ShopifyServiceClass
    default:
      throw new Error(`Unknown marketplace platform: ${platform}`)
  }
}

/**
 * Platform fee mapping for profit calculations
 */
export const MARKETPLACE_FEES: Record<string, number> = {
  vinted: 5,
  ebay: 12.8,
  etsy: 6.5,
  shopify: 2.9,
}

/**
 * Get platform fee percentage
 */
export function getMarketplaceFeePercent(platform: string): number {
  return MARKETPLACE_FEES[platform] || 0
}

/**
 * Normalize marketplace names (handle variations)
 */
export function normalizeMarketplaceName(name: string): string {
  const normalized = name.toLowerCase().trim()
  if (normalized.includes('ebay')) return 'ebay'
  if (normalized.includes('vinted')) return 'vinted'
  if (normalized.includes('etsy')) return 'etsy'
  if (normalized.includes('shopify')) return 'shopify'
  return normalized
}
