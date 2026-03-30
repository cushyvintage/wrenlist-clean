/**
 * Authentication service
 */

import { supabase, signUp as supabaseSignUp, signIn as supabaseSignIn, signOut as supabaseSignOut, validateSupabaseConfig, resetPassword as supabaseResetPassword, updatePassword as supabaseUpdatePassword, resendVerificationEmail as supabaseResendVerificationEmail } from './supabase'
import { User } from '@/types'

/**
 * Parse Supabase auth errors and provide user-friendly messages
 */
function parseAuthError(error: any): string {
  const message = error?.message || error?.toString() || 'An unknown error occurred'

  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password'
  }
  if (message.includes('Email not confirmed')) {
    return 'Please verify your email before logging in'
  }
  if (message.includes('User already registered')) {
    return 'An account with this email already exists'
  }
  if (message.includes('Password')) {
    return 'Password must be at least 6 characters'
  }
  if (message.includes('Network')) {
    return 'Network error. Please check your connection'
  }
  return message
}

export async function registerUser(email: string, password: string): Promise<{ user: User } | null> {
  validateSupabaseConfig()
  try {
    const data = await supabaseSignUp(email, password)
    if (!data.user) return null

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        createdAt: data.user.created_at || new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Sign up error:', error)
    const message = parseAuthError(error)
    throw new Error(message)
  }
}

export async function loginUser(email: string, password: string): Promise<{ user: User } | null> {
  validateSupabaseConfig()
  try {
    const data = await supabaseSignIn(email, password)
    if (!data.user) return null

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        createdAt: data.user.created_at || new Date().toISOString(),
      },
    }
  } catch (error) {
    console.error('Sign in error:', error)
    const message = parseAuthError(error)
    throw new Error(message)
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await supabaseSignOut()
  } catch (error) {
    console.error('Sign out error:', error)
    throw error
  }
}

export async function getCurrentUser(): Promise<User | null> {
  validateSupabaseConfig()
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return null

    return {
      id: data.user.id,
      email: data.user.email || '',
      createdAt: data.user.created_at || new Date().toISOString(),
    }
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  validateSupabaseConfig()
  try {
    await supabaseResetPassword(email)
  } catch (error) {
    console.error('Reset password error:', error)
    const message = parseAuthError(error)
    throw new Error(message)
  }
}

/**
 * Update user password with new password
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  validateSupabaseConfig()
  try {
    await supabaseUpdatePassword(newPassword)
  } catch (error) {
    console.error('Update password error:', error)
    const message = parseAuthError(error)
    throw new Error(message)
  }
}

/**
 * Resend verification email
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  validateSupabaseConfig()
  try {
    await supabaseResendVerificationEmail(email)
  } catch (error) {
    console.error('Resend verification email error:', error)
    const message = parseAuthError(error)
    throw new Error(message)
  }
}
