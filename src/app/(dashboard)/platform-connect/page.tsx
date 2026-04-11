'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { useEbayConnection } from '@/hooks/useEbayConnection'
import { useExtensionInfo } from '@/hooks/useExtensionInfo'
import { useExtensionHeartbeat } from '@/hooks/useExtensionHeartbeat'
import { usePlatformConnections } from '@/hooks/usePlatformConnections'
import { ExtensionBanner } from '@/components/platform-connect/ExtensionBanner'
import { EbayConnect } from '@/components/platform-connect/EbayConnect'
import { VintedConnect } from '@/components/platform-connect/VintedConnect'
import { EtsyConnect } from '@/components/platform-connect/EtsyConnect'
import { FacebookConnect } from '@/components/platform-connect/FacebookConnect'
import { DepopConnect } from '@/components/platform-connect/DepopConnect'
import { ShopifyConnect } from '@/components/platform-connect/ShopifyConnect'

export default function PlatformConnectPage() {
  const searchParams = useSearchParams()
  const ebay = useEbayConnection()

  // Extension detection — two strategies:
  // 1. Desktop Chrome: useExtensionInfo sends chrome.runtime.sendMessage('ping')
  //    directly to the extension. Instant, but only works in Chrome with the
  //    extension installed on the same machine.
  // 2. Mobile / Safari / non-Chrome: useExtensionHeartbeat polls
  //    GET /api/extension/heartbeat every 30s. The extension POST's a heartbeat
  //    every 60s; the API returns online:true if last heartbeat < 2 min ago.
  //    This lets mobile users see "Running on desktop" instead of "Not detected".
  const extensionInfo = useExtensionInfo()
  const heartbeat = useExtensionHeartbeat()
  const [extensionDetected, setExtensionDetected] = useState<boolean | null>(null)
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null)

  // Detect whether chrome.runtime.sendMessage is available.
  // Set after mount (not inline) to avoid SSR hydration mismatch —
  // server always renders false, client may differ.
  const [isMobileOrNonChrome, setIsMobileOrNonChrome] = useState(false)
  const [ebayChangingPolicies, setEbayChangingPolicies] = useState(false)
  const [salesDetection, setSalesDetection] = useState<Record<string, boolean>>({ ebay: true, vinted: true })
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    setIsMobileOrNonChrome(typeof chrome === 'undefined' || !chrome.runtime?.sendMessage)
  }, [])

  // Sync extension status into local state.
  // On mobile: useExtensionInfo returns detected:false (chrome doesn't exist),
  // so we must check isMobileOrNonChrome FIRST to prefer the heartbeat.
  // On desktop Chrome: direct ping is faster and more accurate.
  useEffect(() => {
    if (isMobileOrNonChrome) {
      if (heartbeat.online !== null) {
        setExtensionDetected(heartbeat.online)
        setExtensionVersion(heartbeat.version)
      }
    } else if (extensionInfo.detected !== null) {
      setExtensionDetected(extensionInfo.detected)
      setExtensionVersion(extensionInfo.version)
    }
  }, [extensionInfo.detected, extensionInfo.version, heartbeat.online, heartbeat.version, isMobileOrNonChrome])

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setShowDebug(true)
    } else {
      setShowDebug(new URLSearchParams(window.location.search).has('debug'))
    }
  }, [])

  const platforms = usePlatformConnections(ebay, ebayChangingPolicies)

  // Handle OAuth callback params
  useEffect(() => {
    const success = searchParams.get('success')
    const errorMsg = searchParams.get('error')
    if (success === 'ebay') {
      platforms.setPageError(null)
      ebay.refreshStatus()
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    if (errorMsg) {
      platforms.setPageError(`OAuth failed: ${errorMsg}`)
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [searchParams, ebay, platforms])

  const pageError = platforms.pageError || ebay.error

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-end border-b border-border pb-4">
        <a href="/settings" className="text-sm text-sage hover:text-sage-dk transition">
          ← back to settings
        </a>
      </div>

      {/* Error banner */}
      {pageError && (
        <div className="p-3 bg-red-50 border border-red rounded text-sm text-red">
          {pageError}
        </div>
      )}

      <ExtensionBanner
        extensionDetected={extensionDetected}
        extensionVersion={extensionVersion}
        isOutdated={extensionInfo.isOutdated}
        isMobileOrNonChrome={isMobileOrNonChrome}
        heartbeatLastSeenAt={heartbeat.lastSeenAt}
      />

      {/* eBay */}
      <Panel>
        <EbayConnect
          ebay={ebay}
          ebayPolicies={platforms.ebayPolicies}
          ebayPoliciesLoading={platforms.ebayPoliciesLoading}
          ebaySelectedPolicies={platforms.ebaySelectedPolicies}
          ebayChangingPolicies={ebayChangingPolicies}
          ebaySetupMessage={platforms.ebaySetupMessage}
          policyIsLoading={platforms.policyIsLoading}
          salesDetection={salesDetection}
          onPolicyChange={(field, value) => platforms.setEbaySelectedPolicies({ ...platforms.ebaySelectedPolicies, [field]: value })}
          onSaveEbayPolicies={async () => {
            const ok = await platforms.handleSaveEbayPolicies()
            if (ok) setEbayChangingPolicies(false)
          }}
          onChangePoliciesClick={() => { platforms.setEbaySelectedPolicies({}); setEbayChangingPolicies(true) }}
          onSalesDetectionToggle={() => setSalesDetection({ ...salesDetection, ebay: !salesDetection.ebay })}
        />
      </Panel>

      {/* Vinted */}
      <Panel>
        <VintedConnect
          vintedConnected={platforms.vintedConnected}
          vintedUsername={platforms.vintedUsername}
          vintedLoading={platforms.vintedLoading}
          vintedSyncLoading={platforms.vintedSyncLoading}
          vintedSyncResult={platforms.vintedSyncResult}
          vintedActionError={platforms.vintedActionError}
          extensionDetected={extensionDetected}
          isMobileOrNonChrome={isMobileOrNonChrome}
          showDebug={showDebug}
          salesDetection={salesDetection}
          onSalesDetectionToggle={() => setSalesDetection({ ...salesDetection, vinted: !salesDetection.vinted })}
          onVintedSync={platforms.handleVintedSync}
          onDisconnect={platforms.handleVintedDisconnect}
        />
      </Panel>

      {/* Etsy — browser automation (Chrome extension) until API key is approved.
         API key applied Apr 2026, pending Etsy review. Credentials in .env.local.
         Once approved, replace this with OAuth connect flow like eBay. */}
      <Panel>
        <EtsyConnect
          etsyConnected={platforms.etsyConnected}
          etsyLoading={platforms.etsyLoading}
          onCheckConnection={async () => {
            platforms.setEtsyLoading(true)
            await platforms.checkEtsySession()
            platforms.setEtsyLoading(false)
          }}
        />
      </Panel>

      {/* Facebook Marketplace */}
      <Panel>
        <FacebookConnect
          facebookConnected={platforms.facebookConnected}
          facebookLoading={platforms.facebookLoading}
          onCheckConnection={async () => {
            platforms.setFacebookLoading(true)
            await platforms.checkFacebookSession()
            platforms.setFacebookLoading(false)
          }}
        />
      </Panel>

      {/* Depop */}
      <Panel>
        <DepopConnect
          depopConnected={platforms.depopConnected}
          depopLoading={platforms.depopLoading}
          onCheckConnection={async () => {
            platforms.setDepopLoading(true)
            await platforms.checkDepopSession()
            platforms.setDepopLoading(false)
          }}
        />
      </Panel>

      {/* Shopify */}
      <Panel>
        <ShopifyConnect
          shopifyConnected={platforms.shopifyConnected}
          shopifyName={platforms.shopifyName}
          shopifyDomain={platforms.shopifyDomain}
          shopifyLoading={platforms.shopifyLoading}
          shopifyError={platforms.shopifyError}
          shopifyFormOpen={platforms.shopifyFormOpen}
          shopifyFormData={platforms.shopifyFormData}
          onFormDataChange={platforms.setShopifyFormData}
          onConnect={platforms.handleShopifyConnect}
          onDisconnect={platforms.handleShopifyDisconnect}
          onOpenForm={() => platforms.setShopifyFormOpen(true)}
          onCloseForm={() => { platforms.setShopifyFormOpen(false); platforms.setShopifyFormData({ storeDomain: '' }) }}
        />
      </Panel>

      <InsightCard
        text="Connect Etsy to reach buyers looking specifically for vintage — your Laura Ashley and Pendleton pieces would perform significantly better there."
      />
    </div>
  )
}
