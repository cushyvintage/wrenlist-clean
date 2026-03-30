/**
 * Listings Service
 * Handles multi-marketplace listing operations
 */

import { supabase, validateSupabaseConfig } from './supabase'
import { Listing, Platform, ListingStatus } from '@/types'

/**
 * Get all listings for the current user
 */
export async function getListings(
  filters?: {
    platform?: Platform
    status?: ListingStatus
  }
): Promise<Listing[]> {
  validateSupabaseConfig()

  let query = supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.platform) {
    query = query.eq('platform', filters.platform)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Get listing for a specific product
 */
export async function getProductListings(productId: string): Promise<Listing[]> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get a single listing by ID
 */
export async function getListing(id: string): Promise<Listing | null> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

/**
 * Create a new listing
 */
export async function createListing(
  data: Omit<Listing, 'id' | 'created_at' | 'updated_at'>
): Promise<Listing> {
  validateSupabaseConfig()

  const { data: newListing, error } = await supabase
    .from('listings')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return newListing
}

/**
 * Update a listing
 */
export async function updateListing(
  id: string,
  updates: Partial<Omit<Listing, 'id' | 'user_id' | 'product_id' | 'created_at' | 'updated_at'>>
): Promise<Listing> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a listing
 */
export async function deleteListing(id: string): Promise<void> {
  validateSupabaseConfig()

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get listings by platform
 */
export async function getListingsByPlatform(platform: Platform): Promise<Listing[]> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('platform', platform)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get active listings (live or draft)
 */
export async function getActiveListing(): Promise<Listing[]> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .in('status', ['live', 'draft'])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Get listing statistics
 */
export async function getListingStats(): Promise<{
  total: number
  live: number
  draft: number
  sold: number
  totalViews: number
  avgViewsPerListing: number
}> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('listings')
    .select('status, views')

  if (error) throw error
  if (!data || data.length === 0) {
    return {
      total: 0,
      live: 0,
      draft: 0,
      sold: 0,
      totalViews: 0,
      avgViewsPerListing: 0,
    }
  }

  const stats = {
    total: data.length,
    live: data.filter((l) => l.status === 'live').length,
    draft: data.filter((l) => l.status === 'draft').length,
    sold: data.filter((l) => l.status === 'sold').length,
    totalViews: data.reduce((sum, l) => sum + (l.views || 0), 0),
    avgViewsPerListing: 0,
  }

  if (stats.total > 0) {
    stats.avgViewsPerListing = Math.round(stats.totalViews / stats.total)
  }

  return stats
}
