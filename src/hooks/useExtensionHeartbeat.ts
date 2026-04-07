'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { fetchApi } from '@/lib/api-utils'

interface ExtensionHeartbeat {
  /** Whether the desktop extension is online (heartbeat < 2 min ago) */
  online: boolean | null
  /** ISO timestamp of last heartbeat */
  lastSeenAt: string | null
  /** Extension version from heartbeat */
  version: string | null
  /** Whether the initial check is in progress */
  loading: boolean
}

/**
 * Polls GET /api/extension/heartbeat every 30s to check if the desktop
 * extension is alive. Pauses when tab is hidden. Works on any device.
 */
export function useExtensionHeartbeat(): ExtensionHeartbeat {
  const [online, setOnline] = useState<boolean | null>(null)
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null)
  const [version, setVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = useCallback(async () => {
    try {
      const data = await fetchApi<{
        online: boolean
        last_seen_at: string | null
        extension_version: string | null
      }>('/api/extension/heartbeat')
      setOnline(data.online)
      setLastSeenAt(data.last_seen_at)
      setVersion(data.extension_version)
    } catch {
      // API error — don't change state, retry next cycle
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    check()

    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(check, 30_000)
    }

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        check() // immediate check on return
        startPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [check])

  return { online, lastSeenAt, version, loading }
}
