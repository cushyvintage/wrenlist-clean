'use client'

/**
 * Debug-logs download button.
 *
 * Asks the Wrenlist extension for its last ~50 log entries (stored in
 * `chrome.storage.local._debugLogs`, written via remoteLog()) and triggers
 * a JSON file download the user can send us.
 *
 * Why this exists: the Vercel `/api/extension/logs` endpoint is lossy
 * (serverless instances don't share memory), so chrome.storage.local is
 * the source of truth. Instead of walking beta testers through the
 * DevTools service-worker console, they click this button and email us
 * the resulting file.
 *
 * The extension message handler lives at
 * `extension/src/background/index.ts:1423` (cmd === "get_logs").
 */

import { useState } from 'react'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'

interface DebugLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  source: string
  message: string
  data?: Record<string, unknown>
}

interface GetLogsResponse {
  success?: boolean
  logs?: DebugLogEntry[]
  error?: string
  extensionVersion?: string
}

interface Props {
  /** Whether the extension is detected — disable button if not */
  extensionDetected: boolean | null
}

export function DebugLogsButton({ extensionDetected }: Props) {
  const [status, setStatus] = useState<
    'idle' | 'fetching' | 'ok' | 'empty' | 'error'
  >('idle')
  const [errorText, setErrorText] = useState<string | null>(null)
  const [count, setCount] = useState<number>(0)

  async function handleClick() {
    setStatus('fetching')
    setErrorText(null)

    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setStatus('error')
      setErrorText('Extension API not available — are you on Chrome desktop?')
      return
    }

    try {
      const response = await new Promise<GetLogsResponse>((resolve) => {
        const timeout = setTimeout(
          () => resolve({ error: 'Timed out waiting for extension' }),
          5000,
        )
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'get_logs' },
          (resp) => {
            clearTimeout(timeout)
            if (chrome.runtime.lastError) {
              resolve({ error: chrome.runtime.lastError.message })
            } else {
              resolve(resp || { error: 'Empty response from extension' })
            }
          },
        )
      })

      if (response.error || !response.success) {
        setStatus('error')
        setErrorText(response.error ?? 'Extension returned an error')
        return
      }

      const logs = response.logs ?? []
      if (logs.length === 0) {
        setStatus('empty')
        return
      }

      const payload = {
        capturedAt: new Date().toISOString(),
        extensionVersion: response.extensionVersion ?? 'unknown',
        userAgent: navigator.userAgent,
        logCount: logs.length,
        logs,
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wrenlist-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setCount(logs.length)
      setStatus('ok')
    } catch (err) {
      setStatus('error')
      setErrorText(err instanceof Error ? err.message : String(err))
    }
  }

  const disabled = extensionDetected !== true || status === 'fetching'

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-40"
        style={{
          borderWidth: '1px',
          borderColor: 'rgba(61,92,58,.22)',
          backgroundColor: 'transparent',
          color: '#3D5C3A',
        }}
      >
        {status === 'fetching' ? 'Fetching logs…' : 'Download debug logs'}
      </button>
      {status === 'ok' && (
        <span className="text-xs text-sage">
          ✓ Downloaded {count} {count === 1 ? 'entry' : 'entries'}
        </span>
      )}
      {status === 'empty' && (
        <span className="text-xs text-ink-lt">
          No logs yet — the extension hasn't written any debug entries
        </span>
      )}
      {status === 'error' && (
        <span className="text-xs text-red-600">✗ {errorText}</span>
      )}
      {extensionDetected !== true && status === 'idle' && (
        <span className="text-xs text-ink-lt">
          Install the extension to enable
        </span>
      )}
    </div>
  )
}
