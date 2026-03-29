'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Find } from '@/types'

interface UseFIndsOptions {
  status?: string | null
  search?: string | null
}

export function useFinds(options?: UseFIndsOptions) {
  const [finds, setFinds] = useState<Find[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFinds = async () => {
      try {
        setIsLoading(true)
        let query = supabase.from('finds').select('*')

        // Filter by status if provided
        if (options?.status && options.status !== 'all') {
          query = query.eq('status', options.status)
        }

        const { data, error: err } = await query.order('created_at', { ascending: false })

        if (err) {
          setError(err.message)
          setFinds([])
        } else {
          // Apply search filter client-side if needed
          let filteredData = data || []
          if (options?.search) {
            const search = options.search.toLowerCase()
            filteredData = filteredData.filter(
              (find) =>
                find.name?.toLowerCase().includes(search) ||
                find.category?.toLowerCase().includes(search) ||
                find.source_name?.toLowerCase().includes(search)
            )
          }
          setFinds(filteredData as Find[])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFinds()
  }, [options?.status, options?.search])

  return { finds, isLoading, error }
}
