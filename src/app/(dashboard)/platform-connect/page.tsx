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
import { DebugLogsButton } from '@/components/platform-connect/DebugLogsButton'
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

      {/* Debug logs exporter — fetches _debugLogs from extension and offers
          a JSON download. Hidden on mobile where the extension can't run.
          Only shown to devs (NODE_ENV=development) or when ?debug is in the URL
          — end-users don't need this in the default connection flow. */}
      {!isMobileOrNonChrome && showDebug && (
        <div className="px-1">
          <DebugLogsButton extensionDetected={extensionDetected} />
        </div>
      )}

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
          onPolicyChange={(field, value) => platforms.setEbaySelectedPolicies({ ...platforms.ebaySelectedPolicies, [field]: value })}
          onSaveEbayPolicies={async () => {
            const ok = await platforms.handleSaveEbayPolicies()
            if (ok) setEbayChangingPolicies(false)
          }}
          onChangePoliciesClick={() => { platforms.setEbaySelectedPolicies({}); setEbayChangingPolicies(true) }}
        />
      </Panel>

      {/* Vinted */}
      <Panel>
        <VintedConnect
          vintedConnected={platforms.vintedConnected}
          vintedDetected={platforms.vintedDetected}
          vintedUsername={platforms.vintedUsername}
          vintedIsBusiness={platforms.vintedIsBusiness}
          vintedLoading={platforms.vintedLoading}
          vintedSyncLoading={platforms.vintedSyncLoading}
          vintedSyncResult={platforms.vintedSyncResult}
          vintedActionError={platforms.vintedActionError}
          extensionDetected={extensionDetected}
          isMobileOrNonChrome={isMobileOrNonChrome}
          showDebug={showDebug}
          onConnect={platforms.handleVintedConnect}
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
          etsyDetected={platforms.etsyDetected}
          etsyUsername={platforms.etsyUsername}
          etsyLoading={platforms.etsyLoading}
          onConnect={platforms.handleEtsyConnect}
          onDisconnect={platforms.handleEtsyDisconnect}
        />
      </Panel>

      {/* Facebook Marketplace */}
      <Panel>
        <FacebookConnect
          facebookConnected={platforms.facebookConnected}
          facebookDetected={platforms.facebookDetected}
          facebookUsername={platforms.facebookUsername}
          facebookLoading={platforms.facebookLoading}
          onConnect={platforms.handleFacebookConnect}
          onDisconnect={platforms.handleFacebookDisconnect}
        />
      </Panel>

      {/* Depop */}
      <Panel>
        <DepopConnect
          depopConnected={platforms.depopConnected}
          depopDetected={platforms.depopDetected}
          depopUsername={platforms.depopUsername}
          depopLoading={platforms.depopLoading}
          onConnect={platforms.handleDepopConnect}
          onDisconnect={platforms.handleDepopDisconnect}
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
