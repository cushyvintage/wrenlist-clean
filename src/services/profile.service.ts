/**
 * Profile Service
 * Handles user profile and subscription plan operations
 */

import { supabase, validateSupabaseConfig } from './supabase'
import { Profile, PlanId } from '@/types'

/**
 * Get the current user's profile
 */
export async function getProfile(): Promise<Profile | null> {
  validateSupabaseConfig()

  const user = await supabase.auth.getUser()
  if (!user || !user.data?.user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.data.user.id)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

/**
 * Create a new profile for the current user
 */
export async function createProfile(
  fullName?: string,
  location?: string
): Promise<Profile> {
  validateSupabaseConfig()

  const user = await supabase.auth.getUser()
  if (!user || !user.data?.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert([
      {
        user_id: user.data.user.id,
        full_name: fullName || null,
        location: location || null,
        plan: 'free' as PlanId,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update the current user's profile
 */
export async function updateProfile(
  updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<Profile> {
  validateSupabaseConfig()

  const user = await supabase.auth.getUser()
  if (!user || !user.data?.user) {
    throw new Error('User not authenticated')
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', user.data.user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update user's subscription plan
 */
export async function updatePlan(plan: PlanId): Promise<Profile> {
  return updateProfile({ plan })
}

/**
 * Get user's current plan
 */
export async function getPlan(): Promise<PlanId | null> {
  const profile = await getProfile()
  return profile?.plan || null
}

/**
 * Check if user has reached find limit for current plan
 */
export async function canAddFind(): Promise<boolean> {
  const profile = await getProfile()
  if (!profile) return false

  const planLimits: Record<PlanId, number> = {
    free: 5,
    nester: 50,
    forager: 500,
    flock: 999999,
  }

  const limit = planLimits[profile.plan]
  return profile.finds_this_month < limit
}

/**
 * Increment finds_this_month counter
 */
export async function incrementFindCount(): Promise<void> {
  const user = await supabase.auth.getUser()
  if (!user || !user.data?.user) {
    throw new Error('User not authenticated')
  }

  const { error } = await supabase.rpc('increment_find_count', {
    user_id: user.data.user.id,
  })

  if (error) throw error
}

/**
 * Reset finds_this_month if reset date has passed
 */
export async function checkAndResetFindCount(): Promise<void> {
  const profile = await getProfile()
  if (!profile) return

  const resetDate = new Date(profile.finds_reset_at)
  const now = new Date()

  // Reset if 30 days have passed
  if (now.getTime() - resetDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
    await updateProfile({
      finds_this_month: 0,
      finds_reset_at: now.toISOString(),
    })
  }
}
