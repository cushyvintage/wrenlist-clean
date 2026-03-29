/**
 * Authentication service
 */

import { supabase, signUp as supabaseSignUp, signIn as supabaseSignIn, signOut as supabaseSignOut, validateSupabaseConfig } from './supabase'
import { User } from '@/types'

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
    throw error
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
    throw error
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
