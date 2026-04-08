/**
 * Vinted API Integration
 * Wrapper for Vinted API operations (list, update, delist)
 *
 * API Docs: https://www.vinted.com/api-docs
 * Base URL: https://api.vinted.com/api/v2
 *
 * Fee Structure: No seller fees — Vinted charges buyers via "buyer protection"
 */

import { ApiResponse } from '@/lib/api-response'

export interface VintedListingInput {
  title: string
  description: string
  price: number
  currency: string
  condition: 'Never worn' | 'Good' | 'Very good' | 'Fair' | 'Poor'
  shippingMethod: 'UNTRACKED' | 'TRACKED' | 'PICK_UP'
  photos?: string[]
  brand?: string
  size?: string
  color?: string
}

export interface VintedListingResponse {
  id: string
  url: string
  status: string
  price: number
  views: number
  likes: number
}

export interface VintedErrorResponse {
  error: string
  message: string
  code: number
}

class VintedService {
  private baseUrl = 'https://api.vinted.com/api/v2'
  private apiKey: string
  private bearerToken?: string

  constructor(apiKey: string, bearerToken?: string) {
    this.apiKey = apiKey
    this.bearerToken = bearerToken
  }

  /**
   * Authenticate with Vinted API
   * Validates credentials before making requests
   */
  async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/users/me`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`)
      }

      // Token is valid
    } catch (error) {
      throw new Error(`Vinted authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get categories from Vinted
   * Returns list of available categories for listings
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/catalogs`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch categories',
        }
      }

      const data = await response.json()
      const categories = data.catalogs?.map((cat: { id: string; title: string }) => cat.title) || []

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
   * Create a listing on Vinted
   * Posts item for sale with details
   */
  async createListing(input: VintedListingInput): Promise<ApiResponse<VintedListingResponse>> {
    try {
      const payload = {
        item: {
          title: input.title,
          description: input.description,
          price: input.price,
          currency_code: input.currency,
          condition: this.mapCondition(input.condition),
          size: input.size,
          brand: input.brand,
          color: input.color,
        },
        delivery_type: input.shippingMethod,
        photos: input.photos || [],
      }

      const response = await fetch(`${this.baseUrl}/items`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as VintedErrorResponse
        return {
          status: response.status,
          error: errorData.message || 'Failed to create listing',
        }
      }

      const listing = await response.json()

      return {
        status: 201,
        data: {
          id: listing.item.id,
          url: listing.item.url,
          status: listing.item.status,
          price: listing.item.price,
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
   * Update an existing Vinted listing
   * Modifies price, description, or other fields
   */
  async updateListing(
    listingId: string,
    updates: Partial<VintedListingInput>
  ): Promise<ApiResponse<VintedListingResponse>> {
    try {
      const payload = {
        item: {
          ...(updates.title && { title: updates.title }),
          ...(updates.description && { description: updates.description }),
          ...(updates.price && { price: updates.price }),
          ...(updates.condition && { condition: this.mapCondition(updates.condition) }),
        },
        ...(updates.shippingMethod && { delivery_type: updates.shippingMethod }),
      }

      const response = await fetch(`${this.baseUrl}/items/${listingId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as VintedErrorResponse
        return {
          status: response.status,
          error: errorData.message || 'Failed to update listing',
        }
      }

      const listing = await response.json()

      return {
        status: 200,
        data: {
          id: listing.item.id,
          url: listing.item.url,
          status: listing.item.status,
          price: listing.item.price,
          views: listing.item.views_count || 0,
          likes: listing.item.favourite_count || 0,
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
   * Delete/delist an item from Vinted
   */
  async delistListing(listingId: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/items/${listingId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })

      if (!response.ok && response.status !== 204) {
        const errorData = (await response.json()) as VintedErrorResponse
        return {
          status: response.status,
          error: errorData.message || 'Failed to delist',
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
   * Get listing details and stats
   */
  async getListing(listingId: string): Promise<ApiResponse<VintedListingResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/items/${listingId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        return {
          status: response.status,
          error: 'Failed to fetch listing',
        }
      }

      const listing = await response.json()

      return {
        status: 200,
        data: {
          id: listing.item.id,
          url: listing.item.url,
          status: listing.item.status,
          price: listing.item.price,
          views: listing.item.views_count || 0,
          likes: listing.item.favourite_count || 0,
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
   * Map internal condition format to Vinted's format
   */
  private mapCondition(condition: string): number {
    const conditionMap: Record<string, number> = {
      'Never worn': 1,
      Good: 2,
      'Very good': 3,
      Fair: 4,
      Poor: 5,
    }
    return conditionMap[condition] || 2
  }

  /**
   * Get request headers with auth
   */
  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Wrenlist/1.0',
    }

    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`
    } else {
      headers['X-API-Key'] = this.apiKey
    }

    return headers
  }
}

export default VintedService
