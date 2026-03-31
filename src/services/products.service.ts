/**
 * Finds Service
 * Handles all find operations: create, read, update, delete
 */

import { supabase, validateSupabaseConfig } from './supabase'
import { Find, FindStatus } from '@/types'

/**
 * Get all finds for the current user
 */
export async function getFinds(
  filters?: {
    status?: FindStatus | 'all'
    search?: string
  }
): Promise<Find[]> {
  validateSupabaseConfig()

  let query = supabase
    .from('finds')
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
 * Get a single find by ID
 */
export async function getFind(id: string): Promise<Find | null> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('finds')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows
  return data || null
}

/**
 * Create a new find
 */
export async function createFind(
  data: Omit<Find, 'id' | 'created_at' | 'updated_at'>
): Promise<Find> {
  validateSupabaseConfig()

  const { data: newFind, error } = await supabase
    .from('finds')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return newFind
}

/**
 * Update a find
 */
export async function updateFind(
  id: string,
  updates: Partial<Omit<Find, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Find> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('finds')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete a find
 */
export async function deleteFind(id: string): Promise<void> {
  validateSupabaseConfig()

  const { error } = await supabase
    .from('finds')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Get find statistics for dashboard
 */
export async function getFindStats(): Promise<{
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
    .from('finds')
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
    draft: data.filter((f) => f.status === 'draft').length,
    listed: data.filter((f) => f.status === 'listed').length,
    onHold: data.filter((f) => f.status === 'on_hold').length,
    sold: data.filter((f) => f.status === 'sold').length,
    totalValue: data.reduce((sum, f) => sum + (f.asking_price_gbp || 0), 0),
    avgMargin: null as number | null,
  }

  // Calculate average margin
  const withMargin = data.filter((f) => f.cost_gbp && f.asking_price_gbp && f.asking_price_gbp > 0)
  if (withMargin.length > 0) {
    const margins = withMargin.map((f) => ((f.asking_price_gbp! - f.cost_gbp!) / f.asking_price_gbp!) * 100)
    stats.avgMargin = Math.round(margins.reduce((sum, m) => sum + m, 0) / margins.length)
  }

  return stats
}

/**
 * Get finds by status
 */
export async function getFindsByStatus(status: FindStatus): Promise<Find[]> {
  validateSupabaseConfig()

  const { data, error } = await supabase
    .from('finds')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Legacy aliases for backward compatibility
export const getProducts = getFinds
export const getProduct = getFind
export const createProduct = createFind
export const updateProduct = updateFind
export const deleteProduct = deleteFind
export const getProductStats = getFindStats
export const getProductsByStatus = getFindsByStatus
