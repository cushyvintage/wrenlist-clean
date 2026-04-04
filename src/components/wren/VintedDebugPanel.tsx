"use client"

import { useState, useEffect } from "react"

interface DebugInfo {
  tld: string
  cookiesFound: boolean
  lastError: string | null
  extensionVersion: string | null
}

interface VintedDebugPanelProps {
  extensionId: string
}

export function VintedDebugPanel({ extensionId }: VintedDebugPanelProps) {
  const [open, setOpen] = useState(false)
  const [debug, setDebug] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostic = async () => {
    setLoading(true)
    setDebug(null)
    try {
      // Ask extension for debug info
      const extensionInfo = await new Promise<{
        success: boolean
        tld?: string
        cookiesFound?: boolean
        lastError?: string
        version?: string
      }>((resolve) => {
        if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
          resolve({ success: false, lastError: "Extension not available" })
          return
        }
        const timeout = setTimeout(() => resolve({ success: false, lastError: "Extension timed out" }), 5000)
        chrome.runtime.sendMessage(
          extensionId,
          { action: "vinted_debug_info" },
          (response) => {
            clearTimeout(timeout)
            if (chrome.runtime.lastError) {
              resolve({ success: false, lastError: chrome.runtime.lastError.message })
            } else {
              resolve(response || { success: false, lastError: "No response" })
            }
          }
        )
      })

      setDebug({
        tld: extensionInfo.tld ?? "unknown",
        cookiesFound: extensionInfo.cookiesFound ?? false,
        lastError: extensionInfo.lastError ?? null,
        extensionVersion: extensionInfo.version ?? null,
      })
    } catch (e) {
      setDebug({
        tld: "unknown",
        cookiesFound: false,
        lastError: e instanceof Error ? e.message : "Unknown error",
        extensionVersion: null,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3 border border-border rounded text-xs">
      <button
        onClick={() => {
          setOpen(!open)
          if (!open && !debug) runDiagnostic()
        }}
        className="w-full flex items-center justify-between px-3 py-2 text-ink-lt hover:text-ink transition"
      >
        <span>🔬 Vinted diagnostics</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
          {loading && <div className="text-ink-lt">Running diagnostics...</div>}
          {debug && (
            <div className="space-y-1 font-mono">
              <div className="flex gap-2">
                <span className="text-ink-lt w-28">TLD detected</span>
                <span className="text-ink">{debug.tld}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-ink-lt w-28">Cookies found</span>
                <span className={debug.cookiesFound ? "text-green-600" : "text-red-500"}>
                  {debug.cookiesFound ? "✓ yes" : "✗ no"}
                </span>
              </div>
              {debug.extensionVersion && (
                <div className="flex gap-2">
                  <span className="text-ink-lt w-28">Ext version</span>
                  <span className="text-ink">{debug.extensionVersion}</span>
                </div>
              )}
              {debug.lastError && (
                <div className="flex gap-2">
                  <span className="text-ink-lt w-28">Last error</span>
                  <span className="text-red-500 break-all">{debug.lastError}</span>
                </div>
              )}
            </div>
          )}
          <button
            onClick={runDiagnostic}
            disabled={loading}
            className="text-sage hover:text-sage-dk transition disabled:opacity-50"
          >
            {loading ? "Running..." : "↻ Refresh"}
          </button>
        </div>
      )}
    </div>
  )
}
