import { useState, useCallback } from 'react'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'

export interface BulkOperationResult {
  updated?: number
  renewed?: number
  deactivated?: number
  deleted?: number
  failed: number
  errors: string[]
}

type BulkOperationStatus = 'idle' | 'running' | 'done' | 'error'

interface EtsyBulkState {
  status: BulkOperationStatus
  result: BulkOperationResult | null
  error: string | null
}

function sendExtensionMessage(
  message: Record<string, unknown>,
): Promise<BulkOperationResult> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      reject(new Error('Chrome extension API not available'))
      return
    }
    chrome.runtime.sendMessage(
      EXTENSION_ID,
      message,
      (response: BulkOperationResult & { error?: string; success?: boolean }) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        if (response?.error && !response.success) {
          reject(new Error(typeof response.error === 'string' ? response.error : 'Extension error'))
          return
        }
        resolve(response)
      },
    )
  })
}

export function useEtsyBulkOperations() {
  const [state, setState] = useState<EtsyBulkState>({
    status: 'idle',
    result: null,
    error: null,
  })

  const bulkUpdatePrice = useCallback(
    async (items: Array<{ listingId: string; price: number }>) => {
      setState({ status: 'running', result: null, error: null })
      try {
        const result = await sendExtensionMessage({
          action: 'etsy_bulk_update_price',
          items,
        })
        setState({ status: 'done', result, error: null })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setState({ status: 'error', result: null, error: msg })
        throw err
      }
    },
    [],
  )

  const bulkRenew = useCallback(async (listingIds: string[]) => {
    setState({ status: 'running', result: null, error: null })
    try {
      const result = await sendExtensionMessage({
        action: 'etsy_bulk_renew',
        listingIds,
      })
      setState({ status: 'done', result, error: null })
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setState({ status: 'error', result: null, error: msg })
      throw err
    }
  }, [])

  const bulkDeactivate = useCallback(async (listingIds: string[]) => {
    setState({ status: 'running', result: null, error: null })
    try {
      const result = await sendExtensionMessage({
        action: 'etsy_bulk_deactivate',
        listingIds,
      })
      setState({ status: 'done', result, error: null })
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setState({ status: 'error', result: null, error: msg })
      throw err
    }
  }, [])

  const bulkUpdateTags = useCallback(
    async (items: Array<{ listingId: string; tags: string[] }>) => {
      setState({ status: 'running', result: null, error: null })
      try {
        const result = await sendExtensionMessage({
          action: 'etsy_bulk_update_tags',
          items,
        })
        setState({ status: 'done', result, error: null })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setState({ status: 'error', result: null, error: msg })
        throw err
      }
    },
    [],
  )

  const bulkPatch = useCallback(
    async (items: Array<{ listingId: string; fields: Record<string, unknown> }>) => {
      setState({ status: 'running', result: null, error: null })
      try {
        const result = await sendExtensionMessage({
          action: 'etsy_bulk_patch',
          items,
        })
        setState({ status: 'done', result, error: null })
        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setState({ status: 'error', result: null, error: msg })
        throw err
      }
    },
    [],
  )

  const reset = useCallback(() => {
    setState({ status: 'idle', result: null, error: null })
  }, [])

  return {
    ...state,
    bulkUpdatePrice,
    bulkRenew,
    bulkDeactivate,
    bulkUpdateTags,
    bulkPatch,
    reset,
  }
}
