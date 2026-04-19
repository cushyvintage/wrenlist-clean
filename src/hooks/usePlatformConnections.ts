'use client'

import { useState, useEffect } from 'react'
import { unwrapApiResponse } from '@/lib/api-utils'
import type { Find } from '@/types'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'
import { useConfirm } from '@/components/wren/ConfirmProvider'

const VINTED_EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'

interface EbayPolicy {
  id: string
  name: string
}

interface EbayPolicies {
  shipping?: EbayPolicy[]
  payment?: EbayPolicy[]
  returns?: EbayPolicy[]
  locations?: { merchantLocationKey?: string; key?: string }[]
}

interface EbayConnectionState {
  connected: boolean
  setupComplete: boolean
  refreshStatus: () => Promise<void>
}

export function usePlatformConnections(ebay: EbayConnectionState, ebayChangingPolicies: boolean) {
  const confirm = useConfirm()
  const [vintedConnected, setVintedConnected] = useState(false)
  const [vintedUsername, setVintedUsername] = useState<string | null>(null)
  const [vintedIsBusiness, setVintedIsBusiness] = useState(false)
  const [vintedLoading, setVintedLoading] = useState(false)
  const [vintedSyncLoading, setVintedSyncLoading] = useState(false)
  const [vintedSyncResult, setVintedSyncResult] = useState<{ updated: number; failed: number } | null>(null)
  const [vintedActionError, setVintedActionError] = useState<string | null>(null)

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

  const [ebayPolicies, setEbayPolicies] = useState<EbayPolicies | null>(null)
  const [ebaySelectedPolicies, setEbaySelectedPolicies] = useState<Record<string, string>>({})
  const [ebayPoliciesLoading, setEbayPoliciesLoading] = useState(false)
  const [ebaySetupMessage, setEbaySetupMessage] = useState<string | null>(null)
  const [policyIsLoading, setPolicyIsLoading] = useState(false)

  const [pageError, setPageError] = useState<string | null>(null)

  const checkVintedSession = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        return
      }
      const response = await new Promise<{ loggedIn: boolean; username?: string; userId?: string; tld?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(VINTED_EXTENSION_ID, { action: 'get_vinted_session' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ loggedIn: false })
          else resolve(response || { loggedIn: false })
        })
      })

      if (response.loggedIn && response.username) {
        setVintedConnected(true)

        // Best-effort: ask the extension to fetch the authenticated Vinted user
        // detail so we can tell the server whether this is a Pro/business
        // account. The extension has vinted.co.uk cookies; we don't.
        //
        // The Vinted extension's get_vinted_session response returns the
        // numeric id under the `username` field when it couldn't resolve the
        // login name (which is the common case since Vinted's public user
        // API now 401s without auth headers). So the numeric id candidate is
        // whichever of (userId, username) actually looks numeric.
        let isBusiness: boolean | null = null
        const tld = response.tld || 'co.uk'
        const rawId = String(response.userId ?? response.username ?? '')
        const numericId = /^\d+$/.test(rawId) ? rawId : null
        if (numericId) {
          try {
            const apiResp = await new Promise<{ success?: boolean; results?: { user?: { business?: boolean } } }>((resolve) => {
              const timeout = setTimeout(() => resolve({ success: false }), 8000)
              chrome.runtime.sendMessage(
                VINTED_EXTENSION_ID,
                {
                  action: 'fetch_vinted_api',
                  url: `https://www.vinted.${tld}/api/v2/users/${numericId}`,
                  method: 'GET',
                },
                (r) => {
                  clearTimeout(timeout)
                  if (chrome.runtime.lastError) resolve({ success: false })
                  else resolve(r || { success: false })
                },
              )
            })
            if (apiResp.success && typeof apiResp.results?.user?.business === 'boolean') {
              isBusiness = apiResp.results.user.business
            }
          } catch {
            // Non-fatal — leave isBusiness null, server will preserve existing value.
          }
        }

        try {
          const connectRes = await fetch('/api/vinted/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vintedUsername: response.username,
              vintedUserId: response.userId || response.username,
              tld,
              isBusiness,
            }),
          })
          if (connectRes.ok) {
            const connectData = await connectRes.json()
            setVintedUsername(connectData.data?.vintedUsername || response.username)
            setVintedIsBusiness(Boolean(connectData.data?.isBusiness))
          } else {
            setVintedUsername(response.username)
          }
        } catch {
          setVintedUsername(response.username)
        }
      } else {
        setVintedConnected(false)
      }
    } catch {
      // Silently fail
    }
  }

  const checkEtsySession = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
      const response = await new Promise<{ loggedIn: boolean; userId?: string; username?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'check_marketplace_login', marketplace: 'etsy' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ loggedIn: false })
          else resolve(response || { loggedIn: false })
        })
      })
      setEtsyConnected(response.loggedIn)
      if (response.loggedIn) {
        await fetch('/api/etsy/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ etsyUserId: response.userId || 'extension', etsyUsername: response.username || 'etsy' }),
        }).catch(() => {})
      }
    } catch {
      setEtsyConnected(false)
    }
  }

  const checkFacebookSession = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
      const response = await new Promise<{ loggedIn: boolean; userId?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'check_marketplace_login', marketplace: 'facebook' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ loggedIn: false })
          else resolve(response || { loggedIn: false })
        })
      })
      setFacebookConnected(response.loggedIn)

      // Persist connection to DB when logged in with a user ID
      if (response.loggedIn && response.userId) {
        try {
          await fetch('/api/facebook/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ facebookUserId: response.userId }),
          })
        } catch {
          // Non-critical
        }
      }
    } catch {
      setFacebookConnected(false)
    }
  }

  const checkDepopSession = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
      const response = await new Promise<{ loggedIn: boolean; userId?: string; username?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'check_marketplace_login', marketplace: 'depop' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ loggedIn: false })
          else resolve(response || { loggedIn: false })
        })
      })
      setDepopConnected(response.loggedIn)
      if (response.loggedIn && response.userId) {
        await fetch('/api/depop/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ depopUserId: response.userId, depopUsername: response.username || response.userId }),
        }).catch(() => {})
      }
    } catch {
      setDepopConnected(false)
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
          setVintedIsBusiness(Boolean(data.data.isBusiness))
        }
      } catch {
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
      } catch {
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

  // Fetch eBay policies when needed
  useEffect(() => {
    if (ebay.connected && (!ebay.setupComplete || ebayChangingPolicies)) {
      const fetchPolicies = async () => {
        setEbayPoliciesLoading(true)
        try {
          const response = await fetch('/api/ebay/setup/policies')
          if (response.ok) {
            const data = await response.json()
            const d = data.data || {}
            const policies = {
              shipping: d.fulfillmentPolicies || [],
              returns: d.returnPolicies || [],
              payment: d.paymentPolicies || [],
              locations: d.locations || [],
            }
            setEbayPolicies(policies)

            const defaults: Record<string, string> = {}
            if (policies.shipping?.length > 0) {
              const p = policies.shipping.find((p: EbayPolicy) => p.name === 'Postage Policy')
              defaults.shipping = p?.id || policies.shipping[0].id
            }
            if (policies.returns?.length > 0) {
              const p = policies.returns.find((p: EbayPolicy) => p.name === 'Returns policy')
              defaults.returns = p?.id || policies.returns[0].id
            }
            if (policies.payment?.length > 0) {
              const p = policies.payment.find((p: EbayPolicy) => p.name === 'Payment Policy')
              defaults.payment = p?.id || policies.payment[0].id
            }
            setEbaySelectedPolicies(defaults)
          }
        } catch {
          // Silently fail
        } finally {
          setEbayPoliciesLoading(false)
        }
      }
      fetchPolicies()
    }
  }, [ebay.connected, ebay.setupComplete, ebayChangingPolicies])

  const handleSaveEbayPolicies = async (): Promise<boolean> => {
    setPolicyIsLoading(true)
    setEbaySetupMessage(null)
    setPageError(null)
    try {
      const firstLocation = ebayPolicies?.locations?.[0]
      const payload = {
        fulfillmentPolicyId: ebaySelectedPolicies.shipping,
        fulfillmentPolicyName: ebayPolicies?.shipping?.find((p: EbayPolicy) => p.id === ebaySelectedPolicies.shipping)?.name || '',
        returnPolicyId: ebaySelectedPolicies.returns,
        returnPolicyName: ebayPolicies?.returns?.find((p: EbayPolicy) => (p as unknown as { returnPolicyId?: string }).returnPolicyId === ebaySelectedPolicies.returns || p.id === ebaySelectedPolicies.returns)?.name || '',
        paymentPolicyId: ebaySelectedPolicies.payment,
        paymentPolicyName: ebayPolicies?.payment?.find((p: EbayPolicy) => (p as unknown as { paymentPolicyId?: string }).paymentPolicyId === ebaySelectedPolicies.payment || p.id === ebaySelectedPolicies.payment)?.name || '',
        merchantLocationKey: firstLocation?.merchantLocationKey || firstLocation?.key || 'default',
      }
      const response = await fetch('/api/ebay/setup/policies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error('Failed to save policies')
      await ebay.refreshStatus()
      setEbaySetupMessage('Policies saved successfully!')
      return true
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to save policies')
      return false
    } finally {
      setPolicyIsLoading(false)
    }
  }

  const handleShopifyConnect = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!shopifyFormData.storeDomain) { setShopifyError('Store domain is required'); return }
    setShopifyLoading(true)
    setShopifyError(null)
    setPageError(null)
    try {
      const response = await fetch('/api/shopify/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeDomain: shopifyFormData.storeDomain }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to connect Shopify')
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

  const handleShopifyDisconnect = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Disconnect Shopify?',
      message: 'You can reconnect anytime.',
      confirmLabel: 'Disconnect',
      tone: 'danger',
    })
    if (!ok) return
    setShopifyLoading(true)
    try {
      const response = await fetch('/api/shopify/connect', { method: 'DELETE' })
      if (response.ok) { setShopifyConnected(false); setShopifyName(null); setShopifyDomain(null) }
    } catch {
      setPageError('Failed to disconnect Shopify')
    } finally {
      setShopifyLoading(false)
    }
  }

  const handleVintedSync = async (): Promise<void> => {
    setVintedSyncLoading(true)
    setVintedActionError(null)
    setVintedSyncResult(null)
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) throw new Error('Extension not available')
      const findsResponse = await fetch('/api/finds?platform=vinted')
      if (!findsResponse.ok) throw new Error('Failed to fetch finds')
      const findsData = await findsResponse.json()
      const findsPayload = unwrapApiResponse<{ items: Find[] }>(findsData)
      const finds = findsPayload?.items || []
      if (finds.length === 0) { setVintedSyncResult({ updated: 0, failed: 0 }); return }

      const extensionResponse = await new Promise<{ success: boolean; updates?: unknown[] }>((resolve) => {
        const timeout = setTimeout(() => resolve({ success: false }), 30000)
        chrome.runtime.sendMessage(VINTED_EXTENSION_ID, { action: 'sync_vinted_status', data: { products: finds } }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ success: false })
          else resolve(response || { success: false })
        })
      })

      if (!extensionResponse.success || !extensionResponse.updates) throw new Error('Failed to sync status from extension')

      const apiResponse = await fetch('/api/vinted/sync-status', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: extensionResponse.updates }),
      })
      if (!apiResponse.ok) throw new Error('Failed to sync status')
      const result = await apiResponse.json()
      setVintedSyncResult(result.data)
    } catch (error) {
      setVintedActionError(error instanceof Error ? error.message : 'Failed to sync status')
    } finally {
      setVintedSyncLoading(false)
    }
  }

  const handleVintedDisconnect = async (): Promise<void> => {
    const ok = await confirm({
      title: 'Disconnect Vinted?',
      message: 'You can reconnect anytime by logging in via the extension.',
      confirmLabel: 'Disconnect',
      tone: 'danger',
    })
    if (!ok) return
    setVintedLoading(true)
    try {
      const response = await fetch('/api/vinted/connect', { method: 'DELETE' })
      if (response.ok) { setVintedConnected(false); setVintedUsername(null); setVintedIsBusiness(false) }
    } catch {
      setPageError('Failed to disconnect Vinted')
    } finally {
      setVintedLoading(false)
    }
  }

  return {
    // Vinted
    vintedConnected, vintedUsername, vintedIsBusiness, vintedLoading, vintedSyncLoading,
    vintedSyncResult, vintedActionError,
    checkVintedSession, handleVintedSync, handleVintedDisconnect,
    // Shopify
    shopifyConnected, shopifyName, shopifyDomain, shopifyFormOpen, setShopifyFormOpen,
    shopifyFormData, setShopifyFormData, shopifyLoading, shopifyError,
    handleShopifyConnect, handleShopifyDisconnect,
    // Etsy
    etsyConnected, etsyLoading, setEtsyLoading, checkEtsySession,
    // Facebook
    facebookConnected, facebookLoading, setFacebookLoading, checkFacebookSession,
    // Depop
    depopConnected, depopLoading, setDepopLoading, checkDepopSession,
    // eBay policies
    ebayPolicies, ebaySelectedPolicies, setEbaySelectedPolicies,
    ebayPoliciesLoading, ebaySetupMessage, policyIsLoading, handleSaveEbayPolicies,
    // General
    pageError, setPageError,
  }
}
