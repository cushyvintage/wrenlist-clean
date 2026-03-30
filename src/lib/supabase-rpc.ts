/**
 * Supabase RPC Functions
 * Helper functions for remote procedure calls
 */

import { supabase } from '@/services/supabase'

/**
 * Increment find count for user
 */
export async function incrementFindCount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_find_count', {
    user_id: userId,
  })

  if (error) throw error
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<{
  total_finds: number
  active_listings: number
  total_revenue: number
  avg_margin: number
}> {
  const { data, error } = await supabase.rpc('get_user_stats', {
    user_id: userId,
  })

  if (error) throw error
  return data || { total_finds: 0, active_listings: 0, total_revenue: 0, avg_margin: 0 }
}

/**
 * Calculate mileage allowance for period
 */
export async function calculateMileageAllowance(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ total_miles: number; deductible_value_gbp: number }> {
  const { data, error } = await supabase.rpc('calculate_mileage_allowance', {
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
  })

  if (error) throw error
  return data || { total_miles: 0, deductible_value_gbp: 0 }
}

/**
 * Calculate total expenses for period
 */
export async function calculateExpensesTotal(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ total_amount: number; total_vat: number }> {
  const { data, error } = await supabase.rpc('calculate_expenses_total', {
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
  })

  if (error) throw error
  return data || { total_amount: 0, total_vat: 0 }
}
