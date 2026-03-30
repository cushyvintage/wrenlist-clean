'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/services/supabase'
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
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          setState((prev) => ({
            ...prev,
            user: {
              id: session.user.id,
              email: session.user.email || '',
              createdAt: session.user.created_at || new Date().toISOString(),
            },
            isLoading: false,
          }))
        } else {
          setState((prev) => ({
            ...prev,
            user: null,
            isLoading: false,
          }))
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error : new Error('Auth initialization failed'),
          isLoading: false,
        }))
      }
    }

    initAuth()

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

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
