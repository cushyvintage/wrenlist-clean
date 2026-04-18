'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { VintedDebugPanel } from '@/components/wren/VintedDebugPanel'
import { fetchApi } from '@/lib/api-utils'

const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'

interface VintedShopStats {
  connected: boolean
  username?: string | null
  feedbackScore?: number | null
  positiveReviews?: number | null
  negativeReviews?: number | null
  totalReviews?: number | null
  activeListings?: number | null
  totalItems?: number | null
  followers?: number | null
  completedSales?: number | null
  wallet?: {
    available?: number | null
    escrow?: number | null
    currency?: string | null
  }
  updatedAt?: string | null
}

interface VintedConnectProps {
  vintedConnected: boolean
  vintedUsername: string | null
  vintedIsBusiness?: boolean
  vintedLoading: boolean
  vintedSyncLoading: boolean
  vintedSyncResult: { updated: number; failed: number } | null
  vintedActionError: string | null
  extensionDetected: boolean | null
  isMobileOrNonChrome: boolean
  showDebug: boolean
  onVintedSync: () => void
  onDisconnect: () => void
}

function StatCard({ label, value, suffix }: { label: string; value: number | null | undefined; suffix?: string }) {
  if (value == null) return null
  return (
    <div className="bg-cream-md rounded px-3 py-2 text-center min-w-[80px]">
      <div className="text-lg font-mono font-semibold text-ink">
        {suffix === '%' ? `${value}%` : suffix === 'currency' ? value.toFixed(2) : value}
      </div>
      <div className="text-[10px] text-ink-lt uppercase tracking-wide">{label}</div>
    </div>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function VintedConnect({
  vintedConnected,
  vintedUsername,
  vintedIsBusiness = false,
  vintedLoading,
  vintedSyncLoading,
  vintedSyncResult,
  vintedActionError,
  extensionDetected,
  isMobileOrNonChrome,
  showDebug,
  onVintedSync,
  onDisconnect,
}: VintedConnectProps) {
  const [shopStats, setShopStats] = useState<VintedShopStats | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const accountTypeLabel = vintedIsBusiness ? 'Pro' : 'Personal'

  // Load cached stats on mount
  useEffect(() => {
    if (!vintedConnected) return
    fetchApi<VintedShopStats>('/api/vinted/shop-stats').then(setShopStats).catch(() => {})
  }, [vintedConnected])

  // Refresh: fetch from Vinted via extension, then save to API
  const handleRefreshStats = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
    setRefreshing(true)
    try {
      // 1. Fetch user profile
      const userResp = await new Promise<Record<string, unknown>>((resolve) => {
        const t = setTimeout(() => resolve({}), 15000)
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'fetch_vinted_api', url: 'https://www.vinted.co.uk/api/v2/users/current' },
          (resp) => { clearTimeout(t); resolve(resp && typeof resp === 'object' ? resp as Record<string, unknown> : {}) }
        )
      })

      // Extension returns { success, results: { user: {...}, code: ... } }
      const resultsRaw = (userResp as Record<string, unknown>).results as Record<string, unknown> | undefined
      const userData = (resultsRaw?.user as Record<string, unknown>) ?? resultsRaw
      const userId = userData?.id as number | undefined

      // 2. Fetch wallet balance (needs user ID)
      let walletData: Record<string, unknown> | undefined
      if (userId) {
        const walletResp = await new Promise<Record<string, unknown>>((resolve) => {
          const t = setTimeout(() => resolve({}), 15000)
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { action: 'fetch_vinted_api', url: `https://www.vinted.co.uk/api/v2/users/${userId}/balance` },
            (resp) => { clearTimeout(t); resolve(resp && typeof resp === 'object' ? resp as Record<string, unknown> : {}) }
          )
        })
        walletData = (walletResp as Record<string, unknown>).results as Record<string, unknown> | undefined
      }

      // 3. Fetch completed sales count
      const ordersResp = await new Promise<Record<string, unknown>>((resolve) => {
        const t = setTimeout(() => resolve({}), 15000)
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'fetch_vinted_api', url: 'https://www.vinted.co.uk/api/v2/my_orders?type=sold&status=completed' },
          (resp) => { clearTimeout(t); resolve(resp && typeof resp === 'object' ? resp as Record<string, unknown> : {}) }
        )
      })
      const ordersData = (ordersResp as Record<string, unknown>).results as Record<string, unknown> | undefined
      const pagination = ordersData?.pagination as Record<string, unknown> | undefined

      // Extract wallet amounts
      const userBalance = walletData?.user_balance as Record<string, unknown> | undefined
      const availableAmount = userBalance?.available_amount as Record<string, unknown> | undefined
      const escrowAmount = userBalance?.escrow_amount as Record<string, unknown> | undefined

      // Build payload
      const payload = {
        feedbackScore: userData?.feedback_reputation as number | undefined,
        positiveReviews: userData?.positive_feedback_count as number | undefined,
        negativeReviews: userData?.negative_feedback_count as number | undefined,
        totalReviews: userData?.feedback_count as number | undefined,
        activeListings: userData?.item_count as number | undefined,
        totalItems: userData?.total_items_count as number | undefined,
        followers: userData?.followers_count as number | undefined,
        completedSales: pagination?.total_entries as number | undefined,
        walletAvailable: availableAmount?.amount as number | undefined,
        walletEscrow: escrowAmount?.amount as number | undefined,
        walletCurrency: (availableAmount?.currency_code ?? escrowAmount?.currency_code) as string | undefined,
        rawJson: { userResp, walletData, ordersResp },
      }

      // POST to API
      await fetch('/api/vinted/shop-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // Refresh cached stats
      const updated = await fetchApi<VintedShopStats>('/api/vinted/shop-stats')
      setShopStats(updated)
    } finally {
      setRefreshing(false)
    }
  }, [])

  // State A: Not connected
  if (!vintedConnected) {
    return (
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
          <div className="text-sm text-amber">&#x26A0;</div>
          <div className="text-sm text-amber">
            <strong>Heads up about Vinted&apos;s Terms of Service</strong> — Vinted&apos;s ToS prohibit third-party automation tools.{' '}
            <a href="https://www.vinted.co.uk/terms-and-conditions" className="underline hover:no-underline">
              Read Vinted&apos;s terms &rarr;
            </a>
          </div>
        </div>

        <p className="text-xs text-ink-lt text-center">
          {vintedLoading || extensionDetected === null
            ? 'Checking status...'
            : extensionDetected
              ? 'Extension detected \u2713'
              : isMobileOrNonChrome
                ? 'Extension offline \u2014 open Chrome on your desktop to connect'
                : 'Extension not detected. Install it to continue.'}
        </p>
      </div>
    )
  }

  // Derived stats
  const feedbackPct = shopStats?.feedbackScore != null ? Math.round(shopStats.feedbackScore * 100) : null
  const walletCcy = shopStats?.wallet?.currency ?? 'GBP'
  const walletSymbol = walletCcy === 'GBP' ? '\u00A3' : walletCcy === 'EUR' ? '\u20AC' : walletCcy

  // State B: Connected
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-shrink-0">
          <MarketplaceIcon platform="vinted" size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-medium text-sm text-ink flex items-center gap-1.5">Vinted — Connected <CheckCircle2 size={15} className="text-green-600" /></div>
            {vintedLoading ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-cream-md text-ink-lt border border-border">
                &hellip;
              </span>
            ) : (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${
                  vintedIsBusiness
                    ? 'bg-sage/15 text-sage-dk border border-sage/30'
                    : 'bg-cream-md text-ink-lt border border-border'
                }`}
                title={vintedIsBusiness ? 'Vinted Pro (business) account \u2014 invoices are issued for sales' : 'Personal Vinted account'}
              >
                {accountTypeLabel}
              </span>
            )}
          </div>
          <div className="text-xs text-ink-lt">Account: {vintedUsername}</div>
        </div>
      </div>

      {/* Shop stats */}
      {shopStats && (shopStats.activeListings != null || shopStats.completedSales != null || shopStats.followers != null) && (
        <div className="mb-4">
          <div className="text-[10px] text-ink-lt uppercase tracking-wide mb-2">Shop Stats</div>
          <div className="flex gap-2 flex-wrap">
            <StatCard label="Feedback" value={feedbackPct} suffix="%" />
            <StatCard label="Reviews" value={shopStats.totalReviews} />
            <StatCard label="Active" value={shopStats.activeListings} />
            <StatCard label="Sold" value={shopStats.completedSales} />
            <StatCard label="Followers" value={shopStats.followers} />
          </div>
        </div>
      )}

      {/* Wallet balance */}
      {shopStats?.wallet && (shopStats.wallet.available != null || shopStats.wallet.escrow != null) && (
        <div className="mb-4">
          <div className="text-[10px] text-ink-lt uppercase tracking-wide mb-2">Wallet Balance</div>
          <div className="flex gap-2 flex-wrap">
            {shopStats.wallet.available != null && (
              <div className="bg-cream-md rounded px-3 py-2 text-center min-w-[80px]">
                <div className="text-lg font-mono font-semibold text-ink">
                  {walletSymbol}{Number(shopStats.wallet.available).toFixed(2)}
                </div>
                <div className="text-[10px] text-ink-lt uppercase tracking-wide">Available</div>
              </div>
            )}
            {shopStats.wallet.escrow != null && Number(shopStats.wallet.escrow) > 0 && (
              <div className="bg-cream-md rounded px-3 py-2 text-center min-w-[80px]">
                <div className="text-lg font-mono font-semibold text-ink">
                  {walletSymbol}{Number(shopStats.wallet.escrow).toFixed(2)}
                </div>
                <div className="text-[10px] text-ink-lt uppercase tracking-wide">In Escrow</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Refresh + last updated */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleRefreshStats}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sage border border-sage/30 rounded hover:bg-sage/5 transition disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Fetching stats...' : 'Refresh stats'}
        </button>
        {shopStats?.updatedAt && (
          <span className="text-[10px] text-ink-lt">Updated {timeAgo(shopStats.updatedAt)}</span>
        )}
      </div>

      {/* Info text when no stats yet */}
      {!shopStats?.activeListings && !shopStats?.completedSales && (
        <div className="text-xs text-ink-lt bg-cream-md rounded p-3 mb-4">
          Click &ldquo;Refresh stats&rdquo; to pull your shop metrics from Vinted.
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 p-4 bg-cream-md rounded mb-4">
        <div>
          <div className="text-xs font-medium text-ink-lt mb-1">Username</div>
          <div className="text-sm text-ink font-mono">{vintedUsername}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-ink-lt mb-1">Account type</div>
          <div className="text-sm text-ink">{accountTypeLabel}{vintedIsBusiness ? ' (business)' : ''}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-ink-lt mb-1">Platform</div>
          <div className="text-sm text-ink">Vinted UK</div>
        </div>
      </div>

      {vintedIsBusiness && (
        <div className="flex items-start gap-3 p-3 bg-sage/5 border border-sage/20 rounded mb-4 text-xs text-ink-lt">
          <span className="text-sage">&#x2139;</span>
          <div>
            <strong className="text-ink">Vinted Pro account detected.</strong> Pro sellers issue invoices on sales, so imported sales will include richer buyer + tax details than personal accounts.
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-3 border border-border rounded mb-4 text-xs text-ink-lt">
        <span className="text-sage mt-0.5">&#x2713;</span>
        <div>
          <div className="font-medium text-sm text-ink">Auto-sync enabled</div>
          <div className="mt-1">
            Wrenlist checks Vinted for new sales every 15 minutes while the desktop extension is running.
            When a sale is detected, the find is marked sold and any other marketplaces it&apos;s listed on
            are queued for automatic delisting.
          </div>
        </div>
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
          Import listings &rarr;
        </a>
        <button
          onClick={onVintedSync}
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
          onClick={onDisconnect}
          disabled={vintedLoading}
          className="px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition disabled:opacity-50"
        >
          {vintedLoading ? 'Disconnecting...' : 'Disconnect'}
        </button>
      </div>

      {showDebug && <VintedDebugPanel extensionId="nblnainobllgbjkdkpeodjpopkgnpfgb" />}
    </div>
  )
}
