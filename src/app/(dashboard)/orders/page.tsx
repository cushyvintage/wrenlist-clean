'use client'

import { useState, useEffect } from 'react'
import { PlatformTag } from '@/components/wren/PlatformTag'
import type { Platform } from '@/types'
import { unwrapApiResponse } from '@/lib/api-utils'

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

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Orders | Wrenlist'
  }, [])

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    })
  }

  const formatPlatform = (marketplace: string): Platform => {
    return (marketplace as Platform) || 'vinted'
  }

  // Calculate totals
  const totalRevenue = orders.reduce((sum, o) => sum + (o.sold_price_gbp || 0), 0)
  const totalCost = orders.reduce((sum, o) => sum + (o.cost_gbp || 0), 0)
  const totalMargin = totalRevenue - totalCost

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-sage/14 pb-6">
        <h1 className="font-serif text-2xl italic text-ink mb-4">orders</h1>
        <p className="text-sm text-ink-lt">
          Track sales across all platforms
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">total revenue</div>
          <div className="text-2xl font-serif font-medium text-ink">
            £{totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-ink-lt mt-1">{orders.length} orders</div>
        </div>

        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">total profit</div>
          <div className="text-2xl font-serif font-medium text-sage-dk">
            £{totalMargin.toFixed(2)}
          </div>
          <div className="text-xs text-ink-lt mt-1">after cost of goods</div>
        </div>

        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">avg margin</div>
          <div className="text-2xl font-serif font-medium text-ink">
            {orders.length > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0}%
          </div>
          <div className="text-xs text-ink-lt mt-1">margin rate</div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-lt border border-red-dk/20 rounded p-4 text-sm text-red-dk">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-ink-lt">Loading orders...</div>
      )}

      {/* Orders Table */}
      {!isLoading && !error && (
        orders.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white border border-sage/14 rounded-lg">
            <p className="text-2xl mb-2">💰</p>
            <p className="text-sage-dim text-sm mb-1">No orders yet</p>
            <p className="text-xs text-ink-lt">When items sell on eBay or Vinted, they appear here automatically</p>
          </div>
        ) : (
          <div className="border border-sage/14 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-cream-md border-b border-sage/14">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs uppercase font-medium text-ink-lt">item</th>
                    <th className="text-left py-3 px-4 text-xs uppercase font-medium text-ink-lt">platform</th>
                    <th className="text-right py-3 px-4 text-xs uppercase font-medium text-ink-lt">sale price</th>
                    <th className="text-right py-3 px-4 text-xs uppercase font-medium text-ink-lt">profit</th>
                    <th className="text-left py-3 px-4 text-xs uppercase font-medium text-ink-lt">sold date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/14">
                  {orders.map((order, idx) => (
                    <tr key={`${order.id}-${idx}`} className="hover:bg-cream transition">
                      <td className="py-3 px-4 font-medium text-ink">{order.name}</td>
                      <td className="py-3 px-4">
                        <PlatformTag platform={formatPlatform(order.marketplace)} live={true} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-ink">
                        £{(order.sold_price_gbp || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {order.margin_gbp !== null ? (
                          <span className={order.margin_gbp >= 0 ? 'text-sage-dk' : 'text-red-dk'}>
                            £{order.margin_gbp.toFixed(2)}
                            {order.margin_pct !== null && ` (${order.margin_pct}%)`}
                          </span>
                        ) : (
                          <span className="text-ink-lt">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-lt">{formatDate(order.sold_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  )
}
