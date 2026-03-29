'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Find } from '@/types'

export function useSaveFind() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveFind = async (find: Omit<Find, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: err } = await supabase
        .from('finds')
        .insert([
          {
            ...find,
            user_id: 'current-user', // TODO: Get from auth context
          },
        ])
        .select()

      if (err) {
        setError(err.message)
        return null
      }

      return data?.[0] || null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { saveFind, isLoading, error }
}
