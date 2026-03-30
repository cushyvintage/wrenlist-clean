'use client'

/**
 * Hook for managing authentication state and actions
 * Uses AuthContext for state and auth.service for actions
 */

import { useRouter } from 'next/navigation'
import { loginUser, logoutUser, registerUser } from '@/services/auth.service'
import { useAuthContext } from '@/contexts/AuthContext'
import type { AuthState } from '@/types'

export function useAuth(): AuthState & {
  register: (email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
} {
  const router = useRouter()
  const authState = useAuthContext()

  const register = async (email: string, password: string) => {
    try {
      const result = await registerUser(email, password)
      if (result) {
        router.push('/verify-email')
      }
    } catch (error) {
      throw error
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const result = await loginUser(email, password)
      if (result) {
        router.push('/dashboard')
      }
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await logoutUser()
      router.push('/login')
    } catch (error) {
      throw error
    }
  }

  return {
    ...authState,
    register,
    login,
    logout,
  }
}
