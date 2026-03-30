/**
 * Supabase client initialization
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Initialize with dummy credentials if not available (for build-time)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Validate credentials are available at runtime
export function validateSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase credentials. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    )
  }
}

/**
 * Get authenticated user from Supabase
 */
export async function getAuthUser() {
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    return data.user
  } catch (error) {
    console.error('Error getting auth user:', error)
    return null
  }
}

/**
 * Sign up new user
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  if (error) throw error
  return data
}

/**
 * Sign in existing user
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

/**
 * Sign out user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Reset password for user
 */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getBaseUrl()}/auth/reset-password`,
  })
  if (error) throw error
  return data
}

/**
 * Update user password
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  if (error) throw error
  return data
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  })
  if (error) throw error
  return data
}

/**
 * Get base URL for environment
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  return 'http://localhost:3000'
}
