'use client'

import { useEffect, useState } from 'react'

export const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'

interface ExtensionInfo {
  /** Whether the extension is installed and responding */
  detected: boolean | null
  /** Extension version string (e.g. "3.7.8") or null if not detected */
  version: string | null
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

  return { detected, version, loading }
}
