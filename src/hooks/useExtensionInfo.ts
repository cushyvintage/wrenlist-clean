'use client'

import { useEffect, useState } from 'react'

export const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'

/**
 * Minimum extension version the web app will accept.
 *
 * Bump this whenever we ship a backend/API change the old extension can't
 * handle (new message shape, new queue endpoint, new storage schema, etc.).
 * When `detected === true` but `isOutdated === true`, consumers should show
 * an "update your extension" banner and block publish/delist actions.
 *
 * Keep this in sync with extension/VERSIONING.md.
 */
export const MIN_EXTENSION_VERSION = '0.9.0'

interface ExtensionInfo {
  /** Whether the extension is installed and responding */
  detected: boolean | null
  /** Extension version string (e.g. "0.9.0") or null if not detected */
  version: string | null
  /** True if detected but version < MIN_EXTENSION_VERSION */
  isOutdated: boolean
  /** Whether the check is still in progress */
  loading: boolean
}

/**
 * Detects the Wrenlist browser extension and reads its version.
 * Uses the `ping` action which returns { success, extensionVersion }.
 * Reusable across any page that needs extension status.
 */
export function useExtensionInfo(): ExtensionInfo {
  const [detected, setDetected] = useState<boolean | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      try {
        if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
          setDetected(false)
          setLoading(false)
          return
        }

        const response = await new Promise<{
          success?: boolean
          extensionVersion?: string
        }>((resolve) => {
          const timeout = setTimeout(() => resolve({}), 5000)
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { action: 'ping' },
            (resp) => {
              clearTimeout(timeout)
              if (chrome.runtime.lastError) {
                resolve({})
              } else {
                resolve(resp || {})
              }
            }
          )
        })

        setDetected(!!response.success)
        setVersion(response.extensionVersion ?? null)
      } catch {
        setDetected(false)
      } finally {
        setLoading(false)
      }
    }

    check()
  }, [])

  const isOutdated =
    detected === true && version !== null && compareVersions(version, MIN_EXTENSION_VERSION) < 0

  return { detected, version, isOutdated, loading }
}

/**
 * Compare two dot-separated version strings. Returns negative if a<b,
 * 0 if equal, positive if a>b. Treats missing segments as 0.
 * Example: compareVersions('0.9.0', '0.10.0') === -1
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0)
    if (diff !== 0) return diff
  }
  return 0
}
