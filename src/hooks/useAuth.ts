'use client'

/**
 * Hook for managing authentication state
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/services/supabase'
import { getCurrentUser, loginUser, logoutUser, registerUser } from '@/services/auth.service'
import type { AuthState } from '@/types'

export function useAuth(): AuthState & {
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
  })

  const router = useRouter()

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        setState((prev) => ({
          ...prev,
          user: user || null,
          isLoading: false,
        }))
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Auth check failed'),
        }))
      }
    }

    checkAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setState((prev) => ({
          ...prev,
          user: {
            id: session.user.id,
            email: session.user.email || '',
            createdAt: session.user.created_at || new Date().toISOString(),
          },
        }))
      } else {
        setState((prev) => ({
          ...prev,
          user: null,
        }))
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const register = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await registerUser(email, password)
      if (result) {
        setState((prev) => ({ ...prev, user: result.user, isLoading: false }))
        router.push('/dashboard')
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Registration failed'),
        isLoading: false,
      }))
    }
  }

  const login = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await loginUser(email, password)
      if (result) {
        setState((prev) => ({ ...prev, user: result.user, isLoading: false }))
        router.push('/dashboard')
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Login failed'),
        isLoading: false,
      }))
    }
  }

  const logout = async () => {
    setState((prev) => ({ ...prev, isLoading: true }))
    try {
      await logoutUser()
      setState((prev) => ({ ...prev, user: null, isLoading: false }))
      router.push('/login')
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Logout failed'),
        isLoading: false,
      }))
    }
  }

  return {
    ...state,
    register,
    login,
    logout,
  }
}
