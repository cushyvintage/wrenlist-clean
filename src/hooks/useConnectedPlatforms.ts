'use client'

import { useEffect, useState } from 'react'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'
import type { Platform } from '@/types'

/** Platforms that use extension cookie/session checks */
const EXTENSION_PLATFORMS: Platform[] = ['etsy', 'facebook', 'depop']

interface ConnectedPlatformsResult {
  /** Platforms the user is currently connected to */
  connected: Platform[]
  /** Whether checks are still running */
  loading: boolean
  /** Re-run all checks */
  refresh: () => void
}

/**
 * Checks which marketplaces the user is connected to.
 * - eBay: DB token check via /api/ebay/status
 * - Vinted: Extension session check (get_vinted_session)
 * - Shopify: DB connection check via /api/shopify/connect
 * - Etsy, Facebook, Depop: Extension cookie checks (check_marketplace_login)
 */
export function useConnectedPlatforms(): ConnectedPlatformsResult {
  const [connected, setConnected] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function checkAll() {
      setLoading(true)
      const results: Platform[] = []

      // Run all checks in parallel
      const [ebay, vinted, shopify, ...extensionResults] = await Promise.all([
        checkEbay(),
        checkVintedViaExtension(),
        checkShopify(),
        ...EXTENSION_PLATFORMS.map((p) => checkExtensionPlatform(p)),
      ])

      if (cancelled) return

      if (ebay) results.push('ebay')
      if (vinted) results.push('vinted')
      if (shopify) results.push('shopify')
      EXTENSION_PLATFORMS.forEach((p, i) => {
        if (extensionResults[i]) results.push(p)
      })

      setConnected(results)
      setLoading(false)
    }

    checkAll()
    return () => { cancelled = true }
  }, [tick])

  return {
    connected,
    loading,
    refresh: () => setTick((t) => t + 1),
  }
}

async function checkEbay(): Promise<boolean> {
  try {
    const res = await fetch('/api/ebay/status')
    if (!res.ok) return false
    const data = await res.json()
    return data.data?.connected === true
  } catch {
    return false
  }
}

async function checkShopify(): Promise<boolean> {
  try {
    const res = await fetch('/api/shopify/connect')
    if (!res.ok) return false
    const data = await res.json()
    return data.data?.connected === true
  } catch {
    return false
  }
}

async function checkVintedViaExtension(): Promise<boolean> {
  return sendExtensionMessage({ action: 'get_vinted_session' })
    .then((r) => r?.loggedIn === true)
    .catch(() => false)
}

async function checkExtensionPlatform(marketplace: Platform): Promise<boolean> {
  return sendExtensionMessage({ action: 'check_marketplace_login', marketplace })
    .then((r) => r?.loggedIn === true)
    .catch(() => false)
}

function sendExtensionMessage(message: Record<string, string>): Promise<any> {
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
