'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { useApiCall } from '@/hooks/useApiCall'
import { fetchApi } from '@/lib/api-utils'
import type { Platform } from '@/types'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'

interface SoldItem {
  id: string
  name: string
  category: string
  cost_gbp: number | null
  sold_price_gbp: number | null
  sourced_at: string | null
  sold_at: string | null
  photo: string | null
  marketplace?: string
  margin_percent?: number
  days_listed?: number
  shipmentStatus?: string | null
  buyer?: string | null
  grossAmount?: number | null
  serviceFee?: number | null
  netAmount?: number | null
  trackingNumber?: string | null
}

interface Metrics {
  itemsSold: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  avgMargin: number
  avgPerItem: number
}

interface SoldResponse {
  items: SoldItem[]
  metrics: Metrics
  timeframe: string
}

const SHIPMENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
  'in transit': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'In Transit' },
  'label sent': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Label Sent' },
  shipped: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Shipped' },
  refunded: { bg: 'bg-red-100', text: 'text-red-800', label: 'Refunded' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
}

function ShipmentBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-ink-lt text-xs">--</span>
  const key = status.toLowerCase()
  const style = SHIPMENT_STYLES[key] || { bg: 'bg-cream', text: 'text-ink-lt', label: status }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

export default function SoldHistoryPage() {
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'all'>('month')
  const { data, isLoading, error, call } = useApiCall<SoldResponse>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Sold Items | Wrenlist'
  }, [])

  const loadSoldItems = useCallback(() => {
    call(() => fetchApi<SoldResponse>(`/api/sold?timeframe=${timeframe}`))
  }, [call, timeframe])

  useEffect(() => {
    loadSoldItems()
  }, [loadSoldItems])

  const items = data?.items ?? []
  const metrics = data?.metrics ?? null

  const handleSyncSales = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    setSyncMessage(null)

    try {
      // Ask extension for Vinted sales
      const sales = await new Promise<unknown[]>((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
          reject(new Error('Extension not available'))
          return
        }
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'get_vinted_sales', params: { perPage: 100 } },
          (response: Record<string, unknown> | undefined) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            if (!response?.success) {
              reject(new Error((response?.error as string) || 'Failed to fetch sales'))
              return
            }
            resolve((response.sales as unknown[]) || [])
          }
        )
      })

      if (!Array.isArray(sales) || sales.length === 0) {
        setSyncMessage('No new sales found')
        return
      }

      // Send to sync-sales API
      const syncData = await fetchApi<{
        synced: number
        created: number
        errors: number
        needsPhotoBackfill?: Array<{ findId: string; photos: string[] }>
      }>('/api/vinted/sync-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales }),
      })

      // Photo backfill for any finds with external URLs
      if (syncData.needsPhotoBackfill && syncData.needsPhotoBackfill.length > 0) {
        await fetchApi('/api/finds/photo-backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ finds: syncData.needsPhotoBackfill }),
        })
      }

      setSyncMessage(`Synced ${syncData.synced} items, created ${syncData.created} new`)
      loadSoldItems()
    } catch (err) {
      console.error('Sync failed:', err)
      setSyncMessage(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, loadSoldItems])

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '--'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    if (diffMs < 0) return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: '2-digit' })
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: '2-digit' })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-lg font-serif text-ink">sold history</h1>
          <p className="text-xs text-ink-lt mt-1">Track all sold items and profits</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncSales}
            disabled={isSyncing}
            className="px-3 py-1.5 text-xs font-medium rounded border border-sage text-sage hover:bg-sage hover:text-white transition disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Vinted Sales'}
          </button>
          {syncMessage && (
            <span className="text-xs text-ink-lt">{syncMessage}</span>
          )}
          <div className="flex gap-2 bg-cream rounded p-1">
            {(['month', 'quarter', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  timeframe === tf
                    ? 'bg-sage text-white'
                    : 'text-ink hover:bg-cream-dk'
                }`}
              >
                {tf === 'month' ? 'this month' : tf === 'quarter' ? '3 months' : 'all time'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-lt border border-red-dk/20 rounded p-3 text-sm text-red-dk">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8 text-ink-lt">Loading sold items...</div>
      )}

      {/* Stats grid */}
      {!isLoading && metrics && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="items sold"
            value={metrics.itemsSold.toString()}
            delta={`£${metrics.avgPerItem} avg per item`}
          />
          <StatCard
            label="total revenue"
            value={`£${metrics.totalRevenue.toLocaleString()}`}
            delta={`${metrics.itemsSold} ${metrics.itemsSold === 1 ? 'item' : 'items'}`}
          />
          <StatCard
            label="total profit"
            value={`£${metrics.totalProfit.toLocaleString()}`}
            delta={`after cost`}
          />
          <StatCard
            label="avg margin"
            value={`${metrics.avgMargin}%`}
            delta={`on ${timeframe}`}
          />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <Panel>
          <div className="py-12 text-center px-6">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sage-dim text-sm mb-4">No items sold yet</p>
            <p className="text-xs text-ink-lt mb-6">
              Items appear here when you mark them as sold or when sales sync from your marketplaces.
            </p>
            <Link
              href="/finds"
              className="inline-block px-4 py-2 bg-sage text-cream rounded text-sm font-medium hover:bg-sage-lt transition-colors"
            >
              Go to finds
            </Link>
          </div>
        </Panel>
      )}

      {/* Sold items table */}
      {!isLoading && items.length > 0 && (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-xs w-10"></th>
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-xs">item</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-xs">platform</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-xs">status</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-xs">buyer</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-lt text-xs">sold</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-lt text-xs">fees</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-lt text-xs">net</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-lt text-xs">margin</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-xs">date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border hover:bg-cream-md transition"
                  >
                    {/* Photo */}
                    <td className="px-3 py-2">
                      {item.photo ? (
                        <Image
                          src={item.photo}
                          alt=""
                          width={36}
                          height={36}
                          className="rounded object-cover"
                          style={{ width: 36, height: 36 }}
                          unoptimized
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-cream-dk" />
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-3 py-2 max-w-[200px]">
                      <Link
                        href={`/finds/${item.id}`}
                        className="font-medium text-sm text-sage hover:underline truncate block"
                      >
                        {item.name}
                      </Link>
                    </td>

                    {/* Platform */}
                    <td className="px-3 py-2">
                      {item.marketplace && item.marketplace !== 'unknown' ? (
                        <MarketplaceIcon platform={item.marketplace as Platform} size="sm" />
                      ) : (
                        <span className="text-ink-lt text-xs">--</span>
                      )}
                    </td>

                    {/* Shipment Status */}
                    <td className="px-3 py-2">
                      <ShipmentBadge status={item.shipmentStatus} />
                    </td>

                    {/* Buyer */}
                    <td className="px-3 py-2 text-ink-lt text-xs truncate max-w-[100px]">
                      {item.buyer || '--'}
                    </td>

                    {/* Sold price */}
                    <td className="px-3 py-2 text-right font-mono text-ink text-sm font-medium">
                      £{item.sold_price_gbp?.toFixed(2) || '--'}
                    </td>

                    {/* Fees */}
                    <td className="px-3 py-2 text-right font-mono text-xs text-ink-lt">
                      {item.serviceFee != null ? `−£${item.serviceFee.toFixed(2)}` : '--'}
                    </td>

                    {/* Net */}
                    <td className="px-3 py-2 text-right font-mono text-sm text-ink">
                      {item.netAmount != null ? `£${item.netAmount.toFixed(2)}` : '--'}
                    </td>

                    {/* Margin */}
                    <td className="px-3 py-2 text-right text-sm font-mono">
                      <span className={item.margin_percent && item.margin_percent > 0 ? 'text-green-600' : 'text-ink-lt'}>
                        {item.margin_percent != null ? `${item.margin_percent}%` : '--'}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 text-ink-lt text-xs">{formatDate(item.sold_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  )
}
