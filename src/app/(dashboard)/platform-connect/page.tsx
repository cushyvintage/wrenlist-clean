'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { Badge } from '@/components/wren/Badge'
import { VintedDebugPanel } from '@/components/wren/VintedDebugPanel'
import { useEbayConnection } from '@/hooks/useEbayConnection'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { useExtensionInfo, EXTENSION_ID } from '@/hooks/useExtensionInfo'
import { useExtensionHeartbeat } from '@/hooks/useExtensionHeartbeat'
import { CheckCircle2 } from 'lucide-react'
import { unwrapApiResponse } from '@/lib/api-utils'
import type { Find } from '@/types'

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
  const ebay = useEbayConnection()
  const [pageError, setPageError] = useState<string | null>(null)
  const [ebayPolicies, setEbayPolicies] = useState<EbayPolicies | null>(null)
  const [ebaySelectedPolicies, setEbaySelectedPolicies] = useState<Record<string, string>>({})
  const [ebayChangingPolicies, setEbayChangingPolicies] = useState(false)
  const [ebayPoliciesLoading, setEbayPoliciesLoading] = useState(false)
  const [ebaySetupMessage, setEbaySetupMessage] = useState<string | null>(null)
  const [policyIsLoading, setPolicyIsLoading] = useState(false)
  const [salesDetection, setSalesDetection] = useState<Record<string, boolean>>({
    ebay: true,
    vinted: true,
  })
  const [vintedConnected, setVintedConnected] = useState(false)
  const [vintedUsername, setVintedUsername] = useState<string | null>(null)
  const [vintedLoading, setVintedLoading] = useState(false)
  const [shopifyConnected, setShopifyConnected] = useState(false)
  const [shopifyName, setShopifyName] = useState<string | null>(null)
  const [shopifyDomain, setShopifyDomain] = useState<string | null>(null)
  const [shopifyFormOpen, setShopifyFormOpen] = useState(false)
  const [shopifyFormData, setShopifyFormData] = useState({ storeDomain: '' })
  const [shopifyLoading, setShopifyLoading] = useState(false)
  const [shopifyError, setShopifyError] = useState<string | null>(null)
  const [etsyConnected, setEtsyConnected] = useState(false)
  const [etsyLoading, setEtsyLoading] = useState(false)
  const [facebookConnected, setFacebookConnected] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)
  const [depopConnected, setDepopConnected] = useState(false)
  const [depopLoading, setDepopLoading] = useState(false)
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(null)
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null)
  const extensionInfo = useExtensionInfo()
  const heartbeat = useExtensionHeartbeat()
  // True when chrome.runtime.sendMessage is unavailable (mobile, Safari, non-Chrome).
  // Computed once after mount to avoid SSR hydration mismatch.
  const [isMobileOrNonChrome, setIsMobileOrNonChrome] = useState(false)
  useEffect(() => {
    setIsMobileOrNonChrome(typeof chrome === 'undefined' || !chrome.runtime?.sendMessage)
  }, [])
  const [vintedSyncLoading, setVintedSyncLoading] = useState(false)
  const [vintedSyncResult, setVintedSyncResult] = useState<{ updated: number; failed: number } | null>(null)
  const [vintedActionError, setVintedActionError] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)


  // Sync extension info: heartbeat on mobile, browser ping on desktop
  useEffect(() => {
    if (isMobileOrNonChrome) {
      // Mobile/non-Chrome: always use server-side heartbeat
      if (heartbeat.online !== null) {
        setExtensionDetected(heartbeat.online)
        setExtensionVersion(heartbeat.version)
      }
    } else if (extensionInfo.detected !== null) {
      // Desktop Chrome: direct ping
      setExtensionDetected(extensionInfo.detected)
      setExtensionVersion(extensionInfo.version)
    }
  }, [extensionInfo.detected, extensionInfo.version, heartbeat.online, heartbeat.version, isMobileOrNonChrome])

  // Check if debug panel should show (development or ?debug=1 param)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setShowDebug(true)
    } else {
      setShowDebug(new URLSearchParams(window.location.search).has('debug'))
    }
  }, [])

  // Check Vinted session via the Wrenlist extension
  const checkVintedSession = async (): Promise<void> => {
    try {
      const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        setExtensionDetected(false)
        return
      }

      const response = await new Promise<{ loggedIn: boolean; username?: string; userId?: string; tld?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'get_vinted_session' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) {
            resolve({ loggedIn: false })
          } else {
            resolve(response || { loggedIn: false })
          }
        })
      })

      setExtensionDetected(true)
      if (response.loggedIn && response.username) {
        setVintedConnected(true)

        // Save Vinted connection to database — server resolves numeric ID to login
        try {
          const connectRes = await fetch('/api/vinted/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vintedUsername: response.username,
              vintedUserId: response.userId || response.username,
              tld: response.tld || 'co.uk',
            }),
          })
          if (connectRes.ok) {
            const connectData = await connectRes.json()
            setVintedUsername(connectData.data?.vintedUsername || response.username)
          } else {
            setVintedUsername(response.username)
          }
        } catch {
          setVintedUsername(response.username)
        }
      } else {
        setVintedConnected(false)
      }
    } catch (error) {
      setExtensionDetected(false)
    }
  }

  // Check Etsy login via the Wrenlist extension (cookie-based)
  const checkEtsySession = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return

      const response = await new Promise<{ loggedIn: boolean }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'check_marketplace_login', marketplace: 'etsy' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) {
            resolve({ loggedIn: false })
          } else {
            resolve(response || { loggedIn: false })
          }
        })
      })

      setEtsyConnected(response.loggedIn)

      // Persist to DB so /api/platforms/status picks it up
      if (response.loggedIn) {
        await fetch('/api/etsy/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ etsyUserId: 'extension', etsyUsername: 'etsy' }),
        }).catch(() => {})
      }
    } catch {
      setEtsyConnected(false)
    }
  }

  const checkFacebookSession = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
      const response = await new Promise<{ loggedIn: boolean }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'check_marketplace_login', marketplace: 'facebook' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ loggedIn: false })
          else resolve(response || { loggedIn: false })
        })
      })
      setFacebookConnected(response.loggedIn)
    } catch {
      setFacebookConnected(false)
    }
  }

  const checkDepopSession = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
      const response = await new Promise<{ loggedIn: boolean }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'check_marketplace_login', marketplace: 'depop' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ loggedIn: false })
          else resolve(response || { loggedIn: false })
        })
      })
      setDepopConnected(response.loggedIn)

      // Persist to DB so /api/platforms/status picks it up
      if (response.loggedIn) {
        await fetch('/api/depop/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ depopUserId: 'extension', depopUsername: 'depop' }),
        }).catch(() => {})
      }
    } catch {
      setDepopConnected(false)
    }
  }

  // Check if token expires within 7 days
  const isTokenExpiringWithin7Days = (): boolean => {
    if (!ebay.expiresAt) return false
    const expiresAt = new Date(ebay.expiresAt)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return expiresAt <= sevenDaysFromNow
  }

  const getExpiryDateFormatted = (): string => {
    if (!ebay.expiresAt) return ''
    const expiresAt = new Date(ebay.expiresAt)
    return expiresAt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Check OAuth response
  useEffect(() => {
    const success = searchParams.get('success')
    const errorMsg = searchParams.get('error')

    if (success === 'ebay') {
      setPageError(null)
      ebay.refreshStatus()
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (errorMsg) {
      setPageError(`OAuth failed: ${errorMsg}`)
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [searchParams, ebay])

  // Fetch policies when connected but not setup, or when changing policies
  useEffect(() => {
    if (ebay.connected && (!ebay.setupComplete || ebayChangingPolicies)) {
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
              const postagePolicy = policies.shipping.find((p: any) => p.name === 'Postage Policy')
              defaults.shipping = postagePolicy?.id || policies.shipping[0].id
            }

            // Returns: prefer "Returns policy", else first
            if (policies.returns && policies.returns.length > 0) {
              const returnsPolicy = policies.returns.find((p: any) => p.name === 'Returns policy')
              defaults.returns = returnsPolicy?.id || policies.returns[0].id
            }

            // Payment: prefer "Payment Policy", else first
            if (policies.payment && policies.payment.length > 0) {
              const paymentPolicy = policies.payment.find((p: any) => p.name === 'Payment Policy')
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
  }, [ebay.connected, ebay.setupComplete, ebayChangingPolicies])

  const handleSaveEbayPolicies = async () => {
    setPolicyIsLoading(true)
    setEbaySetupMessage(null)
    setPageError(null)

    try {
      // Map UI field names to API field names and auto-select first location
      const firstLocation = ebayPolicies?.locations?.[0]
      const payload = {
        fulfillmentPolicyId: ebaySelectedPolicies.shipping,
        fulfillmentPolicyName: ebayPolicies?.shipping?.find((p: any) => p.id === ebaySelectedPolicies.shipping)?.name || '',
        returnPolicyId: ebaySelectedPolicies.returns,
        returnPolicyName: ebayPolicies?.returns?.find((p: any) => (p.returnPolicyId || p.id) === ebaySelectedPolicies.returns)?.name || '',
        paymentPolicyId: ebaySelectedPolicies.payment,
        paymentPolicyName: ebayPolicies?.payment?.find((p: any) => (p.paymentPolicyId || p.id) === ebaySelectedPolicies.payment)?.name || '',
        merchantLocationKey: firstLocation?.merchantLocationKey || firstLocation?.key || 'default',
      }
      const response = await fetch('/api/ebay/setup/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save policies')
      }

      await ebay.refreshStatus()
      setEbayChangingPolicies(false)
      setEbaySetupMessage('Policies saved successfully!')
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to save policies')
    } finally {
      setPolicyIsLoading(false)
    }
  }

  // Fetch Vinted connection status on mount
  useEffect(() => {
    const fetchVintedStatus = async () => {
      try {
        setVintedLoading(true)
        const response = await fetch('/api/vinted/connect')
        if (response.ok) {
          const data = await response.json()
          setVintedConnected(data.data.connected)
          setVintedUsername(data.data.vintedUsername)
        }
      } catch (error) {
        // Silently fail
      } finally {
        setVintedLoading(false)
      }
    }

    fetchVintedStatus()
    void checkVintedSession()
  }, [])

  // Fetch Shopify connection status on mount
  useEffect(() => {
    const fetchShopifyStatus = async () => {
      try {
        const response = await fetch('/api/shopify/connect')
        if (response.ok) {
          const data = await response.json()
          setShopifyConnected(data.data.connected)
          setShopifyName(data.data.shopName)
          setShopifyDomain(data.data.storeDomain)
        }
      } catch (error) {
        // Silently fail
      }
    }

    fetchShopifyStatus()
  }, [])

  // Check Etsy, Facebook, Depop login on mount
  useEffect(() => {
    setEtsyLoading(true)
    void checkEtsySession().finally(() => setEtsyLoading(false))
    setFacebookLoading(true)
    void checkFacebookSession().finally(() => setFacebookLoading(false))
    setDepopLoading(true)
    void checkDepopSession().finally(() => setDepopLoading(false))
  }, [])

  const handleShopifyConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!shopifyFormData.storeDomain) {
      setShopifyError('Store domain is required')
      return
    }

    setShopifyLoading(true)
    setShopifyError(null)
    setPageError(null)

    try {
      const response = await fetch('/api/shopify/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeDomain: shopifyFormData.storeDomain,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect Shopify')
      }

      setShopifyConnected(true)
      setShopifyName(data.data.shopName)
      setShopifyDomain(data.data.storeDomain)
      setShopifyFormOpen(false)
      setShopifyFormData({ storeDomain: '' })
    } catch (err) {
      setShopifyError(err instanceof Error ? err.message : 'Failed to connect Shopify')
    } finally {
      setShopifyLoading(false)
    }
  }

  const handleShopifyDisconnect = async () => {
    if (!confirm('Disconnect Shopify? You can reconnect anytime.')) return

    setShopifyLoading(true)
    try {
      const response = await fetch('/api/shopify/connect', {
        method: 'DELETE',
      })

      if (response.ok) {
        setShopifyConnected(false)
        setShopifyName(null)
        setShopifyDomain(null)
      }
    } catch (error) {
      setPageError('Failed to disconnect Shopify')
    } finally {
      setShopifyLoading(false)
    }
  }

  const handleVintedSync = async () => {
    const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
    setVintedSyncLoading(true)
    setVintedActionError(null)
    setVintedSyncResult(null)

    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        throw new Error('Extension not available')
      }

      // Get all finds with Vinted listings
      const findsResponse = await fetch('/api/finds?platform=vinted')
      if (!findsResponse.ok) {
        throw new Error('Failed to fetch finds')
      }

      const findsData = await findsResponse.json()
      const findsPayload = unwrapApiResponse<{ items: Find[] }>(findsData)
      const finds = findsPayload?.items || []

      if (finds.length === 0) {
        setVintedSyncResult({ updated: 0, failed: 0 })
        return
      }

      // Send to extension for status sync
      const extensionResponse = await new Promise<{ success: boolean; updates?: any[] }>((resolve) => {
        const timeout = setTimeout(() => resolve({ success: false }), 30000)
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'sync_vinted_status', data: { products: finds } },
          (response) => {
            clearTimeout(timeout)
            if (chrome.runtime.lastError) {
              resolve({ success: false })
            } else {
              resolve(response || { success: false })
            }
          }
        )
      })

      if (!extensionResponse.success || !extensionResponse.updates) {
        throw new Error('Failed to sync status from extension')
      }

      // Send updates to backend
      const apiResponse = await fetch('/api/vinted/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: extensionResponse.updates }),
      })

      if (!apiResponse.ok) {
        throw new Error('Failed to sync status')
      }

      const result = await apiResponse.json()
      setVintedSyncResult(result.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sync status'
      setVintedActionError(message)
    } finally {
      setVintedSyncLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="font-serif text-2xl italic text-ink">platform connections</h1>
        <a href="/settings" className="text-sm text-sage hover:text-sage-dk transition">
          ← back to settings
        </a>
      </div>

      {/* Error banner */}
      {(pageError || ebay.error) && (
        <div className="p-3 bg-red-50 border border-red rounded text-sm text-red">
          {pageError || ebay.error}
        </div>
      )}

      {/* Extension banner */}
      <div className={`flex items-center gap-4 p-4 rounded border ${extensionDetected ? 'bg-sage-pale border-sage' : extensionDetected === null ? 'bg-cream border-border' : 'bg-amber-50 border-amber/30'}`}>
        <div className="flex-shrink-0">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Wrenlist Extension">
            <rect width="24" height="24" rx="6" fill="#5E7D5E" />
            <path d="M8 8V7C8 5.3 9.3 4 11 4H13C14.7 4 16 5.3 16 7V8M6 8H18L17 20H7L6 8Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-ink">Wrenlist Extension</span>
            {extensionDetected === null ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-ink-lt uppercase tracking-wide">
                <div className="w-1 h-1 rounded-full bg-ink-lt animate-pulse"></div>
                checking…
              </div>
            ) : extensionDetected ? (
              <div className="flex items-center gap-1 text-xs font-semibold text-sage uppercase tracking-wide">
                <div className="w-1 h-1 rounded-full bg-sage"></div>
                {isMobileOrNonChrome ? 'running on desktop' : 'connected'}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                <div className="w-1 h-1 rounded-full bg-amber-700"></div>
                {isMobileOrNonChrome ? 'offline' : 'not detected'}
              </div>
            )}
          </div>
          <div className="text-xs text-ink-lt">
            {extensionDetected && isMobileOrNonChrome && heartbeat.lastSeenAt
              ? `Last seen ${new Date(heartbeat.lastSeenAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
              : `Chrome desktop${extensionVersion ? ` · v${extensionVersion}` : ''} · Required for Vinted and Shopify crosslisting`
            }
          </div>
        </div>
        <span className="px-4 py-2 text-sm text-ink-lt flex-shrink-0 hidden sm:block">
          {isMobileOrNonChrome
            ? extensionDetected
              ? 'Manage from Chrome on your desktop'
              : 'Install in Chrome on your desktop'
            : 'Open extension from your browser toolbar'
          }
        </span>
      </div>

      {/* eBay */}
      <Panel>
        {!ebay.connected ? (
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
              onClick={ebay.connectEbay}
              disabled={ebay.isLoading}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50 mb-4"
            >
              {ebay.isLoading ? 'Connecting...' : 'Connect eBay account →'}
            </button>

            <div className="text-xs text-ink-lt text-center">
              Wrenlist will create and manage listings on your behalf. Disconnect any time.
            </div>
          </div>
        ) : ebay.setupComplete && !ebayChangingPolicies ? (
          // State C: Connected + setup complete
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0">
                <MarketplaceIcon platform="ebay" size="lg" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm text-ink flex items-center gap-1.5">eBay UK — Connected <CheckCircle2 size={15} className="text-green-600" /></div>
                </div>
                <div className="text-xs text-ink-lt">Account: {ebay.username}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-cream-md rounded mb-4">
              <div>
                <div className="text-xs font-medium text-ink-lt mb-1">Account</div>
                <div className="text-sm text-ink font-mono">{ebay.username}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-lt mb-1">Marketplace</div>
                <div className="text-sm text-ink">eBay UK (GB)</div>
              </div>
            </div>

            {isTokenExpiringWithin7Days() && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber rounded mb-4">
                <div className="text-sm text-amber mt-0.5">⚠️</div>
                <div className="flex-1">
                  <div className="text-sm text-amber font-medium">Your eBay connection expires on {getExpiryDateFormatted()}</div>
                  <div className="text-xs text-amber-700 mt-1">Reconnect to avoid interruptions.</div>
                </div>
                <button
                  onClick={ebay.connectEbay}
                  disabled={ebay.isLoading}
                  className="text-xs text-amber underline underline-offset-2 hover:text-amber-900 transition disabled:opacity-50 flex-shrink-0"
                >
                  Reconnect →
                </button>
              </div>
            )}

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
                onClick={() => {
                  setEbaySelectedPolicies({})
                  setEbayChangingPolicies(true)
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
              >
                Change policies
              </button>
              <button
                onClick={ebay.connectEbay}
                disabled={ebay.isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition disabled:opacity-50"
              >
                ↻ Reconnect
              </button>
              <button
                onClick={ebay.disconnectEbay}
                disabled={ebay.isLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition disabled:opacity-50"
              >
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
                  disabled={policyIsLoading || Object.keys(ebaySelectedPolicies).length === 0}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
                >
                  {policyIsLoading ? 'Saving...' : 'Save settings →'}
                </button>
              </>
            )}
          </div>
        )}
      </Panel>

      {/* Vinted */}
      <Panel>
        {!vintedConnected && !extensionDetected ? (
          // State A: Not connected (no extension)
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0">
                <MarketplaceIcon platform="vinted" size="lg" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-ink">Vinted</div>
                <div className="text-xs text-ink-lt">Automatic via extension</div>
              </div>
            </div>

            <p className="text-sm text-ink mb-4">
              Vinted connects automatically via the Wrenlist extension. Simply log in to <strong>vinted.co.uk</strong> in your browser and Wrenlist will detect your account.
            </p>

            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber rounded mb-4">
              <div className="text-sm text-amber">⚠</div>
              <div className="text-sm text-amber">
                <strong>Heads up about Vinted's Terms of Service</strong> — Vinted's ToS prohibit third-party automation tools.{' '}
                <a href="https://www.vinted.co.uk/terms-and-conditions" className="underline hover:no-underline">
                  Read Vinted's terms →
                </a>
              </div>
            </div>

            <p className="text-xs text-ink-lt text-center">
              {vintedLoading || extensionDetected === null
                ? 'Checking status...'
                : extensionDetected
                  ? 'Extension detected ✓'
                  : isMobileOrNonChrome
                    ? 'Extension offline — open Chrome on your desktop to connect'
                    : 'Extension not detected. Install it to continue.'}
            </p>
          </div>
        ) : (
          // State B: Connected
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0">
                <MarketplaceIcon platform="vinted" size="lg" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm text-ink flex items-center gap-1.5">Vinted — Connected <CheckCircle2 size={15} className="text-green-600" /></div>
                </div>
                <div className="text-xs text-ink-lt">Account: {vintedUsername}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4 bg-cream-md rounded mb-4">
              <div>
                <div className="text-xs font-medium text-ink-lt mb-1">Username</div>
                <div className="text-sm text-ink font-mono">{vintedUsername}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-ink-lt mb-1">Platform</div>
                <div className="text-sm text-ink">Vinted UK</div>
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

            {vintedActionError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
                {vintedActionError}
              </div>
            )}

            {vintedSyncResult && (
              <div className="bg-green-50 border border-green-200 rounded p-3 mb-4 text-sm text-green-700">
                Synced status: {vintedSyncResult.updated} item{vintedSyncResult.updated !== 1 ? 's' : ''} updated
                {vintedSyncResult.failed > 0 && `, ${vintedSyncResult.failed} failed`}
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <a
                href="/import?platform=vinted"
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition text-center"
              >
                Import listings →
              </a>
              <button
                onClick={handleVintedSync}
                disabled={vintedSyncLoading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
              >
                {vintedSyncLoading ? 'Syncing...' : 'Sync status'}
              </button>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2">
                <div className="text-xs text-ink-lt">Managed by Wrenlist extension</div>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Disconnect Vinted? You can reconnect anytime by logging in via the extension.')) return
                  setVintedLoading(true)
                  try {
                    const response = await fetch('/api/vinted/connect', { method: 'DELETE' })
                    if (response.ok) {
                      setVintedConnected(false)
                      setVintedUsername(null)
                    }
                  } catch (error) {
                    setPageError('Failed to disconnect Vinted')
                  } finally {
                    setVintedLoading(false)
                  }
                }}
                disabled={vintedLoading}
                className="px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition disabled:opacity-50"
              >
                {vintedLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>

            {showDebug && <VintedDebugPanel extensionId="nblnainobllgbjkdkpeodjpopkgnpfgb" />}
          </div>
        )}
      </Panel>

      {/* Etsy — browser automation (Chrome extension) until API key is approved.
         API key applied Apr 2026, pending Etsy review. Credentials in .env.local.
         Once approved, replace this with OAuth connect flow like eBay. */}
      <Panel>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0">
            <MarketplaceIcon platform="etsy" size="lg" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm text-ink">
                {etsyConnected ? <span className="flex items-center gap-1.5">Etsy — Connected <CheckCircle2 size={15} className="text-green-600" /></span> : 'Etsy'}
              </div>
            </div>
            <div className="text-xs text-ink-lt">
              {etsyLoading ? 'Checking login...' : etsyConnected
                ? 'Crosslist your finds to Etsy via browser automation'
                : 'Log in to etsy.com, then click Check connection'}
            </div>
          </div>
          <Badge status={etsyConnected ? 'listed' : 'draft'} label={etsyConnected ? 'connected' : 'not connected'} />
        </div>

        {!etsyConnected && (
          <div className="flex gap-2">
            <a
              href="https://www.etsy.com/signin"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
            >
              Log in to Etsy →
            </a>
            <button
              onClick={async () => {
                setEtsyLoading(true)
                await checkEtsySession()
                setEtsyLoading(false)
              }}
              disabled={etsyLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
            >
              {etsyLoading ? 'Checking...' : 'Check connection'}
            </button>
          </div>
        )}

        {etsyConnected && (
          <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
            Etsy crosslisting uses browser automation — the extension opens the Etsy listing form, fills all fields, uploads images, selects the category, and clicks Publish. No API key needed.
          </div>
        )}
      </Panel>

      {/* Facebook Marketplace */}
      <Panel>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0">
            <MarketplaceIcon platform="facebook" size="lg" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm text-ink">
                {facebookConnected ? 'Facebook Marketplace — Connected' : 'Facebook Marketplace'}
              </div>
            </div>
            <div className="text-xs text-ink-lt">
              {facebookLoading ? 'Checking login...' : facebookConnected
                ? 'Local pickup listings via browser automation'
                : 'Log in to facebook.com, then click Check connection'}
            </div>
          </div>
          <Badge status={facebookConnected ? 'listed' : 'draft'} label={facebookConnected ? 'connected' : 'not connected'} />
        </div>

        {!facebookConnected && (
          <div className="flex gap-2">
            <a
              href="https://www.facebook.com/marketplace"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
            >
              Log in to Facebook →
            </a>
            <button
              onClick={async () => {
                setFacebookLoading(true)
                await checkFacebookSession()
                setFacebookLoading(false)
              }}
              disabled={facebookLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
            >
              {facebookLoading ? 'Checking...' : 'Check connection'}
            </button>
          </div>
        )}

        {facebookConnected && (
          <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
            Facebook Marketplace UK uses local pickup only. The extension scrapes session tokens from facebook.com and posts listings via their internal GraphQL API.
          </div>
        )}
      </Panel>

      {/* Depop */}
      <Panel>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0">
            <MarketplaceIcon platform="depop" size="lg" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm text-ink">
                {depopConnected ? 'Depop — Connected' : 'Depop'}
              </div>
            </div>
            <div className="text-xs text-ink-lt">
              {depopLoading ? 'Checking login...' : depopConnected
                ? 'Crosslist your finds to Depop via REST API'
                : 'Log in to depop.com, then click Check connection'}
            </div>
          </div>
          <Badge status={depopConnected ? 'listed' : 'draft'} label={depopConnected ? 'connected' : 'not connected'} />
        </div>

        {!depopConnected && (
          <div className="flex gap-2">
            <a
              href="https://www.depop.com/login"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
            >
              Log in to Depop →
            </a>
            <button
              onClick={async () => {
                setDepopLoading(true)
                await checkDepopSession()
                setDepopLoading(false)
              }}
              disabled={depopLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
            >
              {depopLoading ? 'Checking...' : 'Check connection'}
            </button>
          </div>
        )}

        {depopConnected && (
          <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
            Depop uses cookie-based authentication. The extension reads your Depop session from the browser and posts listings via their REST API with presigned S3 image uploads.
          </div>
        )}
      </Panel>

      {/* Shopify */}
      <Panel>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-shrink-0">
            <MarketplaceIcon platform="shopify" size="lg" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-ink">Shopify</div>
            <div className="text-xs text-ink-lt">Crosslist to your Shopify store</div>
          </div>
          <Badge status={shopifyConnected ? 'listed' : 'draft'} label={shopifyConnected ? 'connected' : 'not connected'} />
        </div>

        {shopifyError && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-4 text-sm text-red-700">
            {shopifyError}
          </div>
        )}

        {shopifyConnected && shopifyName ? (
          <>
            <div className="flex items-center justify-between p-3 border border-border rounded mb-4">
              <div>
                <div className="text-xs font-medium text-ink-lt mb-1">Store</div>
                <div className="text-sm text-ink font-medium">{shopifyName}</div>
                <div className="text-xs text-ink-lt">{shopifyDomain}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2">
                <div className="text-xs text-ink-lt">Connected</div>
              </div>
              <button
                onClick={handleShopifyDisconnect}
                disabled={shopifyLoading}
                className="px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition disabled:opacity-50"
              >
                {shopifyLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 mb-4">
              <p className="text-sm text-ink">
                Connect your Shopify store. You must be logged into <strong>admin.shopify.com</strong> in your browser. The Wrenlist extension handles publishing automatically.
              </p>
            </div>

            {!shopifyFormOpen ? (
              <button
                onClick={() => setShopifyFormOpen(true)}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition"
              >
                Connect Store
              </button>
            ) : (
              <form onSubmit={handleShopifyConnect} className="space-y-3">
                <input
                  type="text"
                  placeholder="Store ID or domain (e.g., pyedpp-i5 or pyedpp-i5.myshopify.com)"
                  value={shopifyFormData.storeDomain}
                  onChange={(e) =>
                    setShopifyFormData({ ...shopifyFormData, storeDomain: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={shopifyLoading}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
                  >
                    {shopifyLoading ? 'Connecting...' : 'Connect'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShopifyFormOpen(false)
                      setShopifyFormData({ storeDomain: '' })
                    }}
                    className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </Panel>

      {/* Tip */}
      <InsightCard
        text="Connect Etsy to reach buyers looking specifically for vintage — your Laura Ashley and Pendleton pieces would perform significantly better there."
      />
    </div>
  )
}
