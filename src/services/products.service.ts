/**
 * Products (Finds) Service
 * Handles all product/find operations: create, read, update, delete
 */

import { supabase, validateSupabaseConfig } from './supabase'
import { Product, FindStatus } from '@/types'

/**
 * Get all products for the current user
 */
export async function getProducts(
  filters?: {
    status?: FindStatus | 'all'
    search?: string
  }
): Promise<Product[]> {
  validateSupabaseConfig()

  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status as FindStatus)
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,category.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Get a single product by ID
 */
export async function getProduct(id: string): Promise<Product | null> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data || null
}

/**
 * Create a new product
 */
export async function createProduct(
  data: Omit<Product, 'id' | 'created_at' | 'updated_at'>
): Promise<Product> {
  validateSupabaseConfig()

  const { data: newProduct, error } = await supabase
    .from('products')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return newProduct
}

/**
 * Update a product
 */
export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Product> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a product
 */
export async function deleteProduct(id: string): Promise<void> {
  validateSupabaseConfig()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get product statistics for dashboard
 */
export async function getProductStats(): Promise<{
  total: number
  draft: number
  listed: number
  onHold: number
  sold: number
  totalValue: number
  avgMargin: number | null
}> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('products')
    .select('status, cost_gbp, asking_price_gbp')

  if (error) throw error
  if (!data || data.length === 0) {
    return {
      total: 0,
      draft: 0,
      listed: 0,
      onHold: 0,
      sold: 0,
      totalValue: 0,
      avgMargin: null,
    }
  }

  const stats = {
    total: data.length,
    draft: data.filter((p) => p.status === 'draft').length,
    listed: data.filter((p) => p.status === 'listed').length,
    onHold: data.filter((p) => p.status === 'on_hold').length,
    sold: data.filter((p) => p.status === 'sold').length,
    totalValue: data.reduce((sum, p) => sum + (p.asking_price_gbp || 0), 0),
    avgMargin: null as number | null,
  }

  // Calculate average margin
  const withMargin = data.filter((p) => p.cost_gbp && p.asking_price_gbp && p.asking_price_gbp > 0)
  if (withMargin.length > 0) {
    const margins = withMargin.map((p) => ((p.asking_price_gbp! - p.cost_gbp!) / p.asking_price_gbp!) * 100)
    stats.avgMargin = Math.round(margins.reduce((sum, m) => sum + m, 0) / margins.length)
  }

  return stats
}

/**
 * Get products by status
 */
export async function getProductsByStatus(status: FindStatus): Promise<Product[]> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}
