'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'
import type { Platform } from '@/types'

/** Platforms that use extension cookie/session checks */
const EXTENSION_PLATFORMS: Platform[] = ['etsy', 'facebook', 'depop']

export interface ConnectedPlatform {
  platform: Platform
  username?: string
  /** Vinted only: true if the account is a Pro/business seller. */
  isBusiness?: boolean
  /**
   * True when the user is connected at the DB level but the extension
   * cookie/session probe came back unauthenticated (or the extension
   * couldn't be reached for a platform that requires it for publish).
   *
   * The picker should still SHOW these platforms — disabled, with a
   * "Log in to <Platform>" chip — instead of silently dropping them.
   * `recheckPlatforms` treats `needsLogin: true` as expired so publish
   * is never attempted with a stale session.
   */
  needsLogin?: boolean
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
 * - Vinted: DB check + best-effort extension session probe
 * - Shopify: DB check + best-effort extension session probe (extension is
 *   what publishes Shopify listings via the storefront admin)
 * - Etsy, Facebook, Depop: DB check + extension session probe
 *
 * Platforms connected at the DB level but with a missing extension cookie
 * are returned with `needsLogin: true` rather than silently dropped, so
 * the picker can render a "Log in to <Platform>" chip.
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
        // A DB-connected-but-needs-login platform is NOT valid for publish:
        // the extension would fail with "please log in" mid-job. Treat
        // these as expired so the user is steered to platform-connect.
        const ok = result !== null && result.needsLogin !== true
        return { platform: p, ok }
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

    const shopName = (data.data?.shopName as string | undefined) || undefined
    const shopUrl = (data.data?.storeDomain as string | undefined) || undefined
    const base: ConnectedPlatform = { platform: 'shopify', username: shopName }

    // Crosslist publishes to Shopify by queueing a job for the extension
    // (not the Admin API). The extension fails the publish with
    // "Please check you are logged in to your Shopify account" if there
    // is no live storefront-admin cookie. Probe the extension here so
    // the picker can warn the user BEFORE they hit Publish.
    //
    // The extension's checkLogin for Shopify is defensive: if the probe
    // can't be performed (no shopUrl, fetch failure, etc.) it returns
    // true. So a `loggedIn: false` answer is a reliable "needs login"
    // signal and we don't false-positive users who don't have the
    // extension talking back to us at all.
    if (!shopUrl) return base
    const session = await sendExtensionMessage({
      action: 'check_marketplace_login',
      marketplace: 'shopify',
      settings: { shopUrl },
    })
    if (session === null) return base // extension unreachable — don't false-flag
    if (session.loggedIn === false) return { ...base, needsLogin: true }
    return base
  } catch {
    return null
  }
}

async function checkVintedViaExtension(): Promise<ConnectedPlatform | null> {
  // DB is authoritative — a Vinted cookie alone doesn't mean the user has
  // linked their account to Wrenlist. Match the Etsy/Facebook/Depop rule.
  try {
    const res = await fetch('/api/vinted/connect')
    if (!res.ok) return null
    const data = await res.json()
    if (!data.data?.connected) return null

    const base: ConnectedPlatform = {
      platform: 'vinted',
      username: data.data?.vintedUsername || undefined,
      isBusiness: Boolean(data.data?.isBusiness),
    }

    // Probe the extension so "logged out on this device" surfaces as
    // `needsLogin` rather than silently dropping Vinted from the picker.
    // If the extension is unreachable (returns null), keep the platform
    // visible without a warning — `extensionDetected === false` already
    // renders its own banner.
    const session = await sendExtensionMessage({ action: 'get_vinted_session' })
    if (session === null) return base
    if (session.loggedIn === false) return { ...base, needsLogin: true }

    return {
      ...base,
      username: base.username || session.username || undefined,
    }
  } catch {
    return null
  }
}

async function checkExtensionPlatform(marketplace: Platform): Promise<ConnectedPlatform | null> {
  // Connection is authoritative in the DB. The extension-session probe gates
  // whether the user can currently list/import (cookie must be live), but
  // "are they Connected to Wrenlist?" is a DB question. We must not light
  // this up as Connected just because Chrome happens to hold a cookie —
  // see the silent-auto-connection fix in usePlatformConnections.ts.
  //
  // Conversely, we must not silently drop a DB-connected platform just
  // because the extension cookie is missing. That is exactly what hid
  // Depop from the picker in production. Emit `needsLogin: true` so the
  // picker can render a "Log in to <Platform>" chip instead.
  try {
    const res = await fetch(`/api/${marketplace}/connect`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.data?.connected !== true) return null

    const usernameField = `${marketplace}Username` as const
    const dbUsername = data.data?.[usernameField] as string | undefined
    const base: ConnectedPlatform = { platform: marketplace, username: dbUsername || undefined }

    const session = await sendExtensionMessage({ action: 'check_marketplace_login', marketplace })
    if (session === null) return base // extension unreachable — separate UX
    if (session.loggedIn === false) return { ...base, needsLogin: true }

    return {
      ...base,
      username: base.username || session.username || undefined,
    }
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

function sendExtensionMessage(
  message: Record<string, string | Record<string, string>>,
): Promise<ExtensionResponse | null> {
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
