'use client'

import { useMemo, useState, useEffect } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import type { Platform } from '@/types'
import { unwrapApiResponse } from '@/lib/api-utils'
import { formatDate } from '@/lib/format-date'
import { platformLabel } from '@/lib/platforms'

/**
 * Orders is the accounting ledger. It's *not* a workspace — no "Mark shipped",
 * no status badges, no actions. If you want to do something with a sale, the
 * Sold page is the place (linked per-row). This page answers:
 *   "what did I make in March?"
 *   "download all my sales for my accountant"
 *   "how does Vinted compare to Etsy?"
 *
 * Everything here is read-only by design.
 */

interface Order {
  id: string
  name: string
  marketplace: string
  sold_price_gbp: number | null
  cost_gbp: number | null
  sold_at: string
  margin_gbp: number | null
  margin_pct: number | null
}

type PeriodFilter = 'all' | 'this_month' | 'last_month' | 'this_year' | 'last_tax_year'

function periodLabel(p: PeriodFilter): string {
  switch (p) {
    case 'this_month': return 'This month'
    case 'last_month': return 'Last month'
    case 'this_year': return 'This year'
    case 'last_tax_year': return 'Last tax year'
    case 'all':
    default:
      return 'All time'
  }
}

function inPeriod(iso: string, period: PeriodFilter): boolean {
  if (period === 'all') return true
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()

  if (period === 'this_month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  if (period === 'last_month') {
    const target = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth()
  }
  if (period === 'this_year') {
    return d.getFullYear() === now.getFullYear()
  }
  if (period === 'last_tax_year') {
    // UK tax year: 6 Apr to 5 Apr. "Last tax year" = the one that ended
    // most recently. On 2026-04-19, that's 2025-04-06 to 2026-04-05.
    const refYearEnd = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() > 5)
      ? now.getFullYear()
      : now.getFullYear() - 1
    const start = new Date(refYearEnd - 1, 3, 6)
    const end = new Date(refYearEnd, 3, 6)
    return d >= start && d < end
  }
  return false
}

function toCsv(orders: Order[]): string {
  const header = 'sold_at,item,platform,sold_price_gbp,cost_gbp,profit_gbp,margin_pct\n'
  const body = orders
    .map((o) => {
      const safeName = `"${(o.name || '').replace(/"/g, '""')}"`
      return [
        o.sold_at,
        safeName,
        platformLabel(o.marketplace),
        o.sold_price_gbp ?? '',
        o.cost_gbp ?? '',
        o.margin_gbp ?? '',
        o.margin_pct ?? '',
      ].join(',')
    })
    .join('\n')
  return header + body
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodFilter>('all')

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/orders')
        if (!response.ok) throw new Error('Failed to fetch orders')
        const result = await response.json()
        setOrders(unwrapApiResponse<Order[]>(result))
      } catch (err) {
        console.error('Failed to fetch orders:', err)
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const filtered = useMemo(
    () => orders.filter((o) => inPeriod(o.sold_at, period)),
    [orders, period],
  )

  // Group by year-month for the ledger view. Keys like "2026-04" so sort
  // order is chronological without parsing.
  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of filtered) {
      const d = new Date(o.sold_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const list = map.get(key) ?? []
      list.push(o)
      map.set(key, list)
    }
    // Sort orders within each month, most recent first
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime())
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const totalRevenue = filtered.reduce((sum, o) => sum + (o.sold_price_gbp || 0), 0)
  const totalCost = filtered.reduce((sum, o) => sum + (o.cost_gbp || 0), 0)
  const hasAnyCost = filtered.some((o) => (o.cost_gbp || 0) > 0)
  const totalMargin = hasAnyCost ? totalRevenue - totalCost : null
  const marginPct = hasAnyCost && totalRevenue > 0
    ? Math.round(((totalMargin as number) / totalRevenue) * 100)
    : null

  const downloadCsv = () => {
    if (filtered.length === 0) return
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wrenlist-orders-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="border-b border-sage/14 pb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-lt">
            Sales ledger across every platform — read-only. To ship items
            or update status, use{' '}
            <a href="/sold" className="text-sage hover:underline">Sold</a>.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={filtered.length === 0}
          className="flex-shrink-0 text-xs px-3 py-1.5 border border-sage rounded text-sage hover:bg-sage/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↓ export CSV
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-2 flex-wrap">
        {(['this_month', 'last_month', 'this_year', 'last_tax_year', 'all'] as PeriodFilter[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors whitespace-nowrap ${
              period === p
                ? 'bg-sage-pale border border-sage text-sage'
                : 'bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream'
            }`}
          >
            {periodLabel(p)}
          </button>
        ))}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">revenue</div>
          <div className="text-2xl font-serif font-medium text-ink">£{totalRevenue.toFixed(2)}</div>
          <div className="text-xs text-ink-lt mt-1">
            {filtered.length} {filtered.length === 1 ? 'order' : 'orders'} · {periodLabel(period).toLowerCase()}
          </div>
        </div>
        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">profit</div>
          <div className="text-2xl font-serif font-medium text-sage-dk">
            {totalMargin != null ? `£${totalMargin.toFixed(2)}` : '—'}
          </div>
          <div className="text-xs text-ink-lt mt-1">
            {totalMargin != null ? 'after cost of goods' : 'add cost to track'}
          </div>
        </div>
        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">avg margin</div>
          <div className="text-2xl font-serif font-medium text-ink">
            {marginPct != null ? `${marginPct}%` : '—'}
          </div>
          <div className="text-xs text-ink-lt mt-1">
            {marginPct != null ? 'across sales with cost data' : 'add cost to track'}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-lt border border-red-dk/20 rounded p-4 text-sm text-red-dk">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && <div className="text-center py-12 text-ink-lt">Loading orders...</div>}

      {/* Ledger */}
      {!isLoading && !error && (
        filtered.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white border border-sage/14 rounded-lg">
            <p className="text-2xl mb-2">📒</p>
            <p className="text-sage-dim text-sm mb-1">
              {orders.length === 0
                ? 'No orders yet'
                : `No sales in ${periodLabel(period).toLowerCase()}`}
            </p>
            <p className="text-xs text-ink-lt">
              {orders.length === 0
                ? 'When items sell on any connected marketplace, they appear here automatically.'
                : 'Try a different period.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([monthKey, monthOrders]) => {
              const [y, m] = monthKey.split('-').map((n) => parseInt(n, 10))
              const monthLabel = new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString('en-GB', {
                month: 'long',
                year: 'numeric',
              })
              const monthRevenue = monthOrders.reduce((s, o) => s + (o.sold_price_gbp || 0), 0)
              return (
                <div key={monthKey} className="border border-sage/14 rounded-lg overflow-hidden">
                  <div className="bg-cream-md border-b border-sage/14 px-4 py-2 flex items-center justify-between">
                    <h2 className="text-xs uppercase tracking-widest text-sage-dim font-medium">
                      {monthLabel}
                    </h2>
                    <span className="text-xs text-ink-lt">
                      {monthOrders.length} {monthOrders.length === 1 ? 'sale' : 'sales'} · £{monthRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-sage/14">
                        <tr>
                          <th className="text-left py-2 px-4 text-[10px] uppercase font-medium text-ink-lt">item</th>
                          <th className="text-left py-2 px-4 text-[10px] uppercase font-medium text-ink-lt">platform</th>
                          <th className="text-right py-2 px-4 text-[10px] uppercase font-medium text-ink-lt">sold for</th>
                          <th className="text-right py-2 px-4 text-[10px] uppercase font-medium text-ink-lt">profit</th>
                          <th className="text-left py-2 px-4 text-[10px] uppercase font-medium text-ink-lt">sold date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sage/14">
                        {monthOrders.map((order, idx) => (
                          <tr
                            key={`${order.id}-${idx}`}
                            className="hover:bg-cream transition cursor-pointer"
                            onClick={() => { window.location.href = `/sold/${order.id}` }}
                          >
                            <td className="py-2.5 px-4 font-medium text-ink">{order.name}</td>
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center gap-2 text-xs text-ink-md">
                                <MarketplaceIcon platform={order.marketplace as Platform} size="sm" />
                                {platformLabel(order.marketplace)}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-medium text-ink">
                              £{(order.sold_price_gbp || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono">
                              {order.margin_gbp !== null ? (
                                <span className={order.margin_gbp >= 0 ? 'text-sage-dk' : 'text-red-dk'}>
                                  £{order.margin_gbp.toFixed(2)}
                                  {order.margin_pct !== null && ` (${order.margin_pct}%)`}
                                </span>
                              ) : (
                                <span className="text-ink-lt">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-xs text-ink-lt whitespace-nowrap">
                              {formatDate(order.sold_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
