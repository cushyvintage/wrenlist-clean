/**
 * Unified Marketplace Manager
 * Coordinates multi-platform listing operations with error handling
 */

import type { ApiResponse } from '@/lib/api-response'
import { createMarketplaceService, MARKETPLACE_FEES } from './index'
import { retryWithBackoff, PLATFORM_RETRY_CONFIG, CircuitBreaker } from './retry'

export interface ListingInput {
  title: string
  description: string
  price: number
  photos?: string[]
  platformSpecificData?: Record<string, unknown>
}

export interface MultiPlatformResult<T> {
  platform: string
  success: boolean
  data?: T
  error?: string
}

export interface CrossListingResult {
  listings: MultiPlatformResult<{ id: string; url: string }>[]
  failedPlatforms: string[]
  successCount: number
  failureCount: number
}

class MarketplaceManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map()
  private credentials: Record<string, Record<string, string>>

  constructor(credentials: Record<string, Record<string, string>>) {
    this.credentials = credentials

    // Initialize circuit breakers for each platform
    for (const platform of ['vinted', 'ebay', 'etsy', 'shopify']) {
      this.circuitBreakers.set(platform, new CircuitBreaker(5, 60000))
    }
  }

  /**
   * Create listing on single platform with retry logic
   */
  async createListing(
    platform: string,
    input: ListingInput
  ): Promise<MultiPlatformResult<{ id: string; url: string }>> {
    try {
      const circuitBreaker = this.circuitBreakers.get(platform)
      if (!circuitBreaker) {
        return {
          platform,
          success: false,
          error: `Unknown platform: ${platform}`,
        }
      }

      // Check circuit breaker
      if (circuitBreaker.getState() === 'open') {
        return {
          platform,
          success: false,
          error: `${platform} API is temporarily unavailable`,
        }
      }

      const retryConfig = PLATFORM_RETRY_CONFIG[platform]
      const platformCreds = this.credentials[platform]

      if (!platformCreds) {
        return {
          platform,
          success: false,
          error: `No credentials configured for ${platform}`,
        }
      }

      const result = await retryWithBackoff(async () => {
        const service = createMarketplaceService(platform, platformCreds)
        return await this.callPlatformService(service, platform, input)
      }, retryConfig)

      return {
        platform,
        success: true,
        data: result,
      }
    } catch (error) {
      return {
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create listings across multiple platforms
   */
  async createListingsAcrossMarketplaces(
    platforms: string[],
    input: ListingInput
  ): Promise<CrossListingResult> {
    const listings: MultiPlatformResult<{ id: string; url: string }>[] = []

    for (const platform of platforms) {
      const result = await this.createListing(platform, input)
      listings.push(result)
    }

    const successCount = listings.filter((r) => r.success).length
    const failureCount = listings.filter((r) => !r.success).length
    const failedPlatforms = listings.filter((r) => !r.success).map((r) => r.platform)

    return {
      listings,
      failedPlatforms,
      successCount,
      failureCount,
    }
  }

  /**
   * Update listing on platform
   */
  async updateListing(
    platform: string,
    listingId: string,
    updates: Partial<ListingInput>
  ): Promise<MultiPlatformResult<{ id: string; url: string }>> {
    try {
      const circuitBreaker = this.circuitBreakers.get(platform)
      if (!circuitBreaker || circuitBreaker.getState() === 'open') {
        return {
          platform,
          success: false,
          error: `${platform} API is unavailable`,
        }
      }

      const retryConfig = PLATFORM_RETRY_CONFIG[platform]
      const platformCreds = this.credentials[platform]

      if (!platformCreds) {
        return {
          platform,
          success: false,
          error: `No credentials configured for ${platform}`,
        }
      }

      const result = await retryWithBackoff(async () => {
        const service = createMarketplaceService(platform, platformCreds)
        return await this.callPlatformUpdateService(service, platform, listingId, updates)
      }, retryConfig)

      return {
        platform,
        success: true,
        data: result,
      }
    } catch (error) {
      return {
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delist from platform
   */
  async delistListing(platform: string, listingId: string): Promise<MultiPlatformResult<void>> {
    try {
      const circuitBreaker = this.circuitBreakers.get(platform)
      if (!circuitBreaker || circuitBreaker.getState() === 'open') {
        return {
          platform,
          success: false,
          error: `${platform} API is unavailable`,
        }
      }

      const retryConfig = PLATFORM_RETRY_CONFIG[platform]
      const platformCreds = this.credentials[platform]

      if (!platformCreds) {
        return {
          platform,
          success: false,
          error: `No credentials configured for ${platform}`,
        }
      }

      await retryWithBackoff(async () => {
        const service = createMarketplaceService(platform, platformCreds)
        return await this.callPlatformDelistService(service, platform, listingId)
      }, retryConfig)

      return {
        platform,
        success: true,
      }
    } catch (error) {
      return {
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Calculate profit after platform fees
   */
  calculateProfit(salePrice: number, costPrice: number, platform: string): number {
    const feePercent = MARKETPLACE_FEES[platform] || 0
    const platformFee = (salePrice * feePercent) / 100
    return salePrice - platformFee - costPrice
  }

  /**
   * Call appropriate platform service method
   */
  private async callPlatformService(
    service: unknown,
    platform: string,
    input: ListingInput
  ): Promise<{ id: string; url: string }> {
    // TypeScript allows us to call methods dynamically on unknown type
    // but we need to handle each platform's specific method signatures
    const svc = service as unknown

    if (platform === 'vinted') {
      const vintedService = svc as any
      const response = await vintedService.createListing({
        title: input.title,
        description: input.description,
        price: input.price,
        currency: 'GBP',
        condition: input.platformSpecificData?.condition || 'Good',
        shippingMethod: input.platformSpecificData?.shippingMethod || 'TRACKED',
        photos: input.photos,
      })

      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to create Vinted listing')
      }

      return { id: response.data!.id, url: response.data!.url }
    }

    if (platform === 'ebay') {
      const ebayService = svc as any
      const response = await ebayService.createListing({
        title: input.title,
        description: input.description,
        price: input.price,
        category: input.platformSpecificData?.category || 'default',
        condition: input.platformSpecificData?.condition || 'Good',
        photos: input.photos,
      })

      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to create eBay listing')
      }

      return { id: response.data!.id, url: response.data!.url }
    }

    if (platform === 'etsy') {
      const etsyService = svc as any
      const response = await etsyService.createListing({
        title: input.title,
        description: input.description,
        price: input.price,
        tags: input.platformSpecificData?.tags || [],
        processingTime: input.platformSpecificData?.processingTime || '1-2 days',
        photos: input.photos,
      })

      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to create Etsy listing')
      }

      return { id: response.data!.id, url: response.data!.url }
    }

    if (platform === 'shopify') {
      const shopifyService = svc as any
      const response = await shopifyService.createProduct({
        title: input.title,
        description: input.description,
        price: input.price,
        tags: input.platformSpecificData?.tags,
      })

      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to create Shopify product')
      }

      return { id: response.data!.id, url: response.data!.url }
    }

    throw new Error(`Unknown platform: ${platform}`)
  }

  /**
   * Call platform update service
   */
  private async callPlatformUpdateService(
    service: unknown,
    platform: string,
    listingId: string,
    updates: Partial<ListingInput>
  ): Promise<{ id: string; url: string }> {
    const svc = service as any

    if (platform === 'vinted') {
      const response = await svc.updateListing(listingId, {
        title: updates.title,
        description: updates.description,
        price: updates.price,
      })

      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to update Vinted listing')
      }

      return { id: response.data!.id, url: response.data!.url }
    }

    if (platform === 'ebay') {
      const response = await svc.updateListing(listingId, {
        title: updates.title,
        description: updates.description,
        price: updates.price,
      })

      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to update eBay listing')
      }

      return { id: response.data!.id, url: response.data!.url }
    }

    if (platform === 'etsy') {
      const response = await svc.updateListing(listingId, {
        title: updates.title,
        description: updates.description,
        price: updates.price,
      })

      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to update Etsy listing')
      }

      return { id: response.data!.id, url: response.data!.url }
    }

    if (platform === 'shopify') {
      const response = await svc.updateProduct(listingId, {
        title: updates.title,
        description: updates.description,
        price: updates.price,
      })

      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to update Shopify product')
      }

      return { id: response.data!.id, url: response.data!.url }
    }

    throw new Error(`Unknown platform: ${platform}`)
  }

  /**
   * Call platform delist service
   */
  private async callPlatformDelistService(
    service: unknown,
    platform: string,
    listingId: string
  ): Promise<void> {
    const svc = service as any

    if (platform === 'vinted') {
      const response = await svc.delistListing(listingId)
      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to delist from Vinted')
      }
    } else if (platform === 'ebay') {
      const response = await svc.delistListing(listingId)
      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to delist from eBay')
      }
    } else if (platform === 'etsy') {
      const response = await svc.delistListing(listingId)
      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to delist from Etsy')
      }
    } else if (platform === 'shopify') {
      const response = await svc.deleteProduct(listingId)
      if (!response.status || response.status >= 400) {
        throw new Error(response.error || 'Failed to delete Shopify product')
      }
    } else {
      throw new Error(`Unknown platform: ${platform}`)
    }
  }
}

export default MarketplaceManager
