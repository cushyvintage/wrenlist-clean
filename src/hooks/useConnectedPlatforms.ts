'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'
import type { Platform } from '@/types'

/** Platforms that use extension cookie/session checks */
const EXTENSION_PLATFORMS: Platform[] = ['etsy', 'facebook', 'depop']

export interface ConnectedPlatform {
  platform: Platform
  username?: string
}

interface ConnectedPlatformsOptions {
  /** Poll interval in ms. When set, re-checks connections on this interval. Pauses when tab is hidden. */
  pollInterval?: number
}

interface ConnectedPlatformsResult {
  /** Platforms the user is currently connected to, with optional username */
  connected: ConnectedPlatform[]
  /** Platforms that were connected but disconnected mid-session */
  disconnected: Platform[]
  /** Whether checks are still running */
  loading: boolean
  /** Re-run all checks */
  refresh: () => void
  /** Re-check specific platforms before publishing. Returns which are still valid vs expired. */
  recheckPlatforms: (platforms: Platform[]) => Promise<{ valid: Platform[]; expired: Platform[] }>
}

/**
 * Checks which marketplaces the user is connected to.
 * Returns platform name + username where available.
 * - eBay: DB token check via /api/ebay/status (username from API)
 * - Vinted: Extension session check (username from cookie)
 * - Shopify: DB connection check via /api/shopify/connect (shop name)
 * - Etsy, Facebook, Depop: Extension cookie checks (no username available)
 *
 * @param options.pollInterval - When set, re-runs checks on this interval (ms). Pauses when tab is hidden.
 */
export function useConnectedPlatforms(options?: ConnectedPlatformsOptions): ConnectedPlatformsResult {
  const [connected, setConnected] = useState<ConnectedPlatform[]>([])
  const [disconnected, setDisconnected] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  /** Tracks all platforms that have been seen as connected during this session */
  const everConnectedRef = useRef<Set<Platform>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function checkAll() {
      setLoading(true)
      const results: ConnectedPlatform[] = []

      const [ebay, vinted, shopify, ...extensionResults] = await Promise.all([
        checkEbay(),
        checkVintedViaExtension(),
        checkShopify(),
        ...EXTENSION_PLATFORMS.map((p) => checkExtensionPlatform(p)),
      ])

      if (cancelled) return

      if (ebay) results.push(ebay)
      if (vinted) results.push(vinted)
      if (shopify) results.push(shopify)
      EXTENSION_PLATFORMS.forEach((p, i) => {
        if (extensionResults[i]) results.push(extensionResults[i]!)
      })

      // Track newly connected platforms
      const currentPlatforms = new Set(results.map((r) => r.platform))
      for (const p of currentPlatforms) {
        everConnectedRef.current.add(p)
      }

      // Compute disconnected: was connected before, no longer is
      const newDisconnected: Platform[] = []
      for (const p of everConnectedRef.current) {
        if (!currentPlatforms.has(p)) newDisconnected.push(p)
      }

      setConnected(results)
      setDisconnected(newDisconnected)
      setLoading(false)
    }

    checkAll()
    return () => { cancelled = true }
  }, [tick])

  // Polling with visibility-aware pause/resume
  const pollInterval = options?.pollInterval
  useEffect(() => {
    if (!pollInterval) return

    let intervalId: ReturnType<typeof setInterval> | null = null

    function startPolling() {
      if (intervalId) return
      intervalId = setInterval(() => setTick((t) => t + 1), pollInterval)
    }

    function stopPolling() {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        stopPolling()
      } else {
        // Re-check immediately when tab becomes visible again
        setTick((t) => t + 1)
        startPolling()
      }
    }

    // Start polling if tab is visible
    if (!document.hidden) startPolling()

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [pollInterval])

  const recheckPlatforms = useCallback(async (platforms: Platform[]): Promise<{ valid: Platform[]; expired: Platform[] }> => {
    const checks = await Promise.all(
      platforms.map(async (p): Promise<{ platform: Platform; ok: boolean }> => {
        let result: ConnectedPlatform | null = null
        if (p === 'ebay') result = await checkEbay()
        else if (p === 'vinted') result = await checkVintedViaExtension()
        else if (p === 'shopify') result = await checkShopify()
        else result = await checkExtensionPlatform(p)
        return { platform: p, ok: result !== null }
      })
    )
    return {
      valid: checks.filter((c) => c.ok).map((c) => c.platform),
      expired: checks.filter((c) => !c.ok).map((c) => c.platform),
    }
  }, [])

  return {
    connected,
    disconnected,
    loading,
    refresh: () => setTick((t) => t + 1),
    recheckPlatforms,
  }
}

async function checkEbay(): Promise<ConnectedPlatform | null> {
  try {
    const res = await fetch('/api/ebay/status')
    if (!res.ok) return null
    const data = await res.json()
    if (data.data?.connected !== true) return null
    return { platform: 'ebay', username: data.data.username || undefined }
  } catch {
    return null
  }
}

async function checkShopify(): Promise<ConnectedPlatform | null> {
  try {
    const res = await fetch('/api/shopify/connect')
    if (!res.ok) return null
    const data = await res.json()
    if (data.data?.connected !== true) return null
    return { platform: 'shopify', username: data.data.shopName || undefined }
  } catch {
    return null
  }
}

async function checkVintedViaExtension(): Promise<ConnectedPlatform | null> {
  try {
    const r = await sendExtensionMessage({ action: 'get_vinted_session' })
    if (!r?.loggedIn) return null

    const extensionUsername = r.username || undefined

    // Try to get resolved display name from DB
    try {
      const res = await fetch('/api/vinted/connect')
      if (res.ok) {
        const data = await res.json()
        if (data.data?.connected && data.data?.vintedUsername) {
          return { platform: 'vinted', username: data.data.vintedUsername }
        }
      }
    } catch { /* fall through to extension username */ }

    return { platform: 'vinted', username: extensionUsername }
  } catch {
    return null
  }
}

async function checkExtensionPlatform(marketplace: Platform): Promise<ConnectedPlatform | null> {
  try {
    const r = await sendExtensionMessage({ action: 'check_marketplace_login', marketplace })
    if (!r?.loggedIn) return null
    return { platform: marketplace }
  } catch {
    return null
  }
}

interface ExtensionResponse {
  loggedIn?: boolean
  username?: string
  userId?: string
  tld?: string
  success?: boolean
}

function sendExtensionMessage(message: Record<string, string>): Promise<ExtensionResponse | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      resolve(null)
      return
    }
    const timeout = setTimeout(() => resolve(null), 8000)
    chrome.runtime.sendMessage(EXTENSION_ID, message, (response) => {
      clearTimeout(timeout)
      if (chrome.runtime.lastError) {
        resolve(null)
      } else {
        resolve(response)
      }
    })
  })
}
