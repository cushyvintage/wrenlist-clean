'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: Error | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthContextType>({
    user: null,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for existing session
        // Use server-side /api/auth/me to get user (reads httpOnly session cookie)
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store',
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setState((prev) => ({
              ...prev,
              user: {
                id: data.user.id,
                email: data.user.email || '',
                createdAt: data.user.created_at || new Date().toISOString(),
                full_name: data.user.full_name || null,
                avatar_url: data.user.avatar_url || null,
              },
              isLoading: false,
            }))
            return
          }
        }
        setState((prev) => ({ ...prev, user: null, isLoading: false }))
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Auth initialization failed'),
          isLoading: false,
        }))
      }
    }

    initAuth()
    // Note: onAuthStateChange removed — plain supabase client cannot read
    // httpOnly session cookies set by the SSR login route. Auth state is
    // managed exclusively via /api/auth/me which reads cookies server-side.
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
