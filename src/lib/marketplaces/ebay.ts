/**
 * eBay API Integration
 * Wrapper for eBay API operations (list, update, delist)
 *
 * API Docs: https://developer.ebay.com/docs
 * Uses OAuth 2.0 for authentication
 * Base URL: https://api.ebay.com
 *
 * Fee Structure: 12.8% commission on successful sales
 */

import { ApiResponse } from '@/lib/api-response'

export interface EbayListingInput {
  title: string
  description: string
  price: number
  category: string
  condition: 'New' | 'Like New' | 'Excellent' | 'Good' | 'Fair' | 'For Parts/Not Working'
  listingDuration?: '1' | '3' | '7' | '30'
  shippingMethod?: string
  photos?: string[]
  quantity?: number
}

export interface EbayListingResponse {
  id: string
  url: string
  status: string
  price: number
  views: number
  likes: number
}

export interface EbayErrorResponse {
  errors?: Array<{
    errorId: string
    domain: string
    category: string
    message: string
    longMessage?: string
  }>
}

class EbayService {
  private baseUrl = 'https://api.ebay.com'
  private accessToken: string
  private clientId: string
  private clientSecret: string

  constructor(accessToken: string, clientId: string, clientSecret: string) {
    this.accessToken = accessToken
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  /**
   * Authenticate with eBay API
   * Validates OAuth token
   */
  async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/sell/account/v1/selling/account_summary`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }
    } catch (error) {
      throw new Error(`eBay authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Refresh OAuth token when expired
   */
  async refreshToken(refreshToken: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }

      const data = (await response.json()) as { access_token: string }
      this.accessToken = data.access_token
      return data.access_token
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get eBay categories
   */
  async getCategories(): Promise<ApiResponse<Array<{ id: string; name: string }>>> {
    try {
      const response = await fetch(`${this.baseUrl}/commerce/catalog/v1/category_tree/0`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch categories',
        }
      }

      const data = (await response.json()) as { categoryTreeNodes?: Array<{ categoryId: string; categoryName: string }> }
      const categories =
        data.categoryTreeNodes?.map((cat) => ({
          id: cat.categoryId,
          name: cat.categoryName,
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
   * Create a listing on eBay
   */
  async createListing(input: EbayListingInput): Promise<ApiResponse<EbayListingResponse>> {
    try {
      const payload = {
        listing_format: 'FIXED_PRICE',
        item: {
          title: input.title,
          description: input.description,
          condition: this.mapCondition(input.condition),
          primary_category: { category_id: input.category },
          quantity: input.quantity || 1,
          price: {
            currency: 'GBP',
            value: input.price.toString(),
          },
          pictures: input.photos?.map((photo) => ({ image_url: photo })) || [],
        },
        listing_policies: {
          fulfillment_policy_id: 'default',
          payment_policy_id: 'default',
          return_policy_id: 'default',
        },
      }

      const response = await fetch(`${this.baseUrl}/sell/listing/v1/item_draft`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as EbayErrorResponse
        const errorMsg = errorData.errors?.[0]?.longMessage || 'Failed to create listing'
        return {
          status: response.status,
          error: errorMsg,
        }
      }

      const listing = (await response.json()) as { item_id?: string; item?: { id: string } }
      const itemId = listing.item_id || listing.item?.id || 'unknown'

      return {
        status: 201,
        data: {
          id: itemId,
          url: `https://www.ebay.co.uk/itm/${itemId}`,
          status: 'active',
          price: input.price,
          views: 0,
          likes: 0,
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
   * Update an existing eBay listing
   */
  async updateListing(
    listingId: string,
    updates: Partial<EbayListingInput>
  ): Promise<ApiResponse<EbayListingResponse>> {
    try {
      const payload: Record<string, unknown> = {
        listing_format: 'FIXED_PRICE',
      }

      if (updates.title || updates.description) {
        payload.item = {
          ...(updates.title && { title: updates.title }),
          ...(updates.description && { description: updates.description }),
        }
      }

      const response = await fetch(`${this.baseUrl}/sell/listing/v1/item_draft/${listingId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as EbayErrorResponse
        const errorMsg = errorData.errors?.[0]?.longMessage || 'Failed to update listing'
        return {
          status: response.status,
          error: errorMsg,
        }
      }

      return {
        status: 200,
        data: {
          id: listingId,
          url: `https://www.ebay.co.uk/itm/${listingId}`,
          status: 'active',
          price: updates.price || 0,
          views: 0,
          likes: 0,
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
   * Delete/delist an item from eBay
   */
  async delistListing(listingId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/sell/listing/v1/item/${listingId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      if (!response.ok && response.status !== 204) {
        const errorData = (await response.json()) as EbayErrorResponse
        const errorMsg = errorData.errors?.[0]?.longMessage || 'Failed to delist'
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
  async getListing(listingId: string): Promise<ApiResponse<EbayListingResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/sell/listing/v1/item/${listingId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch listing',
        }
      }

      const listing = (await response.json()) as {
        item_id: string
        price?: { value: string }
        view_count?: number
        favorite_count?: number
      }

      return {
        status: 200,
        data: {
          id: listing.item_id,
          url: `https://www.ebay.co.uk/itm/${listing.item_id}`,
          status: 'active',
          price: listing.price ? parseFloat(listing.price.value) : 0,
          views: listing.view_count || 0,
          likes: listing.favorite_count || 0,
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
   * Map internal condition to eBay condition code
   */
  private mapCondition(condition: string): string {
    const conditionMap: Record<string, string> = {
      New: 'NEW',
      'Like New': 'LIKE_NEW',
      Excellent: 'EXCELLENT',
      Good: 'GOOD',
      Fair: 'FAIR',
      'For Parts/Not Working': 'FOR_PARTS_NOT_WORKING',
    }
    return conditionMap[condition] || 'GOOD'
  }

  /**
   * Get request headers with OAuth token
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      'User-Agent': 'Wrenlist/1.0',
    }
  }
}

export default EbayService
