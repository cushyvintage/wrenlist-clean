/**
 * Marketplace integration types and interfaces
 * Standardizes marketplace connectors across eBay, Vinted, Etsy, Shopify
 */

export type MarketplaceId = 'ebay' | 'vinted' | 'etsy' | 'shopify'

/**
 * Connection status for a marketplace
 */
export interface MarketplaceStatus {
  connected: boolean
  setupComplete: boolean
  username?: string
  expiresAt?: string
}

/**
 * Result of publishing a find to a marketplace
 */
export interface PublishResult {
  success: boolean
  listingId: string
  listingUrl: string
  platform: MarketplaceId
  publishedAt: string
}

/**
 * Standard interface for marketplace connectors
 * Every marketplace must implement this to work with Wrenlist
 *
 * Examples:
 * - eBay: OAuth-based authentication, API-driven publishing
 * - Vinted: Extension-based (no direct API), postMessage relay
 * - Etsy: OAuth-based authentication, API-driven publishing
 * - Shopify: OAuth-based authentication, admin API publishing
 */
export interface MarketplaceConnector {
  id: MarketplaceId
  name: string

  /**
   * Get current connection status for user
   */
  getStatus(): Promise<MarketplaceStatus>

  /**
   * Publish a find to this marketplace
   * @param findId - ID of find to publish
   * @returns PublishResult with listing ID and URL
   */
  publish(findId: string): Promise<PublishResult>

  /**
   * Disconnect user's account from this marketplace
   */
  disconnect(): Promise<void>
}
