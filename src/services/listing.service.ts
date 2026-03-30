/**
 * Listing Service
 * Handles creation, updates, and cross-platform synchronization of marketplace listings
 */

import type { Find, Listing, Platform } from '@/types'
import { calculateFinalPrice } from '@/utils/marketplace-config'

export interface CreateListingInput {
  findId: string
  userId: string
  platform: Platform
  price: number
  description?: string
  platformSpecificData?: Record<string, unknown>
}

export interface ListingWithFind extends Listing {
  find?: Find
}

export interface ListingStats {
  totalListings: number
  activeListing: number
  soldCount: number
  delistedCount: number
}

/**
 * Create a single marketplace listing
 * Returns listing ID or throws error
 */
export async function createListing(input: CreateListingInput): Promise<Listing> {
  try {
    const response = await fetch('/api/listings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!response.ok) {
      throw new Error(`Failed to create listing: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Error creating listing:', error)
    throw error
  }
}

/**
 * Create listings across multiple platforms (cross-listing)
 * Returns array of created listings or errors
 */
export async function createListingsAcrossMarketplaces(
  findId: string,
  userId: string,
  platforms: Platform[],
  basePrice: number,
  description?: string
): Promise<{ listings: Listing[]; errors: Array<{ platform: Platform; error: string }> }> {
  const listings: Listing[] = []
  const errors: Array<{ platform: Platform; error: string }> = []

  for (const platform of platforms) {
    try {
      const listing = await createListing({
        findId,
        userId,
        platform,
        price: basePrice,
        description,
      })
      listings.push(listing)
    } catch (error) {
      errors.push({
        platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { listings, errors }
}

/**
 * Get all listings for a find
 */
export async function getListingsForFind(
  findId: string,
  userId: string
): Promise<ListingWithFind[]> {
  try {
    const response = await fetch(`/api/listings?findId=${findId}&userId=${userId}`)

    if (!response.ok) {
      throw new Error('Failed to fetch listings')
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching listings:', error)
    return []
  }
}

/**
 * Get all listings for user
 */
export async function getAllListings(userId: string): Promise<ListingWithFind[]> {
  try {
    const response = await fetch(`/api/listings?userId=${userId}`)

    if (!response.ok) {
      throw new Error('Failed to fetch listings')
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching listings:', error)
    return []
  }
}

/**
 * Update listing (price, description, etc.)
 */
export async function updateListing(
  listingId: string,
  updates: Partial<Omit<Listing, 'id' | 'find_id' | 'user_id' | 'platform'>>
): Promise<Listing> {
  try {
    const response = await fetch(`/api/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (!response.ok) {
      throw new Error('Failed to update listing')
    }

    return response.json()
  } catch (error) {
    console.error('Error updating listing:', error)
    throw error
  }
}

/**
 * Delist from single platform
 */
export async function delistListing(listingId: string): Promise<void> {
  try {
    const response = await fetch(`/api/listings/${listingId}/delist`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to delist')
    }
  } catch (error) {
    console.error('Error delisting:', error)
    throw error
  }
}

/**
 * Delist from all platforms (when item sells on one platform)
 */
export async function delistFromAllPlatforms(findId: string): Promise<void> {
  try {
    const response = await fetch(`/api/listings/delist-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ findId }),
    })

    if (!response.ok) {
      throw new Error('Failed to delist from all platforms')
    }
  } catch (error) {
    console.error('Error delisting from all platforms:', error)
    throw error
  }
}

/**
 * Sync listing with marketplace API
 * Updates views, likes, etc. from live marketplace data
 */
export async function syncListing(listingId: string): Promise<Listing> {
  try {
    const response = await fetch(`/api/listings/${listingId}/sync`, {
      method: 'POST',
    })

    if (!response.ok) {
      throw new Error('Failed to sync listing')
    }

    return response.json()
  } catch (error) {
    console.error('Error syncing listing:', error)
    throw error
  }
}

/**
 * Get listing statistics for user
 */
export async function getListingStats(userId: string): Promise<ListingStats> {
  try {
    const response = await fetch(`/api/listings/stats?userId=${userId}`)

    if (!response.ok) {
      throw new Error('Failed to fetch stats')
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching stats:', error)
    return {
      totalListings: 0,
      activeListing: 0,
      soldCount: 0,
      delistedCount: 0,
    }
  }
}

/**
 * Helper: Calculate profit after fees
 */
export function calculateProfit(
  salePrice: number,
  costPrice: number,
  platform: Platform
): number {
  const finalPrice = calculateFinalPrice(salePrice, platform)
  return finalPrice - costPrice
}
