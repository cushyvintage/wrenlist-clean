/**
 * Marketplace Connector Registry
 * Maps MarketplaceId to connector implementations
 */

import { EbayConnector } from './ebay-connector'
import type { MarketplaceConnector, MarketplaceId } from './types'

/**
 * Get connector for a marketplace
 * @param marketplaceId - 'ebay', 'vinted', 'etsy', 'shopify'
 * @param userId - User ID to authenticate with
 * @returns MarketplaceConnector instance
 *
 * Usage:
 *   const ebay = getConnector('ebay', userId)
 *   const status = await ebay.getStatus()
 *   const result = await ebay.publish(findId)
 */
export function getConnector(marketplaceId: MarketplaceId, userId: string): MarketplaceConnector {
  switch (marketplaceId) {
    case 'ebay':
      return new EbayConnector(userId)
    case 'vinted':
      // TODO: Implement VintedConnector (extension-based)
      throw new Error('Vinted connector not yet implemented')
    case 'etsy':
      // TODO: Implement EtsyConnector (OAuth-based)
      throw new Error('Etsy connector not yet implemented')
    case 'shopify':
      // TODO: Implement ShopifyConnector (OAuth-based)
      throw new Error('Shopify connector not yet implemented')
    default:
      const _exhaustive: never = marketplaceId
      throw new Error(`Unknown marketplace: ${_exhaustive}`)
  }
}

/**
 * Get all available connectors for a user
 */
export function getAllConnectors(userId: string): Record<MarketplaceId, MarketplaceConnector> {
  return {
    ebay: new EbayConnector(userId),
    vinted: undefined as any, // TODO: VintedConnector
    etsy: undefined as any, // TODO: EtsyConnector
    shopify: undefined as any, // TODO: ShopifyConnector
  }
}
