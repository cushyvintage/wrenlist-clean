/**
 * Etsy API Integration
 * Wrapper for Etsy API operations (list, update, delist)
 *
 * API Docs: https://developers.etsy.com/documentation
 * Uses OAuth 2.0 for authentication
 * Base URL: https://openapi.etsy.com/v3
 *
 * Fee Structure: 6.5% commission + payment processing fee
 */

import { ApiResponse } from '@/lib/api-response'

export interface EtsyListingInput {
  title: string
  description: string
  price: number
  tags: string[]
  processingTime: string
  shopSectionId?: string
  quantity?: number
  photos?: string[]
}

export interface EtsyListingResponse {
  id: string
  url: string
  status: string
  price: number
  views: number
  likes: number
}

export interface EtsyErrorResponse {
  error?: string
  message?: string
  errors?: Array<{
    code: string
    message: string
  }>
}

class EtsyService {
  private baseUrl = 'https://openapi.etsy.com/v3'
  private accessToken: string
  private shopId: string

  constructor(accessToken: string, shopId: string) {
    this.accessToken = accessToken
    this.shopId = shopId
  }

  /**
   * Authenticate with Etsy API
   * Validates OAuth token
   */
  async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/application/shops/${this.shopId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }
    } catch (error) {
      throw new Error(`Etsy authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get shop info
   */
  async getShopInfo(): Promise<ApiResponse<{ id: string; name: string; sections: Array<{ id: string; title: string }> }>> {
    try {
      const response = await fetch(`${this.baseUrl}/application/shops/${this.shopId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch shop info',
        }
      }

      const data = (await response.json()) as {
        shop?: {
          shop_id: string
          shop_name: string
        }
      }

      // Fetch sections separately
      const sectionsResponse = await fetch(
        `${this.baseUrl}/application/shops/${this.shopId}/sections`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      )

      const sections = sectionsResponse.ok
        ? ((await sectionsResponse.json()) as {
            results?: Array<{ shop_section_id: string; title: string }>
          }).results?.map((s) => ({
            id: s.shop_section_id.toString(),
            title: s.title,
          })) || []
        : []

      return {
        status: 200,
        data: {
          id: data.shop?.shop_id || this.shopId,
          name: data.shop?.shop_name || '',
          sections,
        },
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    try {
      const response = await fetch(`${this.baseUrl}/application/seller-taxonomy/categories`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch categories',
        }
      }

      const data = (await response.json()) as {
        results?: Array<{ id: number; name: string }>
      }
      const categories =
        data.results?.map((cat) => ({
          id: cat.id.toString(),
          name: cat.name,
        })) || []

      return {
        status: 200,
        data: categories,
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a listing on Etsy
   */
  async createListing(input: EtsyListingInput): Promise<ApiResponse<EtsyListingResponse>> {
    try {
      // Limit tags to 13
      const tags = input.tags.slice(0, 13)

      const payload = {
        title: input.title,
        description: input.description,
        price: input.price,
        quantity: input.quantity || 1,
        tags,
        shop_section_id: input.shopSectionId ? parseInt(input.shopSectionId, 10) : undefined,
        state: 'active',
      }

      const response = await fetch(`${this.baseUrl}/application/shops/${this.shopId}/listings`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as EtsyErrorResponse
        const errorMsg = errorData.errors?.[0]?.message || errorData.message || 'Failed to create listing'
        return {
          status: response.status,
          error: errorMsg,
        }
      }

      const listing = (await response.json()) as {
        results?: Array<{
          listing_id: number
          url: string
          state: string
          price: number
          view_count?: number
          favorite_count?: number
        }>
      }

      const result = listing.results?.[0]

      if (!result) {
        return {
          status: 400,
          error: 'No listing returned',
        }
      }

      return {
        status: 201,
        data: {
          id: result.listing_id.toString(),
          url: result.url,
          status: result.state,
          price: result.price,
          views: result.view_count || 0,
          likes: result.favorite_count || 0,
        },
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Update an existing Etsy listing
   */
  async updateListing(
    listingId: string,
    updates: Partial<EtsyListingInput>
  ): Promise<ApiResponse<EtsyListingResponse>> {
    try {
      const payload: Record<string, unknown> = {}

      if (updates.title) payload.title = updates.title
      if (updates.description) payload.description = updates.description
      if (updates.price) payload.price = updates.price
      if (updates.tags) payload.tags = updates.tags.slice(0, 13)

      const response = await fetch(`${this.baseUrl}/application/shops/${this.shopId}/listings/${listingId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as EtsyErrorResponse
        const errorMsg = errorData.errors?.[0]?.message || errorData.message || 'Failed to update listing'
        return {
          status: response.status,
          error: errorMsg,
        }
      }

      const listing = (await response.json()) as {
        results?: Array<{
          listing_id: number
          url: string
          state: string
          price: number
          view_count?: number
          favorite_count?: number
        }>
      }

      const result = listing.results?.[0]

      return {
        status: 200,
        data: {
          id: result?.listing_id.toString() || listingId,
          url: result?.url || '',
          status: result?.state || 'active',
          price: result?.price || updates.price || 0,
          views: result?.view_count || 0,
          likes: result?.favorite_count || 0,
        },
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete/delist an item from Etsy
   */
  async delistListing(listingId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/application/shops/${this.shopId}/listings/${listingId}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      )

      if (!response.ok && response.status !== 204) {
        const errorData = (await response.json()) as EtsyErrorResponse
        const errorMsg = errorData.errors?.[0]?.message || errorData.message || 'Failed to delist'
        return {
          status: response.status,
          error: errorMsg,
        }
      }

      return {
        status: 204,
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get listing details
   */
  async getListing(listingId: string): Promise<ApiResponse<EtsyListingResponse>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/application/shops/${this.shopId}/listings/${listingId}`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      )

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch listing',
        }
      }

      const listing = (await response.json()) as {
        results?: Array<{
          listing_id: number
          url: string
          state: string
          price: number
          view_count?: number
          favorite_count?: number
        }>
      }

      const result = listing.results?.[0]

      if (!result) {
        return {
          status: 404,
          error: 'Listing not found',
        }
      }

      return {
        status: 200,
        data: {
          id: result.listing_id.toString(),
          url: result.url,
          status: result.state,
          price: result.price,
          views: result.view_count || 0,
          likes: result.favorite_count || 0,
        },
      }
    } catch (error) {
      return {
        status: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get request headers with OAuth token
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'User-Agent': 'Wrenlist/1.0',
      'x-api-key': 'etsy_api_key',
    }
  }
}

export default EtsyService
