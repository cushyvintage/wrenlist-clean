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

interface SessionInfo {
  userId?: string | null
  username?: string | null
  tld?: string | null
}

export function usePlatformConnections(ebay: EbayConnectionState, ebayChangingPolicies: boolean) {
  const confirm = useConfirm()
  // CONNECTED = row exists in DB (user has explicitly linked).
  // DETECTED = extension sees an active marketplace session, but the user
  // has not yet clicked "Connect". We NEVER persist detection to the DB on
  // its own — that would be silent auto-connection. The UI surfaces a
  // "Connect <platform>" affordance when detected && !connected so the
  // user opts in with a single click.
  const [vintedConnected, setVintedConnected] = useState(false)
  const [vintedDetected, setVintedDetected] = useState(false)
  const [vintedDetectedInfo, setVintedDetectedInfo] = useState<SessionInfo>({})
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
  const [etsyDetected, setEtsyDetected] = useState(false)
  const [etsyDetectedInfo, setEtsyDetectedInfo] = useState<SessionInfo>({})
  const [etsyUsername, setEtsyUsername] = useState<string | null>(null)
  const [etsyLoading, setEtsyLoading] = useState(false)

  const [facebookConnected, setFacebookConnected] = useState(false)
  const [facebookDetected, setFacebookDetected] = useState(false)
  const [facebookDetectedInfo, setFacebookDetectedInfo] = useState<SessionInfo>({})
  const [facebookUsername, setFacebookUsername] = useState<string | null>(null)
  const [facebookLoading, setFacebookLoading] = useState(false)

  const [depopConnected, setDepopConnected] = useState(false)
  const [depopDetected, setDepopDetected] = useState(false)
  const [depopDetectedInfo, setDepopDetectedInfo] = useState<SessionInfo>({})
  const [depopUsername, setDepopUsername] = useState<string | null>(null)
  const [depopLoading, setDepopLoading] = useState(false)

  const [ebayPolicies, setEbayPolicies] = useState<EbayPolicies | null>(null)
  const [ebaySelectedPolicies, setEbaySelectedPolicies] = useState<Record<string, string>>({})
  const [ebayPoliciesLoading, setEbayPoliciesLoading] = useState(false)
  const [ebaySetupMessage, setEbaySetupMessage] = useState<string | null>(null)
  const [policyIsLoading, setPolicyIsLoading] = useState(false)

  const [pageError, setPageError] = useState<string | null>(null)

  // --- Extension detection helpers (local state ONLY — no POST) ---

  const detectVintedSession = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
      const response = await new Promise<{ loggedIn: boolean; username?: string; userId?: string; tld?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(VINTED_EXTENSION_ID, { action: 'get_vinted_session' }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ loggedIn: false })
          else resolve(response || { loggedIn: false })
        })
      })

      if (response.loggedIn && response.username) {
        setVintedDetected(true)
        setVintedDetectedInfo({
          userId: response.userId ?? null,
          username: response.username,
          tld: response.tld || 'co.uk',
        })
      } else {
        setVintedDetected(false)
      }
    } catch {
      setVintedDetected(false)
    }
  }

  const detectMarketplaceSession = async (
    marketplace: 'etsy' | 'facebook' | 'depop',
    setDetected: (v: boolean) => void,
    setInfo: (v: SessionInfo) => void,
  ): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
      const response = await new Promise<{ loggedIn: boolean; userId?: string; username?: string }>((resolve) => {
        const timeout = setTimeout(() => resolve({ loggedIn: false }), 8000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'check_marketplace_login', marketplace }, (response) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError) resolve({ loggedIn: false })
          else resolve(response || { loggedIn: false })
        })
      })
      if (response.loggedIn) {
        setDetected(true)
        setInfo({ userId: response.userId ?? null, username: response.username ?? null })
      } else {
        setDetected(false)
      }
    } catch {
      setDetected(false)
    }
  }

  // --- Explicit connect handlers (user clicked "Connect") ---

  const handleVintedConnect = async (): Promise<void> => {
    setVintedLoading(true)
    setVintedActionError(null)
    try {
      const info = vintedDetectedInfo
      if (!info.username) {
        throw new Error('No Vinted session detected. Log in to vinted.co.uk first.')
      }

      // Resolve display name + business flag via the authenticated user
      // detail endpoint. Vinted's public user API 401s without cookies, but
      // the extension has them — `fetch_vinted_api` proxies the call. The
      // response's `user.login` is the display name (e.g. "cushyvintage")
      // while `user.business` flags Pro accounts. Only the session probe
      // returns a numeric id for brand-new connects, so we *must* do this
      // lookup to avoid storing "User №67094636" as the username.
      let isBusiness: boolean | null = null
      let resolvedLogin: string | null = null
      const tld = info.tld || 'co.uk'
      const rawId = String(info.userId ?? info.username ?? '')
      const numericId = /^\d+$/.test(rawId) ? rawId : null
      if (numericId && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          const apiResp = await new Promise<{ success?: boolean; results?: { user?: { login?: string; business?: boolean } } }>((resolve) => {
            const timeout = setTimeout(() => resolve({ success: false }), 8000)
            chrome.runtime.sendMessage(
              VINTED_EXTENSION_ID,
              { action: 'fetch_vinted_api', url: `https://www.vinted.${tld}/api/v2/users/${numericId}`, method: 'GET' },
              (r) => {
                clearTimeout(timeout)
                if (chrome.runtime.lastError) resolve({ success: false })
                else resolve(r || { success: false })
              },
            )
          })
          if (apiResp.success) {
            if (typeof apiResp.results?.user?.business === 'boolean') {
              isBusiness = apiResp.results.user.business
            }
            if (apiResp.results?.user?.login && !/^\d+$/.test(apiResp.results.user.login)) {
              resolvedLogin = apiResp.results.user.login
            }
          }
        } catch {
          // Non-fatal
        }
      }

      const connectRes = await fetch('/api/vinted/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Prefer the resolved login; fall back to whatever the session
          // probe returned (may be the numeric id). The server already
          // refuses to overwrite a previously-stored name with a numeric
          // value — see /api/vinted/connect POST.
          vintedUsername: resolvedLogin ?? info.username,
          vintedUserId: info.userId || info.username,
          tld,
          isBusiness,
        }),
      })
      if (!connectRes.ok) throw new Error('Failed to save Vinted connection')
      const connectData = await connectRes.json()
      setVintedConnected(true)
      setVintedUsername(connectData.data?.vintedUsername || info.username)
      setVintedIsBusiness(Boolean(connectData.data?.isBusiness))
      setVintedDetected(false)
    } catch (err) {
      setVintedActionError(err instanceof Error ? err.message : 'Failed to connect Vinted')
    } finally {
      setVintedLoading(false)
    }
  }

  const handleEtsyConnect = async (): Promise<void> => {
    setEtsyLoading(true)
    try {
      const info = etsyDetectedInfo
      if (!info.userId && !info.username) {
        throw new Error('No Etsy session detected. Log in to etsy.com first.')
      }

      // Resolve shop name via the extension's SSR scrape. check_marketplace_login
      // returns an opaque session id plus an empty username, so without this we'd
      // store the literal string "etsy" as the username. get_etsy_shop_stats
      // already runs for the dashboard stats card — we just need its shopName.
      let resolvedShopName: string | null = null
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          const stats = await new Promise<{ shopName?: string | null }>((resolve) => {
            const t = setTimeout(() => resolve({}), 15000)
            chrome.runtime.sendMessage(
              EXTENSION_ID,
              { action: 'get_etsy_shop_stats' },
              (r) => {
                clearTimeout(t)
                if (chrome.runtime.lastError) resolve({})
                else resolve(r && typeof r === 'object' ? r as { shopName?: string | null } : {})
              },
            )
          })
          if (stats.shopName && typeof stats.shopName === 'string') {
            resolvedShopName = stats.shopName
          }
        } catch {
          // Non-fatal — user can still connect; shop name will populate
          // on the next stats refresh.
        }
      }

      const finalUsername = resolvedShopName
        ?? (info.username && info.username !== 'etsy' ? info.username : null)
        ?? 'etsy'

      const res = await fetch('/api/etsy/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etsyUserId: info.userId || 'extension',
          etsyUsername: finalUsername,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setEtsyConnected(true)
        setEtsyUsername(data.data?.etsyUsername ?? finalUsername ?? null)
        setEtsyDetected(false)
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to connect Etsy')
    } finally {
      setEtsyLoading(false)
    }
  }

  const handleFacebookConnect = async (): Promise<void> => {
    setFacebookLoading(true)
    try {
      const info = facebookDetectedInfo
      if (!info.userId) {
        throw new Error('No Facebook session detected. Log in to facebook.com first.')
      }
      // Extension's check_marketplace_login now scrapes /me for the display
      // name (see handleCheckLoginCommand, facebook branch). If that
      // resolution failed, info.username is null and we let the server
      // preserve any previously stored value instead of overwriting.
      const res = await fetch('/api/facebook/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facebookUserId: info.userId,
          facebookUsername: info.username || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setFacebookConnected(true)
        setFacebookUsername(data.data?.facebookUsername ?? info.username ?? null)
        setFacebookDetected(false)
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to connect Facebook')
    } finally {
      setFacebookLoading(false)
    }
  }

  const handleDepopConnect = async (): Promise<void> => {
    setDepopLoading(true)
    try {
      const info = depopDetectedInfo
      if (!info.userId) {
        throw new Error('No Depop session detected. Log in to depop.com first.')
      }

      // Resolve real display handle via the authenticated users/me endpoint.
      // check_marketplace_login only returns the numeric Depop id, so
      // without this we'd store e.g. "396908643" as the username. The
      // extension already proxies Depop cookies via fetch_depop_api (same
      // call the shop-stats refresh uses — see DepopConnect.tsx).
      let resolvedUsername: string | null = null
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        try {
          const meResp = await new Promise<{ results?: { username?: string } }>((resolve) => {
            const t = setTimeout(() => resolve({}), 8000)
            chrome.runtime.sendMessage(
              EXTENSION_ID,
              { action: 'fetch_depop_api', url: 'https://webapi.depop.com/api/v1/users/me/' },
              (r) => {
                clearTimeout(t)
                if (chrome.runtime.lastError) resolve({})
                else resolve(r && typeof r === 'object' ? r : {})
              },
            )
          })
          const uname = meResp.results?.username
          if (typeof uname === 'string' && uname && !/^\d+$/.test(uname)) {
            resolvedUsername = uname
          }
        } catch {
          // Non-fatal — fall back to whatever the session probe gave us.
        }
      }

      const finalUsername = resolvedUsername
        ?? (info.username && !/^\d+$/.test(info.username) ? info.username : null)
        ?? info.userId

      const res = await fetch('/api/depop/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depopUserId: info.userId,
          depopUsername: finalUsername,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setDepopConnected(true)
        setDepopUsername(data.data?.depopUsername ?? finalUsername ?? null)
        setDepopDetected(false)
      }
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to connect Depop')
    } finally {
      setDepopLoading(false)
    }
  }

  // --- Disconnect handlers ---

  const makeDisconnect = (
    platform: string,
    endpoint: string,
    setConnected: (v: boolean) => void,
    setDetected: (v: boolean) => void,
    setUsername?: (v: string | null) => void,
  ) => async (): Promise<void> => {
    const ok = await confirm({
      title: `Disconnect ${platform}?`,
      message: 'You can reconnect any time — this only removes the link inside Wrenlist.',
      confirmLabel: 'Disconnect',
      tone: 'danger',
    })
    if (!ok) return
    try {
      const res = await fetch(endpoint, { method: 'DELETE' })
      if (res.ok) {
        setConnected(false)
        setDetected(false)
        if (setUsername) setUsername(null)
      } else {
        setPageError(`Failed to disconnect ${platform}`)
      }
    } catch {
      setPageError(`Failed to disconnect ${platform}`)
    }
  }

  const handleEtsyDisconnect = makeDisconnect('Etsy', '/api/etsy/connect', setEtsyConnected, setEtsyDetected, setEtsyUsername)
  const handleFacebookDisconnect = makeDisconnect('Facebook', '/api/facebook/connect', setFacebookConnected, setFacebookDetected, setFacebookUsername)
  const handleDepopDisconnect = makeDisconnect('Depop', '/api/depop/connect', setDepopConnected, setDepopDetected, setDepopUsername)

  // --- On mount: fetch DB state FIRST, then detect sessions ---

  useEffect(() => {
    // Vinted: DB state + session detect. DB state is authoritative for
    // "connected"; the session probe only decides whether to show the
    // "Detected — Connect" affordance or leave it clean.
    const init = async () => {
      try {
        setVintedLoading(true)
        const response = await fetch('/api/vinted/connect')
        if (response.ok) {
          const data = await response.json()
          setVintedConnected(Boolean(data.data?.connected))
          setVintedUsername(data.data?.vintedUsername ?? null)
          setVintedIsBusiness(Boolean(data.data?.isBusiness))
        }
      } catch {
        // Silently fail
      } finally {
        setVintedLoading(false)
      }
      void detectVintedSession()
    }
    void init()
  }, [])

  useEffect(() => {
    const fetchShopifyStatus = async () => {
      try {
        const response = await fetch('/api/shopify/connect')
        if (response.ok) {
          const data = await response.json()
          setShopifyConnected(Boolean(data.data?.connected))
          setShopifyName(data.data?.shopName ?? null)
          setShopifyDomain(data.data?.storeDomain ?? null)
        }
      } catch {
        // Silently fail
      }
    }
    fetchShopifyStatus()
  }, [])

  useEffect(() => {
    // Etsy / Facebook / Depop: DB check + separate session detect. Never POST
    // on mount — a freshly signed up user should see zero platform rows in
    // the DB until they click Connect.
    const initMarketplace = async (
      platform: 'etsy' | 'facebook' | 'depop',
      setConnected: (v: boolean) => void,
      setUsername: ((v: string | null) => void) | undefined,
      setDetected: (v: boolean) => void,
      setInfo: (v: SessionInfo) => void,
      setLoading: (v: boolean) => void,
    ) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/${platform}/connect`)
        if (res.ok) {
          const data = await res.json()
          setConnected(Boolean(data.data?.connected))
          if (setUsername) {
            const usernameKey = `${platform}Username` as const
            setUsername(data.data?.[usernameKey] ?? null)
          }
        }
      } catch {
        // Silently fail
      }
      await detectMarketplaceSession(platform, setDetected, setInfo)
      setLoading(false)
    }
    void initMarketplace('etsy', setEtsyConnected, setEtsyUsername, setEtsyDetected, setEtsyDetectedInfo, setEtsyLoading)
    void initMarketplace('facebook', setFacebookConnected, setFacebookUsername, setFacebookDetected, setFacebookDetectedInfo, setFacebookLoading)
    void initMarketplace('depop', setDepopConnected, setDepopUsername, setDepopDetected, setDepopDetectedInfo, setDepopLoading)
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
      message: 'You can reconnect any time by logging in via the extension.',
      confirmLabel: 'Disconnect',
      tone: 'danger',
    })
    if (!ok) return
    setVintedLoading(true)
    try {
      const response = await fetch('/api/vinted/connect', { method: 'DELETE' })
      if (response.ok) {
        setVintedConnected(false)
        setVintedUsername(null)
        setVintedIsBusiness(false)
        setVintedDetected(false)
      }
    } catch {
      setPageError('Failed to disconnect Vinted')
    } finally {
      setVintedLoading(false)
    }
  }

  return {
    // Vinted
    vintedConnected, vintedDetected, vintedUsername, vintedIsBusiness, vintedLoading, vintedSyncLoading,
    vintedSyncResult, vintedActionError,
    handleVintedConnect, handleVintedSync, handleVintedDisconnect,
    // Shopify
    shopifyConnected, shopifyName, shopifyDomain, shopifyFormOpen, setShopifyFormOpen,
    shopifyFormData, setShopifyFormData, shopifyLoading, shopifyError,
    handleShopifyConnect, handleShopifyDisconnect,
    // Etsy
    etsyConnected, etsyDetected, etsyUsername, etsyLoading,
    handleEtsyConnect, handleEtsyDisconnect,
    // Facebook
    facebookConnected, facebookDetected, facebookUsername, facebookLoading,
    handleFacebookConnect, handleFacebookDisconnect,
    // Depop
    depopConnected, depopDetected, depopUsername, depopLoading,
    handleDepopConnect, handleDepopDisconnect,
    // eBay policies
    ebayPolicies, ebaySelectedPolicies, setEbaySelectedPolicies,
    ebayPoliciesLoading, ebaySetupMessage, policyIsLoading, handleSaveEbayPolicies,
    // General
    pageError, setPageError,
  }
}
