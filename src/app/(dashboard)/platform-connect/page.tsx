'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { Badge } from '@/components/wren/Badge'

export default function PlatformConnectPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [ebayConnected, setEbayConnected] = useState(false)
  const [ebayUser, setEbayUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [salesDetection, setSalesDetection] = useState<Record<string, boolean>>({
    ebay: true,
    vinted: true,
  })

  // Check OAuth response
  useEffect(() => {
    const success = searchParams.get('success')
    const errorMsg = searchParams.get('error')

    if (success === 'ebay') {
      setEbayConnected(true)
      setError(null)
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (errorMsg) {
      setError(`OAuth failed: ${errorMsg}`)
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [searchParams])

  // Load eBay connection status on mount
  useEffect(() => {
    const checkEbayConnection = async () => {
      try {
        const response = await fetch('/api/ebay/status')
        if (response.ok) {
          const data = await response.json()
          setEbayConnected(data.data?.connected || false)
          setEbayUser(data.data?.username || null)
        }
      } catch (error) {
        // Silently fail - status check is non-critical
      }
    }

    checkEbayConnection()
  }, [])

  const handleConnectEbay = async () => {
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
      setError(err instanceof Error ? err.message : 'Failed to connect to eBay')
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-serif text-ink">platform connections</h1>
        <a href="/settings" className="text-sm text-sage hover:text-sage-dk transition">
          ← back to settings
        </a>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red rounded text-sm text-red">
          {error}
        </div>
      )}

      {/* Extension banner */}
      <div className="flex items-center gap-4 p-4 bg-sage-pale border border-sage rounded">
        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 bg-white rounded border border-border">
          📦
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-ink">Wrenlist Extension</span>
            <div className="flex items-center gap-1 text-xs font-semibold text-sage uppercase tracking-wide">
              <div className="w-1 h-1 rounded-full bg-sage"></div>
              connected
            </div>
          </div>
          <div className="text-xs text-ink-lt">Chrome · v2.1.4 · Required for Vinted and Shopify crosslisting</div>
        </div>
        <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition flex-shrink-0">
          Extension settings →
        </button>
      </div>

      {/* eBay */}
      <Panel>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-orange-100">
            🛒
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-ink">eBay UK</div>
            {ebayConnected && ebayUser ? (
              <div className="text-xs text-ink-lt">Account: {ebayUser}</div>
            ) : (
              <div className="text-xs text-ink-lt">Click below to authorize</div>
            )}
          </div>
          <Badge status={ebayConnected ? 'listed' : 'draft'} label={ebayConnected ? 'connected' : 'not connected'} />
        </div>

        {ebayConnected && ebayUser && (
          <>
            <div className="grid grid-cols-2 gap-2 p-4 bg-cream-md rounded mb-4">
              <div>
                <div className="text-xs font-medium text-ink-lt mb-1">Account</div>
                <div className="text-sm text-ink font-mono">{ebayUser}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-lt mb-1">Marketplace</div>
                <div className="text-sm text-ink">eBay UK (GB)</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border border-border rounded mb-4">
              <div>
                <div className="font-medium text-sm text-ink">Sale detection</div>
                <div className="text-xs text-ink-lt mt-1">Auto-mark finds as sold when eBay reports a sale</div>
              </div>
              <button
                onClick={() => setSalesDetection({ ...salesDetection, ebay: !salesDetection.ebay })}
                className={`relative w-10 h-6 rounded-full transition ${
                  salesDetection.ebay ? 'bg-sage' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${
                    salesDetection.ebay ? 'right-0.5' : 'left-0.5'
                  }`}
                ></div>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConnectEbay}
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition disabled:opacity-50"
              >
                ↻ Reconnect
              </button>
              <button className="flex-1 px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition">
                Disconnect
              </button>
            </div>
          </>
        )}

        {!ebayConnected && (
          <button
            onClick={handleConnectEbay}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {isLoading ? 'Connecting...' : 'Connect eBay account →'}
          </button>
        )}
      </Panel>

      {/* Vinted */}
      <Panel>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-green-100">
            👚
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-ink">Vinted</div>
            <div className="text-xs text-ink-lt">83 active listings synced</div>
          </div>
          <Badge status="listed" label="connected" />
        </div>

        <div className="grid grid-cols-3 gap-2 p-4 bg-cream-md rounded mb-4">
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Account</div>
            <div className="text-sm text-ink font-mono">@jordanthrifts</div>
          </div>
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Email</div>
            <div className="text-sm text-ink font-mono">jordan@example.com</div>
          </div>
          <div>
            <div className="text-xs font-medium text-ink-lt mb-1">Synced</div>
            <div className="text-sm text-ink">5 minutes ago</div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 border border-border rounded mb-4">
          <div>
            <div className="font-medium text-sm text-ink">Sale detection</div>
            <div className="text-xs text-ink-lt mt-1">Auto-mark finds as sold when Vinted reports a sale</div>
          </div>
          <button
            onClick={() => setSalesDetection({ ...salesDetection, vinted: !salesDetection.vinted })}
            className={`relative w-10 h-6 rounded-full transition ${
              salesDetection.vinted ? 'bg-sage' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition ${
                salesDetection.vinted ? 'right-0.5' : 'left-0.5'
              }`}
            ></div>
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber rounded mb-4">
          <div className="text-sm text-amber">⚠</div>
          <div className="text-sm text-amber">
            <strong>Heads up about Vinted's Terms of Service</strong> — Vinted's ToS prohibit third-party automation tools.{' '}
            <a href="https://www.vinted.co.uk/terms-and-conditions" className="underline hover:no-underline">
              Read Vinted's terms →
            </a>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2">
            <div className="text-xs text-ink-lt">Managed by Wrenlist extension</div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition">
            Disconnect
          </button>
        </div>
      </Panel>

      {/* Etsy - Pending */}
      <Panel>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-amber-100 opacity-70">
            🎨
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm text-ink">Etsy</div>
              <span className="px-2 py-1 text-xs font-semibold text-amber bg-amber-50 rounded">
                API pending
              </span>
            </div>
            <div className="text-xs text-ink-lt">
              We're awaiting Etsy API key approval — the application is in.
            </div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition flex-shrink-0">
            View roadmap →
          </button>
        </div>
      </Panel>

      {/* Shopify - Disconnected */}
      <Panel>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-green-50">
            🏪
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-ink">Shopify</div>
            <div className="text-xs text-ink-lt">Crosslist to your Shopify store. Requires Wrenlist extension.</div>
          </div>
          <Badge status="draft" label="not connected" />
        </div>

        <div className="flex items-center gap-3 p-3 bg-cream-md rounded mb-4">
          <div className="text-xs text-sage-dim">📦</div>
          <div className="flex-1">
            <div className="font-medium text-xs text-ink">Extension ready</div>
            <div className="text-xs text-ink-lt">Wrenlist extension is installed. Enter your Shopify store URL to connect.</div>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition flex-shrink-0">
            Connect →
          </button>
        </div>
      </Panel>

      {/* Tip */}
      <InsightCard
        text="Connect Etsy to reach buyers looking specifically for vintage — your Laura Ashley and Pendleton pieces would perform significantly better there."
      />
    </div>
  )
}
