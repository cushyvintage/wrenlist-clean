'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
  margin_percent?: number | null
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

/* ── Shipment helpers ─────────────────────────────────────────── */

const SHIPMENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  delivered: { bg: 'bg-green-100', text: 'text-green-800', label: 'Delivered' },
  'in transit': { bg: 'bg-amber-100', text: 'text-amber-800', label: 'In Transit' },
  'label sent': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Label Sent' },
  shipped: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Shipped' },
  refunded: { bg: 'bg-red-100', text: 'text-red-800', label: 'Refunded' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelled' },
}

/** Statuses that mean the order still needs seller action */
const NEEDS_ACTION_STATUSES = new Set([null, undefined, '', 'label sent', 'shipped', 'in transit'])

function normalizeStatus(raw: string | null | undefined): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  // Vinted sends verbose strings like "Package delivered."
  if (lower.includes('delivered')) return 'delivered'
  if (lower.includes('transit')) return 'in transit'
  if (lower.includes('label')) return 'label sent'
  if (lower.includes('shipped') || lower.includes('sent')) return 'shipped'
  if (lower.includes('refund')) return 'refunded'
  if (lower.includes('cancel')) return 'cancelled'
  return lower
}

function needsAction(item: SoldItem): boolean {
  const status = normalizeStatus(item.shipmentStatus)
  return NEEDS_ACTION_STATUSES.has(status)
}

function ShipmentBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-ink-lt text-xs">Awaiting shipment</span>
  const key = normalizeStatus(status) || status.toLowerCase()
  const style = SHIPMENT_STYLES[key] || { bg: 'bg-cream', text: 'text-ink-lt', label: status }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

/* ── Needs Action Card ────────────────────────────────────────── */

function OrderCard({
  item,
  onUpdateStatus,
  formatDate,
}: {
  item: SoldItem
  onUpdateStatus: (id: string, status: string, trackingNumber?: string) => Promise<void>
  formatDate: (d: string | null) => string
}) {
  const router = useRouter()
  const [showTracking, setShowTracking] = useState(false)
  const [trackingInput, setTrackingInput] = useState(item.trackingNumber || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleAction = async (status: string, tracking?: string) => {
    setIsUpdating(true)
    try {
      await onUpdateStatus(item.id, status, tracking)
      setShowTracking(false)
    } finally {
      setIsUpdating(false)
    }
  }

  const normalized = normalizeStatus(item.shipmentStatus)

  return (
    <div className="border border-border rounded-md bg-white p-4 flex flex-col gap-3">
      {/* Top row: photo + details */}
      <div className="flex gap-3">
        <div
          className="shrink-0 cursor-pointer"
          onClick={() => router.push(`/sold/${item.id}`)}
        >
          {item.photo ? (
            <Image
              src={item.photo}
              alt=""
              width={56}
              height={56}
              className="rounded object-cover"
              style={{ width: 56, height: 56 }}
              unoptimized
            />
          ) : (
            <div className="w-14 h-14 rounded bg-cream-dk" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="font-medium text-sm text-sage truncate cursor-pointer hover:underline"
            onClick={() => router.push(`/sold/${item.id}`)}
          >
            {item.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {item.marketplace && item.marketplace !== 'unknown' && (
              <MarketplaceIcon platform={item.marketplace as Platform} size="sm" />
            )}
            <span className="text-ink-lt text-xs">{item.buyer || 'Unknown buyer'}</span>
            <span className="text-ink-lt text-xs">{formatDate(item.sold_at)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <ShipmentBadge status={item.shipmentStatus} />
            {item.trackingNumber && (
              <span className="text-[11px] text-ink-lt font-mono truncate max-w-[140px]" title={item.trackingNumber}>
                {item.trackingNumber}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-sm font-medium text-ink">
            {item.sold_price_gbp != null ? `£${item.sold_price_gbp.toFixed(2)}` : '--'}
          </p>
          {item.netAmount != null && item.netAmount !== item.sold_price_gbp && (
            <p className="font-mono text-[11px] text-ink-lt">
              net £{item.netAmount.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      {/* Tracking input */}
      {showTracking && (
        <div className="flex gap-2">
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            placeholder="Tracking number"
            className="flex-1 px-2 py-1.5 text-xs border border-border rounded bg-cream focus:outline-none focus:border-sage"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trackingInput.trim()) {
                handleAction('shipped', trackingInput.trim())
              }
            }}
            autoFocus
          />
          <button
            onClick={() => handleAction('shipped', trackingInput.trim())}
            disabled={!trackingInput.trim() || isUpdating}
            className="px-3 py-1.5 text-xs font-medium rounded bg-sage text-white hover:bg-sage-lt transition disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => setShowTracking(false)}
            className="px-2 py-1.5 text-xs text-ink-lt hover:text-ink transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!showTracking && (
        <div className="flex gap-2 flex-wrap">
          {(!normalized || normalized === 'label sent') && (
            <button
              onClick={() => setShowTracking(true)}
              disabled={isUpdating}
              className="px-3 py-1.5 text-xs font-medium rounded border border-sage text-sage hover:bg-sage hover:text-white transition disabled:opacity-50"
            >
              Add Tracking
            </button>
          )}
          {(!normalized || normalized === 'label sent') && (
            <button
              onClick={() => handleAction('shipped')}
              disabled={isUpdating}
              className="px-3 py-1.5 text-xs font-medium rounded border border-ink-lt/30 text-ink-lt hover:border-sage hover:text-sage transition disabled:opacity-50"
            >
              Mark Shipped
            </button>
          )}
          {(normalized === 'shipped' || normalized === 'in transit') && (
            <button
              onClick={() => handleAction('delivered')}
              disabled={isUpdating}
              className="px-3 py-1.5 text-xs font-medium rounded border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition disabled:opacity-50"
            >
              Mark Delivered
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────── */

export default function SoldHistoryPage() {
  const router = useRouter()
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'tax_year' | 'last_tax_year' | 'all'>('month')
  const { data, isLoading, error, call } = useApiCall<SoldResponse>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [showAllAction, setShowAllAction] = useState(false)

  const loadSoldItems = useCallback(() => {
    call(() => fetchApi<SoldResponse>(`/api/sold?timeframe=${timeframe}`))
  }, [call, timeframe])

  useEffect(() => {
    loadSoldItems()
  }, [loadSoldItems])

  const allItems = data?.items ?? []
  const metrics = data?.metrics ?? null

  // Split into needs-action vs completed
  const actionItems = allItems
    .filter(needsAction)
    .sort((a, b) => new Date(a.sold_at || 0).getTime() - new Date(b.sold_at || 0).getTime())
  const completedItems = allItems.filter((item) => !needsAction(item))

  /* ── Shipment status update handler ──────────────────────── */

  const handleUpdateShipment = useCallback(async (findId: string, shipmentStatus: string, trackingNumber?: string) => {
    const body: Record<string, string> = { shipmentStatus }
    if (trackingNumber) body.trackingNumber = trackingNumber

    await fetchApi(`/api/sold/${findId}/shipment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Reload to reflect changes
    loadSoldItems()
  }, [loadSoldItems])

  /* ── Vinted sync handlers (unchanged) ────────────────────── */

  const handleSyncSales = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    setSyncMessage(null)

    try {
      const sales = await new Promise<unknown[]>((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
          reject(new Error('Extension not available'))
          return
        }
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'get_vinted_sales', params: { perPage: 100, enrich: true } },
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

  const handleBackfillAddresses = useCallback(async () => {
    if (isBackfilling) return
    setIsBackfilling(true)
    setSyncMessage(null)

    try {
      const sales = await new Promise<unknown[]>((resolve, reject) => {
        if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
          reject(new Error('Extension not available'))
          return
        }
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'get_vinted_sales', params: { pages: 10, perPage: 100, enrich: true } },
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
        setSyncMessage('No sales found to backfill')
        return
      }

      const syncData = await fetchApi<{ synced: number; created: number; errors: number }>(
        '/api/vinted/sync-sales',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sales }) }
      )

      setSyncMessage(`Backfilled ${sales.length} sales — ${syncData.synced} updated, ${syncData.created} new`)
      loadSoldItems()
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setIsBackfilling(false)
    }
  }, [isBackfilling, loadSoldItems])

  /* ── Date formatter ──────────────────────────────────────── */

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl italic text-ink">sold</h1>
          <p className="text-xs text-ink-lt mt-1">Orders, fulfilment, and profit tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncSales}
            disabled={isSyncing}
            className="px-3 py-1.5 text-xs font-medium rounded border border-sage text-sage hover:bg-sage hover:text-white transition disabled:opacity-50"
          >
            {isSyncing ? 'Syncing...' : 'Sync Vinted Sales'}
          </button>
          <button
            onClick={handleBackfillAddresses}
            disabled={isBackfilling}
            className="px-3 py-1.5 text-xs font-medium rounded border border-ink-lt/30 text-ink-lt hover:border-sage hover:text-sage transition disabled:opacity-50"
          >
            {isBackfilling ? 'Backfilling...' : 'Backfill addresses'}
          </button>
          {syncMessage && (
            <span className="text-xs text-ink-lt">{syncMessage}</span>
          )}
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

      {/* ── Needs Action section ─────────────────────────────── */}
      {!isLoading && actionItems.length > 0 && (() => {
        const PREVIEW_COUNT = 6
        const visibleActions = showAllAction ? actionItems : actionItems.slice(0, PREVIEW_COUNT)
        const hasMore = actionItems.length > PREVIEW_COUNT
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">
                Needs action
              </h2>
              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold min-w-[20px]">
                {actionItems.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {visibleActions.map((item) => (
                <OrderCard
                  key={item.id}
                  item={item}
                  onUpdateStatus={handleUpdateShipment}
                  formatDate={formatDate}
                />
              ))}
            </div>
            {hasMore && (
              <button
                onClick={() => setShowAllAction(!showAllAction)}
                className="text-xs text-sage hover:text-sage-lt transition font-medium"
              >
                {showAllAction ? 'Show less' : `Show all ${actionItems.length} orders`}
              </button>
            )}
          </div>
        )
      })()}

      {/* ── Stats grid (metrics for all items) ───────────────── */}
      {!isLoading && metrics && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">
              Performance
            </h2>
            <div className="flex gap-1 bg-cream rounded p-1 flex-wrap">
              {([
                ['month', 'this month'],
                ['quarter', '3 months'],
                ['tax_year', 'tax year'],
                ['last_tax_year', 'last tax year'],
                ['all', 'all time'],
              ] as const).map(([tf, label]) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition whitespace-nowrap ${
                    timeframe === tf
                      ? 'bg-sage text-white'
                      : 'text-ink hover:bg-cream-dk'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              delta="after cost"
            />
            <StatCard
              label="avg margin"
              value={`${metrics.avgMargin}%`}
              delta={`on ${timeframe}`}
            />
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────── */}
      {!isLoading && allItems.length === 0 && (
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

      {/* ── Sold History table ────────────────────────────────── */}
      {!isLoading && allItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">
            Sold history
          </h2>
          <Panel className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em] w-10"></th>
                    <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Item</th>
                    <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Platform</th>
                    <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Buyer</th>
                    <th className="px-3 py-2 text-right font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Sold</th>
                    <th className="px-3 py-2 text-right font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Fees</th>
                    <th className="px-3 py-2 text-right font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Net</th>
                    <th className="px-3 py-2 text-right font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Margin</th>
                    <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border hover:bg-cream-md transition cursor-pointer"
                      onClick={() => router.push(`/sold/${item.id}`)}
                    >
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
                      <td className="px-3 py-2 max-w-[200px]">
                        <span className="font-medium text-sm text-sage truncate block">
                          {item.name}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {item.marketplace && item.marketplace !== 'unknown' ? (
                          <MarketplaceIcon platform={item.marketplace as Platform} size="sm" />
                        ) : (
                          <span className="text-ink-lt text-xs">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <ShipmentBadge status={item.shipmentStatus} />
                      </td>
                      <td className="px-3 py-2 text-ink-lt text-xs truncate max-w-[100px]">
                        {item.buyer || '--'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-ink text-sm font-medium">
                        £{item.sold_price_gbp?.toFixed(2) || '--'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-ink-lt">
                        {item.serviceFee != null && item.serviceFee > 0 && item.grossAmount != null && item.netAmount != null && item.grossAmount !== item.netAmount
                          ? `−£${item.serviceFee.toFixed(2)}`
                          : '--'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-sm text-ink">
                        {item.netAmount != null ? `£${item.netAmount.toFixed(2)}` : '--'}
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-mono">
                        <span className={item.margin_percent && item.margin_percent > 0 ? 'text-green-600' : 'text-ink-lt'}>
                          {item.margin_percent != null ? `${item.margin_percent}%` : '--'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-lt text-xs">{formatDate(item.sold_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
