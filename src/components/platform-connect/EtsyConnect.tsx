'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, RefreshCw, Star } from 'lucide-react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { Badge } from '@/components/wren/Badge'
import { fetchApi } from '@/lib/api-utils'

const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'

interface ShopStats {
  connected: boolean
  shopName?: string | null
  starSeller?: {
    isStarSeller: boolean
    responseRate: number | null
    shippingOnTime: number | null
    reviewScore: number | null
    caseRate: number | null
  }
  stats?: {
    visits: number | null
    orders: number | null
    revenue: number | null
    conversionRate: number | null
    dateRange: string | null
  }
  updatedAt?: string | null
}

interface EtsyConnectProps {
  etsyConnected: boolean
  etsyLoading: boolean
  onCheckConnection: () => void
}

function StatCard({ label, value, suffix }: { label: string; value: number | null | undefined; suffix?: string }) {
  if (value == null) return null
  return (
    <div className="bg-cream-md rounded px-3 py-2 text-center min-w-[80px]">
      <div className="text-lg font-mono font-semibold text-ink">
        {suffix === '£' ? `£${value}` : suffix === '%' ? `${value}%` : value}
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

export function EtsyConnect({ etsyConnected, etsyLoading, onCheckConnection }: EtsyConnectProps) {
  const [shopStats, setShopStats] = useState<ShopStats | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Load cached stats on mount
  useEffect(() => {
    if (!etsyConnected) return
    fetchApi<ShopStats>('/api/etsy/shop-stats').then(setShopStats).catch(() => {})
  }, [etsyConnected])

  // Refresh: scrape via extension then save to API
  const handleRefresh = useCallback(async () => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return
    setRefreshing(true)
    try {
      const data = await new Promise<Record<string, unknown>>((resolve) => {
        const t = setTimeout(() => resolve({}), 30000)
        chrome.runtime.sendMessage(EXTENSION_ID, { action: 'get_etsy_shop_stats' }, (resp) => {
          clearTimeout(t)
          if (chrome.runtime.lastError) resolve({})
          else resolve(resp || {})
        })
      })

      // POST to API
      await fetch('/api/etsy/shop-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      // Refresh cached stats
      const updated = await fetchApi<ShopStats>('/api/etsy/shop-stats')
      setShopStats(updated)
    } finally {
      setRefreshing(false)
    }
  }, [])

  const ss = shopStats?.starSeller
  const st = shopStats?.stats

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          <MarketplaceIcon platform="etsy" size="lg" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-medium text-sm text-ink">
              {etsyConnected ? (
                <span className="flex items-center gap-1.5">
                  Etsy — Connected <CheckCircle2 size={15} className="text-green-600" />
                  {ss?.isStarSeller && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                      <Star size={10} className="fill-amber-500 text-amber-500" /> Star Seller
                    </span>
                  )}
                </span>
              ) : 'Etsy'}
            </div>
          </div>
          <div className="text-xs text-ink-lt">
            {etsyLoading ? 'Checking login...' : etsyConnected
              ? 'Ready to list your finds on Etsy'
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
            onClick={onCheckConnection}
            disabled={etsyLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition disabled:opacity-50"
          >
            {etsyLoading ? 'Checking...' : 'Check connection'}
          </button>
        </div>
      )}

      {etsyConnected && (
        <div className="space-y-3">
          {/* Shop stats */}
          {st && (st.visits != null || st.orders != null) && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-ink-lt uppercase tracking-wide">{st.dateRange || 'This month'}</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <StatCard label="Visits" value={st.visits} />
                <StatCard label="Orders" value={st.orders} />
                <StatCard label="Revenue" value={st.revenue} suffix="£" />
                <StatCard label="Conversion" value={st.conversionRate} suffix="%" />
              </div>
            </div>
          )}

          {/* Star seller metrics */}
          {ss && (ss.responseRate != null || ss.shippingOnTime != null || ss.reviewScore != null) && (
            <div>
              <div className="text-[10px] text-ink-lt uppercase tracking-wide mb-2">Star Seller Metrics</div>
              <div className="flex gap-2 flex-wrap">
                <StatCard label="Response" value={ss.responseRate} suffix="%" />
                <StatCard label="Shipping" value={ss.shippingOnTime} suffix="%" />
                <StatCard label="Reviews" value={ss.reviewScore} suffix="%" />
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

          {/* Info text */}
          {!st && !ss && (
            <div className="text-xs text-ink-lt bg-cream-md rounded p-3">
              Click &ldquo;Refresh stats&rdquo; to pull your shop metrics from Etsy.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
