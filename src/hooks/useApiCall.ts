'use client'

import { useState, useCallback } from 'react'

interface UseApiCallState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}

/**
 * Hook for managing async API calls with loading and error states.
 * Consolidates common pattern: loading state → api call → error/success handling
 */
export function useApiCall<T>(defaultData: T | null = null) {
  const [state, setState] = useState<UseApiCallState<T>>({
    data: defaultData,
    isLoading: false,
    error: null,
  })

  const call = useCallback(
    async (fn: () => Promise<T>) => {
      setState(s => ({ ...s, isLoading: true, error: null }))
      try {
        const data = await fn()
        setState({ data, isLoading: false, error: null })
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setState(s => ({ ...s, isLoading: false, error: message }))
        return null
      }
    },
    []
  )

  const setData = useCallback((data: T) => {
    setState(s => ({ ...s, data, error: null }))
  }, [])

  const setError = useCallback((error: string) => {
    setState(s => ({ ...s, error, isLoading: false }))
  }, [])

  const reset = useCallback(() => {
    setState({ data: defaultData, isLoading: false, error: null })
  }, [defaultData])

  return {
    ...state,
    call,
    setData,
    setError,
    reset,
  }
}
