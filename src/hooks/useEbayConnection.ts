'use client'

import { useEffect, useState, useCallback } from 'react'
import { useConfirm } from '@/components/wren/ConfirmProvider'

export interface EbayConnectionStatus {
  connected: boolean
  /**
   * True when a token row exists but the access token expired AND the
   * refresh attempt failed. Functionally disconnected — every publish/
   * delist/sync call will fail until the user reconnects via OAuth.
   * UI should show "Reconnect required" instead of a green "Connected" tick.
   */
  needsReconnect: boolean
  setupComplete: boolean
  username: string | null
  accountType: string | null
  sellerBusinessType: string | null
  expiresAt: string | null
  isLoading: boolean
  error: string | null
}

export interface UseEbayConnectionReturn extends EbayConnectionStatus {
  connectEbay: () => Promise<void>
  disconnectEbay: () => Promise<void>
  refreshStatus: () => Promise<void>
}

/**
 * Hook to manage eBay connection state and actions
 * Encapsulates all eBay OAuth and status logic for reuse across pages
 */
export function useEbayConnection(): UseEbayConnectionReturn {
  const [connected, setConnected] = useState(false)
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const [username, setUsername] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<string | null>(null)
  const [sellerBusinessType, setSellerBusinessType] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const confirm = useConfirm()

  // Fetch connection status from API
  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ebay/status')
      if (response.ok) {
        const data = await response.json()
        setConnected(data.data?.connected || false)
        setNeedsReconnect(data.data?.needsReconnect || false)
        setSetupComplete(data.data?.setupComplete || false)
        setUsername(data.data?.username || null)
        setAccountType(data.data?.accountType || null)
        setSellerBusinessType(data.data?.sellerBusinessType || null)
        setExpiresAt(data.data?.expiresAt || null)
      }
    } catch (err) {
      // Silently fail - status check is non-critical
    }
  }, [])

  // Load status on mount
  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  // Initiate OAuth flow
  const connectEbay = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ebay/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace: 'EBAY_GB' }),
      })

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth flow')
      }

      const { data } = await response.json()
      window.location.href = data.authUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to eBay'
      setError(msg)
      setIsLoading(false)
    }
  }, [])

  // Disconnect eBay account
  const disconnectEbay = useCallback(async () => {
    const ok = await confirm({
      title: 'Disconnect eBay?',
      message: 'This will disconnect your eBay account and delete all stored policies.',
      confirmLabel: 'Disconnect',
      tone: 'danger',
    })
    if (!ok) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ebay/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplace: 'EBAY_GB' }),
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect from eBay')
      }

      setConnected(false)
      setNeedsReconnect(false)
      setSetupComplete(false)
      setUsername(null)
      setAccountType(null)
      setSellerBusinessType(null)
      setExpiresAt(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect from eBay'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [confirm])

  return {
    connected,
    needsReconnect,
    setupComplete,
    username,
    accountType,
    sellerBusinessType,
    expiresAt,
    isLoading,
    error,
    connectEbay,
    disconnectEbay,
    refreshStatus,
  }
}
