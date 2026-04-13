'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { Badge } from '@/components/wren/Badge'
import { fetchApi } from '@/lib/api-utils'

const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'

interface DepopShopStats {
  connected: boolean
  username?: string | null
  netEarnings30d?: number | null
  grossSales30d?: number | null
  itemsSold30d?: number | null
  verified?: boolean | null
  updatedAt?: string | null
}

interface DepopConnectProps {
  depopConnected: boolean
  depopLoading: boolean
  onCheckConnection: () => void
}

function StatCard({ label, value, suffix }: { label: string; value: number | null | undefined; suffix?: string }) {
  if (value == null) return null
  return (
    <div className="bg-cream-md rounded px-3 py-2 text-center min-w-[80px]">
      <div className="text-lg font-mono font-semibold text-ink">
        {suffix === '£' ? `£${typeof value === 'number' ? value.toFixed(2) : value}` : value}
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

export function DepopConnect({ depopConnected, depopLoading, onCheckConnection }: DepopConnectProps) {
  const [shopStats, setShopStats] = useState<DepopShopStats | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Load cached stats on mount
  useEffect(() => {
    if (!depopConnected) return
    fetchApi<DepopShopStats>('/api/depop/shop-stats').then(setShopStats).catch(() => {})
  }, [depopConnected])

  // Refresh: fetch from Depop via extension, then save to API
  const handleRefresh = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
    setRefreshing(true)
    try {
      const now = Math.floor(Date.now() / 1000)
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60

      const depopFetchViaExtension = (url: string): Promise<Record<string, unknown>> =>
        new Promise((resolve) => {
          const t = setTimeout(() => resolve({}), 15000)
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { action: 'fetch_depop_api', url },
            (resp) => {
              clearTimeout(t)
              if (chrome.runtime.lastError) resolve({})
              else resolve(resp && typeof resp === 'object' ? resp as Record<string, unknown> : {})
            }
          )
        })

      // 1. User profile
      const profileResp = await depopFetchViaExtension('https://webapi.depop.com/api/v1/users/me/')
      const profileData = (profileResp as Record<string, unknown>).results as Record<string, unknown> | undefined

      // 2. Net earnings (30d)
      const netGmvResp = await depopFetchViaExtension(
        `https://webapi.depop.com/presentation/api/v1/analytics/sellers/historical/net_gmv/?window=monthly&from=${thirtyDaysAgo}&to=${now}`
      )
      const netGmvData = (netGmvResp as Record<string, unknown>).results as Record<string, unknown> | undefined

      // 3. Gross sales (30d)
      const gmvResp = await depopFetchViaExtension(
        `https://webapi.depop.com/presentation/api/v1/analytics/sellers/historical/gmv/?window=monthly&from=${thirtyDaysAgo}&to=${now}`
      )
      const gmvData = (gmvResp as Record<string, unknown>).results as Record<string, unknown> | undefined

      // 4. Items sold (30d)
      const itemsSoldResp = await depopFetchViaExtension(
        `https://webapi.depop.com/presentation/api/v1/analytics/sellers/historical/items_sold/?window=monthly&from=${thirtyDaysAgo}&to=${now}`
      )
      const itemsSoldData = (itemsSoldResp as Record<string, unknown>).results as Record<string, unknown> | undefined

      // Extract totals from analytics responses
      const netTotals = (netGmvData?.totals as Array<Record<string, unknown>> | undefined)?.[0]
      const gmvTotals = (gmvData?.totals as Array<Record<string, unknown>> | undefined)?.[0]
      const soldTotals = (itemsSoldData?.totals as Array<Record<string, unknown>> | undefined)?.[0]

      const payload = {
        netEarnings30d: netTotals?.value as number | undefined,
        grossSales30d: gmvTotals?.value as number | undefined,
        itemsSold30d: soldTotals?.value as number | undefined,
        username: profileData?.username as string | undefined,
        verified: profileData?.verified as boolean | undefined,
        rawJson: { profileResp, netGmvResp, gmvResp, itemsSoldResp },
      }

      // POST to API
      await fetch('/api/depop/shop-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // Refresh cached stats
      const updated = await fetchApi<DepopShopStats>('/api/depop/shop-stats')
      setShopStats(updated)
    } finally {
      setRefreshing(false)
    }
  }, [])

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          <MarketplaceIcon platform="depop" size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-ink">
              {depopConnected ? (
                <span className="flex items-center gap-1.5">
                  Depop — Connected <CheckCircle2 size={15} className="text-green-600" />
                  {shopStats?.verified && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                      Verified
                    </span>
                  )}
                </span>
              ) : 'Depop'}
            </div>
          </div>
          <div className="text-xs text-ink-lt">
            {depopLoading ? 'Checking login...' : depopConnected
              ? (shopStats?.username ? `@${shopStats.username}` : 'Ready to list your finds on Depop')
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
            Log in to Depop &rarr;
          </a>
          <button
            onClick={onCheckConnection}
            disabled={depopLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {depopLoading ? 'Checking...' : 'Check connection'}
          </button>
        </div>
      )}

      {depopConnected && (
        <div className="space-y-3">
          {/* Shop stats */}
          {shopStats && (shopStats.netEarnings30d != null || shopStats.grossSales30d != null || shopStats.itemsSold30d != null) && (
            <div>
              <div className="text-[10px] text-ink-lt uppercase tracking-wide mb-2">Last 30 days</div>
              <div className="flex gap-2 flex-wrap">
                <StatCard label="Net Earnings" value={shopStats.netEarnings30d} suffix="£" />
                <StatCard label="Gross Sales" value={shopStats.grossSales30d} suffix="£" />
                <StatCard label="Items Sold" value={shopStats.itemsSold30d} />
              </div>
            </div>
          )}

          {/* Refresh + last updated */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
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
          {!shopStats?.netEarnings30d && !shopStats?.grossSales30d && !shopStats?.itemsSold30d && (
            <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
              Click &ldquo;Refresh stats&rdquo; to pull your shop metrics from Depop.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
