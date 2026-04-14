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
import { ShippingLabelModal } from '@/components/sold/ShippingLabelModal'
import { useConfirm } from '@/components/wren/ConfirmProvider'

interface SoldItem {
  id: string
  name: string
  category: string
  cost_gbp: number | null
  sold_price_gbp: number | null
  sourced_at: string | null
  sold_at: string | null
  photo: string | null
  stashId?: string | null
  stashName?: string | null
  marketplace?: string
  margin_percent?: number | null
  days_listed?: number
  shipmentStatus?: string | null
  buyer?: string | null
  grossAmount?: number | null
  serviceFee?: number | null
  netAmount?: number | null
  trackingNumber?: string | null
  transactionId?: string | null
  shipmentId?: string | null
  labelUrl?: string | null
  autoImported?: boolean
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
  delivered: { bg: 'bg-status-success-bg', text: 'text-status-success', label: 'Delivered' },
  'in transit': { bg: 'bg-status-warning-bg', text: 'text-status-warning', label: 'In Transit' },
  'awaiting collection': { bg: 'bg-status-warning-bg', text: 'text-status-warning', label: 'Awaiting Collection' },
  'label sent': { bg: 'bg-status-info-bg', text: 'text-status-info', label: 'Label Sent' },
  'not sent': { bg: 'bg-status-warning-bg', text: 'text-status-warning', label: 'Not Sent' },
  shipped: { bg: 'bg-status-warning-bg', text: 'text-status-warning', label: 'Shipped' },
  returning: { bg: 'bg-status-error-bg', text: 'text-status-error', label: 'Returning' },
  refunded: { bg: 'bg-status-error-bg', text: 'text-status-error', label: 'Refunded' },
  cancelled: { bg: 'bg-status-error-bg', text: 'text-status-error', label: 'Cancelled' },
}

/** Statuses where the seller still needs to take action */
const NEEDS_ACTION_STATUSES = new Set(['label sent', 'not sent'])

/** Statuses that are definitively resolved — never show as "needs action" */
const RESOLVED_STATUSES = new Set(['delivered', 'refunded', 'cancelled'])

/** How many days after sale before we stop treating null-status as "needs action" */
const NEEDS_ACTION_WINDOW_DAYS = 5

function normalizeStatus(raw: string | null | undefined): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  // Vinted sends verbose strings like "Package delivered.", "Not sent. Buyer refunded."
  // Order matters — check compound statuses first before single-word matches
  if (lower.includes('not sent')) return 'not sent'
  if (lower.includes('delivered')) return 'delivered'
  if (lower.includes('cancel')) return 'cancelled'
  if (lower.includes('refund')) return 'refunded'
  if (lower.includes('return')) return 'returning'
  if (lower.includes('transit') || lower.includes('on its way')) return 'in transit'
  if (lower.includes('post office') || lower.includes('collection')) return 'awaiting collection'
  if (lower.includes('label')) return 'label sent'
  if (lower.includes('shipped') || lower.includes('sent')) return 'shipped'
  return lower
}

function needsAction(item: SoldItem): boolean {
  const status = normalizeStatus(item.shipmentStatus)
  // Resolved statuses never need action
  if (status !== null && RESOLVED_STATUSES.has(status)) return false
  // Known actionable statuses
  if (status !== null) return NEEDS_ACTION_STATUSES.has(status)
  // Null status: only needs action if sold recently (within window)
  if (!item.sold_at) return false
  const daysSinceSale = (Date.now() - new Date(item.sold_at).getTime()) / (1000 * 60 * 60 * 24)
  return daysSinceSale <= NEEDS_ACTION_WINDOW_DAYS
}

function ShipmentBadge({ status, soldAt }: { status: string | null | undefined; soldAt?: string | null }) {
  if (!status) {
    // No shipment data — if recent sale, show "Not Sent"; otherwise "No tracking"
    if (soldAt) {
      const daysSinceSale = (Date.now() - new Date(soldAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceSale <= NEEDS_ACTION_WINDOW_DAYS) {
        const style = SHIPMENT_STYLES['not sent']!
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        )
      }
    }
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-cream text-ink-lt">
        No tracking
      </span>
    )
  }
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
  onGenerateLabel,
  formatDate,
}: {
  item: SoldItem
  onUpdateStatus: (id: string, status: string, trackingNumber?: string, carrier?: string) => Promise<void>
  onGenerateLabel?: (item: SoldItem) => void
  formatDate: (d: string | null) => string
}) {
  const router = useRouter()
  const [showTracking, setShowTracking] = useState(false)
  const [trackingInput, setTrackingInput] = useState(item.trackingNumber || '')
  const [carrierInput, setCarrierInput] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const isEbay = item.marketplace === 'ebay'

  const handleAction = async (status: string, tracking?: string) => {
    setIsUpdating(true)
    try {
      await onUpdateStatus(item.id, status, tracking, carrierInput || undefined)
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
            {item.autoImported && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-teal-50 text-teal-700">
                Auto-imported
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <ShipmentBadge status={item.shipmentStatus} soldAt={item.sold_at} />
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
        <div className="flex flex-col gap-2">
          {isEbay && (
            <select
              value={carrierInput}
              onChange={(e) => setCarrierInput(e.target.value)}
              className="px-2 py-1.5 text-xs border border-border rounded bg-cream focus:outline-none focus:border-sage"
            >
              <option value="">Carrier (optional)</option>
              <option value="Royal Mail">Royal Mail</option>
              <option value="Evri">Evri</option>
              <option value="DPD">DPD</option>
              <option value="DHL">DHL</option>
              <option value="Yodel">Yodel</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="Parcelforce">Parcelforce</option>
              <option value="Other">Other</option>
            </select>
          )}
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
          {onGenerateLabel && item.marketplace === 'vinted' && !item.labelUrl && (
            <button
              onClick={() => onGenerateLabel(item)}
              className="px-3 py-1.5 text-xs font-medium rounded border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition"
            >
              Generate Label
            </button>
          )}
          {isEbay && item.transactionId && (!normalized || normalized === 'not sent' || normalized === 'label sent') && (
            <a
              href={`https://www.ebay.co.uk/sh/ord/details?orderid=${encodeURIComponent(item.transactionId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white transition inline-block"
            >
              Ship on eBay
            </a>
          )}
          {item.labelUrl && (
            <a
              href={item.labelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium rounded border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition inline-block"
            >
              View Label
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Chunked sync helper (avoids Vercel 413 on large payloads) ── */

const SYNC_CHUNK_SIZE = 50

async function syncSalesInChunks(sales: unknown[]): Promise<{ synced: number; created: number; errors: number; needsPhotoBackfill: Array<{ findId: string; photos: string[] }> }> {
  let totalSynced = 0, totalCreated = 0, totalErrors = 0
  const allPhotoBackfill: Array<{ findId: string; photos: string[] }> = []

  for (let i = 0; i < sales.length; i += SYNC_CHUNK_SIZE) {
    const chunk = sales.slice(i, i + SYNC_CHUNK_SIZE)
    const result = await fetchApi<{
      synced: number
      created: number
      errors: number
      needsPhotoBackfill?: Array<{ findId: string; photos: string[] }>
    }>('/api/vinted/sync-sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: chunk }),
    })
    totalSynced += result.synced
    totalCreated += result.created
    totalErrors += result.errors
    if (result.needsPhotoBackfill) allPhotoBackfill.push(...result.needsPhotoBackfill)
  }

  return { synced: totalSynced, created: totalCreated, errors: totalErrors, needsPhotoBackfill: allPhotoBackfill }
}

/* ── Main Page ────────────────────────────────────────────────── */

export default function SoldHistoryPage() {
  const router = useRouter()
  const confirm = useConfirm()
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'tax_year' | 'last_tax_year' | 'all'>('month')
  const { data, isLoading, error, call } = useApiCall<SoldResponse>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [showAllAction, setShowAllAction] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [actionView, setActionView] = useState<'cards' | 'picklist'>('cards')

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Label modal state
  const [labelModalOpen, setLabelModalOpen] = useState(false)
  const [labelOrder, setLabelOrder] = useState<SoldItem | null>(null)

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

  // Filter history table items
  const filteredItems = allItems.filter((item) => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterPlatform !== 'all' && item.marketplace !== filterPlatform) return false
    if (filterStatus === 'awaiting' && normalizeStatus(item.shipmentStatus) !== null) return false
    if (filterStatus === 'delivered' && normalizeStatus(item.shipmentStatus) !== 'delivered') return false
    if (filterStatus === 'shipped' && !['shipped', 'in transit'].includes(normalizeStatus(item.shipmentStatus) || '')) return false
    return true
  })

  // Unique platforms for filter dropdown
  const platforms = [...new Set(allItems.map((i) => i.marketplace).filter((m) => m && m !== 'unknown'))]

  /* ── Shipment status update handler ──────────────────────── */

  const handleUpdateShipment = useCallback(async (findId: string, shipmentStatus: string, trackingNumber?: string, carrier?: string) => {
    const body: Record<string, string> = { shipmentStatus }
    if (trackingNumber) body.trackingNumber = trackingNumber
    if (carrier) body.carrier = carrier

    await fetchApi(`/api/sold/${findId}/shipment`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    // Reload to reflect changes
    loadSoldItems()
  }, [loadSoldItems])

  /* ── Bulk mark all delivered ───────────────────────────────── */

  const handleBulkDelivered = useCallback(async () => {
    if (isBulkUpdating || actionItems.length === 0) return
    const ok = await confirm({
      title: 'Mark all as delivered?',
      message: `This will mark all ${actionItems.length} outstanding orders as delivered.`,
      confirmLabel: 'Mark delivered',
    })
    if (!ok) return

    setIsBulkUpdating(true)
    try {
      await fetchApi('/api/sold/bulk-shipment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          findIds: actionItems.map((i) => i.id),
          shipmentStatus: 'delivered',
        }),
      })
      loadSoldItems()
    } catch (err) {
      console.error('Bulk update failed:', err)
    } finally {
      setIsBulkUpdating(false)
    }
  }, [isBulkUpdating, actionItems, loadSoldItems, confirm])

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
          { action: 'get_vinted_sales', params: { pages: 4, perPage: 100, enrich: false } },
          (response: Record<string, unknown> | undefined) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            if (!response?.success) {
              reject(new Error((response?.message as string) || (response?.error as string) || 'Failed to fetch sales'))
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

      const syncData = await syncSalesInChunks(sales)

      if (syncData.needsPhotoBackfill.length > 0) {
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
          { action: 'get_vinted_sales', params: { pages: 4, perPage: 100, enrich: true } },
          (response: Record<string, unknown> | undefined) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
            if (!response?.success) {
              reject(new Error((response?.message as string) || (response?.error as string) || 'Failed to fetch sales'))
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

      const syncData = await syncSalesInChunks(sales)

      setSyncMessage(`Backfilled ${sales.length} sales — ${syncData.synced} updated, ${syncData.created} new`)
      loadSoldItems()
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setIsBackfilling(false)
    }
  }, [isBackfilling, loadSoldItems])

  /* ── eBay sync handler ─────────────────────────────────── */

  const [isEbaySyncing, setIsEbaySyncing] = useState(false)

  const handleEbaySync = useCallback(async () => {
    if (isEbaySyncing) return
    setIsEbaySyncing(true)
    setSyncMessage(null)

    try {
      const result = await fetchApi<{
        ordersChecked: number
        itemsSold: number
        enriched: number
        message: string
      }>('/api/ebay/sync-orders', { method: 'POST' })

      setSyncMessage(result.message || `Checked ${result.ordersChecked} orders, ${result.itemsSold} new sales`)
      if (result.itemsSold > 0 || result.enriched > 0) {
        loadSoldItems()
      }
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'eBay sync failed')
    } finally {
      setIsEbaySyncing(false)
    }
  }, [isEbaySyncing, loadSoldItems])

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
          <p className="text-xs text-ink-lt">Orders, fulfilment, and profit tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleEbaySync}
            disabled={isEbaySyncing}
            className="px-3 py-1.5 text-xs font-medium rounded border border-sage text-sage hover:bg-sage hover:text-white transition disabled:opacity-50"
          >
            {isEbaySyncing ? 'Syncing...' : 'Sync eBay Sales'}
          </button>
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

        // Group for pick list: stash name → items (alphabetic by stash, then by name)
        const picklistGroups = (() => {
          const groups = new Map<string, SoldItem[]>()
          for (const item of actionItems) {
            const key = item.stashName || '— No stash —'
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(item)
          }
          return [...groups.entries()]
            .sort(([a], [b]) => {
              if (a === '— No stash —') return 1
              if (b === '— No stash —') return -1
              return a.localeCompare(b)
            })
            .map(([name, items]) => ({
              name,
              items: items.sort((a, b) => a.name.localeCompare(b.name)),
            }))
        })()

        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">
                  Needs action
                </h2>
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold min-w-[20px]">
                  {actionItems.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 bg-cream rounded p-1">
                  <button
                    onClick={() => setActionView('cards')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                      actionView === 'cards' ? 'bg-sage text-white' : 'text-ink hover:bg-cream-dk'
                    }`}
                  >
                    Cards
                  </button>
                  <button
                    onClick={() => setActionView('picklist')}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition ${
                      actionView === 'picklist' ? 'bg-sage text-white' : 'text-ink hover:bg-cream-dk'
                    }`}
                  >
                    📦 Pick list
                  </button>
                </div>
                {actionView === 'picklist' && (
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-sage/30 text-sage hover:bg-sage hover:text-white transition"
                  >
                    Print
                  </button>
                )}
                <button
                  onClick={handleBulkDelivered}
                  disabled={isBulkUpdating}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-green-600 text-green-600 hover:bg-green-600 hover:text-white transition disabled:opacity-50"
                >
                  {isBulkUpdating ? 'Updating...' : 'Mark all delivered'}
                </button>
              </div>
            </div>

            {actionView === 'cards' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {visibleActions.map((item) => (
                    <OrderCard
                      key={item.id}
                      item={item}
                      onUpdateStatus={handleUpdateShipment}
                      onGenerateLabel={(i) => { setLabelOrder(i); setLabelModalOpen(true) }}
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
              </>
            ) : (
              <Panel className="p-0 print:border-0 print:shadow-none">
                <div className="p-4 border-b border-border print:border-b-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-ink">Pick list</div>
                      <div className="text-[11px] text-ink-lt">
                        {actionItems.length} items to pack · {picklistGroups.length} {picklistGroups.length === 1 ? 'stash' : 'stashes'}
                      </div>
                    </div>
                    <div className="text-[10px] text-ink-lt print:block hidden">
                      {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {picklistGroups.map((group) => (
                    <div key={group.name} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-sage">📦 {group.name}</span>
                        <span className="text-[11px] text-ink-lt">
                          {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {group.items.map((item) => (
                          <li key={item.id} className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="mt-0.5 print:appearance-none print:border print:border-ink print:w-3 print:h-3"
                              aria-label={`Picked ${item.name}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-ink truncate">{item.name}</div>
                              <div className="text-[11px] text-ink-lt">
                                {item.marketplace && item.marketplace !== 'unknown' && (
                                  <span className="capitalize">{item.marketplace}</span>
                                )}
                                {item.buyer && <span> · {item.buyer}</span>}
                                {item.trackingNumber && <span> · {item.trackingNumber}</span>}
                              </div>
                            </div>
                            <button
                              onClick={() => handleUpdateShipment(item.id, 'shipped')}
                              className="text-[11px] text-sage hover:text-sage-lt transition print:hidden"
                            >
                              Mark shipped
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Panel>
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
              delta={
                timeframe === 'tax_year' ? 'this tax year'
                : timeframe === 'last_tax_year' ? 'last tax year'
                : timeframe === 'quarter' ? 'last 3 months'
                : timeframe === 'all' ? 'all time'
                : 'this month'
              }
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">
              Sold history
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-border rounded bg-cream focus:outline-none focus:border-sage w-40"
              />
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="px-2 py-1.5 text-xs border border-border rounded bg-cream focus:outline-none focus:border-sage"
              >
                <option value="all">All platforms</option>
                {platforms.map((p) => (
                  <option key={p} value={p}>{(p as string).charAt(0).toUpperCase() + (p as string).slice(1)}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 py-1.5 text-xs border border-border rounded bg-cream focus:outline-none focus:border-sage"
              >
                <option value="all">All statuses</option>
                <option value="awaiting">Awaiting shipment</option>
                <option value="shipped">Shipped / In transit</option>
                <option value="delivered">Delivered</option>
              </select>
              {(searchQuery || filterPlatform !== 'all' || filterStatus !== 'all') && (
                <span className="text-[10px] text-ink-lt">{filteredItems.length} of {allItems.length}</span>
              )}
            </div>
          </div>
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
                  {filteredItems.map((item) => (
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
                        {item.autoImported && (
                          <span
                            className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded bg-teal-50 text-teal-700"
                            title="This item was sold on eBay but wasn't in your Wrenlist inventory — we imported it automatically so your records stay complete."
                          >
                            Auto-imported
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {item.marketplace && item.marketplace !== 'unknown' ? (
                          <MarketplaceIcon platform={item.marketplace as Platform} size="sm" />
                        ) : (
                          <span className="text-ink-lt text-xs">--</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <ShipmentBadge status={item.shipmentStatus} soldAt={item.sold_at} />
                      </td>
                      <td className="px-3 py-2 text-ink-lt text-xs truncate max-w-[100px]">
                        {item.buyer || '--'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-ink text-sm font-medium">
                        £{item.sold_price_gbp?.toFixed(2) || '--'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-ink-lt">
                        {item.serviceFee != null && item.serviceFee > 0
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

      {/* ── Shipping Label Modal ───────────────────────────────── */}
      {labelOrder && (
        <ShippingLabelModal
          open={labelModalOpen}
          onClose={() => { setLabelModalOpen(false); setLabelOrder(null) }}
          order={{
            findId: labelOrder.id,
            transactionId: labelOrder.transactionId || null,
            shipmentId: labelOrder.shipmentId || null,
            marketplace: labelOrder.marketplace || 'vinted',
            buyerName: labelOrder.buyer || null,
            existingLabelUrl: labelOrder.labelUrl || null,
          }}
          onLabelGenerated={loadSoldItems}
        />
      )}
    </div>
  )
}
