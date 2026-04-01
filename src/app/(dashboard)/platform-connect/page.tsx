'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { Badge } from '@/components/wren/Badge'

interface EbayPolicy {
  id: string
  name: string
}

interface EbayPolicies {
  shipping?: EbayPolicy[]
  payment?: EbayPolicy[]
  returns?: EbayPolicy[]
  locations?: any[]
}

export default function PlatformConnectPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [ebayConnected, setEbayConnected] = useState(false)
  const [ebaySetupComplete, setEbaySetupComplete] = useState(false)
  const [ebayUser, setEbayUser] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ebayPolicies, setEbayPolicies] = useState<EbayPolicies | null>(null)
  const [ebaySelectedPolicies, setEbaySelectedPolicies] = useState<Record<string, string>>({})
  const [ebayPoliciesLoading, setEbayPoliciesLoading] = useState(false)
  const [ebaySetupMessage, setEbaySetupMessage] = useState<string | null>(null)
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
          setEbaySetupComplete(data.data?.setupComplete || false)
          setEbayUser(data.data?.username || null)
        }
      } catch (error) {
        // Silently fail - status check is non-critical
      }
    }

    checkEbayConnection()
  }, [])

  // Fetch policies when connected but not setup
  useEffect(() => {
    if (ebayConnected && !ebaySetupComplete) {
      const fetchPolicies = async () => {
        setEbayPoliciesLoading(true)
        try {
          const response = await fetch('/api/ebay/setup/policies')
          if (response.ok) {
            const data = await response.json()
            const d = data.data || {}
            // Map API field names to component field names
            const policies = {
              shipping: d.fulfillmentPolicies || [],
              returns: d.returnPolicies || [],
              payment: d.paymentPolicies || [],
              locations: d.locations || [],
            }
            setEbayPolicies(policies)

            // Auto-select default policies
            const defaults: Record<string, string> = {}

            // Shipping: prefer "Postage Policy", else first
            if (policies.shipping && policies.shipping.length > 0) {
              const postagePolicy = policies.shipping.find(p => p.name === 'Postage Policy')
              defaults.shipping = postagePolicy?.id || policies.shipping[0].id
            }

            // Returns: prefer "Returns policy", else first
            if (policies.returns && policies.returns.length > 0) {
              const returnsPolicy = policies.returns.find(p => p.name === 'Returns policy')
              defaults.returns = returnsPolicy?.id || policies.returns[0].id
            }

            // Payment: prefer "Payment Policy", else first
            if (policies.payment && policies.payment.length > 0) {
              const paymentPolicy = policies.payment.find(p => p.name === 'Payment Policy')
              defaults.payment = paymentPolicy?.id || policies.payment[0].id
            }

            setEbaySelectedPolicies(defaults)
          }
        } catch (error) {
          // Silently fail
        } finally {
          setEbayPoliciesLoading(false)
        }
      }

      fetchPolicies()
    }
  }, [ebayConnected, ebaySetupComplete])

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

  const handleSaveEbayPolicies = async () => {
    setIsLoading(true)
    setEbaySetupMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/ebay/setup/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ebaySelectedPolicies),
      })

      if (!response.ok) {
        throw new Error('Failed to save policies')
      }

      const { data } = await response.json()
      setEbaySetupComplete(true)
      setEbaySetupMessage('Policies saved successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save policies')
    } finally {
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
        {!ebayConnected ? (
          // State A: Not connected
          <div>
            <div className="mb-6">
              <h3 className="font-medium text-sm text-ink mb-4">Connect your eBay account</h3>
              <div className="space-y-2 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-sm text-sage mt-0.5">✓</div>
                  <div className="text-sm text-ink">Active eBay seller account</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-sm text-sage mt-0.5">✓</div>
                  <div className="text-sm text-ink">eBay Managed Payments enabled</div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-sm text-sage mt-0.5">✓</div>
                  <div className="text-sm text-ink">At least one shipping policy set up in eBay</div>
                </div>
              </div>
              <a
                href="https://www.bizpolicy.ebay.co.uk/businesspolicy/policyoptin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sage hover:text-sage-dk transition underline"
              >
                Set up policies in eBay Seller Hub →
              </a>
            </div>

            <button
              onClick={handleConnectEbay}
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50 mb-4"
            >
              {isLoading ? 'Connecting...' : 'Connect eBay account →'}
            </button>

            <div className="text-xs text-ink-lt text-center">
              Wrenlist will create and manage listings on your behalf. Disconnect any time.
            </div>
          </div>
        ) : ebaySetupComplete ? (
          // State C: Connected + setup complete
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-11 h-11 flex items-center justify-center text-2xl flex-shrink-0 rounded bg-orange-100">
                🛒
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm text-ink">eBay UK — Connected ✅</div>
                </div>
                <div className="text-xs text-ink-lt">Account: {ebayUser}</div>
              </div>
            </div>

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
                onClick={() => setEbaySetupComplete(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
              >
                Change policies
              </button>
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
          </div>
        ) : (
          // State B: Connected but setup incomplete
          <div>
            <div className="mb-6 p-4 bg-cream-md rounded">
              <div className="text-xs font-medium text-ink-lt mb-3">Setup progress</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <div className="text-sage">✓</div>
                  <div className="text-ink">Step 1: Connected</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="text-ink-lt">◯</div>
                  <div className="text-ink">Step 2: Choose policies</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="text-ink-lt">◯</div>
                  <div className="text-ink">Step 3: Ready</div>
                </div>
              </div>
            </div>

            <h3 className="font-medium text-sm text-ink mb-2">Choose your listing policies</h3>
            <p className="text-xs text-ink-lt mb-4">These are pulled from your eBay account</p>

            {ebayPoliciesLoading ? (
              <div className="text-center py-6">
                <div className="text-sm text-ink-lt">Loading policies...</div>
              </div>
            ) : (
              <>
                {/* Shipping Policies */}
                {ebayPolicies?.shipping && ebayPolicies.shipping.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-ink-lt mb-3 uppercase tracking-wide">Shipping Policy</h4>
                    <div className="space-y-2">
                      {ebayPolicies.shipping.map((policy) => (
                        <label key={policy.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="shipping"
                            value={policy.id}
                            checked={ebaySelectedPolicies.shipping === policy.id}
                            onChange={(e) =>
                              setEbaySelectedPolicies({
                                ...ebaySelectedPolicies,
                                shipping: e.target.value,
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-ink">{policy.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Policies */}
                {ebayPolicies?.payment && ebayPolicies.payment.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-ink-lt mb-3 uppercase tracking-wide">Payment Policy</h4>
                    <div className="space-y-2">
                      {ebayPolicies.payment.map((policy) => (
                        <label key={policy.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="payment"
                            value={policy.id}
                            checked={ebaySelectedPolicies.payment === policy.id}
                            onChange={(e) =>
                              setEbaySelectedPolicies({
                                ...ebaySelectedPolicies,
                                payment: e.target.value,
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-ink">{policy.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Returns Policies */}
                {ebayPolicies?.returns && ebayPolicies.returns.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-ink-lt mb-3 uppercase tracking-wide">Returns Policy</h4>
                    <div className="space-y-2">
                      {ebayPolicies.returns.map((policy) => (
                        <label key={policy.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="returns"
                            value={policy.id}
                            checked={ebaySelectedPolicies.returns === policy.id}
                            onChange={(e) =>
                              setEbaySelectedPolicies({
                                ...ebaySelectedPolicies,
                                returns: e.target.value,
                              })
                            }
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-ink">{policy.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {ebaySetupMessage && (
                  <div className="p-3 bg-green-50 border border-green rounded text-sm text-green mb-4">
                    {ebaySetupMessage}
                  </div>
                )}

                <button
                  onClick={handleSaveEbayPolicies}
                  disabled={isLoading || Object.keys(ebaySelectedPolicies).length === 0}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save settings →'}
                </button>
              </>
            )}
          </div>
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
