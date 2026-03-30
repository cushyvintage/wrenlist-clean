'use client'

import { useState } from 'react'
import { PlatformTag } from '@/components/wren/PlatformTag'
import type { Platform } from '@/types'

interface Order {
  id: string
  listingId: string
  platform: Platform
  itemName: string
  buyerName: string
  buyerEmail?: string
  price: number
  platform_fee: number
  shipping_cost?: number
  margin?: number
  status: 'pending' | 'shipped' | 'delivered' | 'refunded'
  soldAt: string
  shippedAt?: string
  platformOrderId: string
}

// Mock orders
const mockOrders: Order[] = [
  {
    id: 'o1',
    listingId: 'l1',
    platform: 'ebay',
    itemName: 'Carhartt Detroit Jacket',
    buyerName: 'John Smith',
    buyerEmail: 'john@example.com',
    price: 145,
    platform_fee: 18.56,
    shipping_cost: 2.99,
    margin: 121.45,
    status: 'pending',
    soldAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    platformOrderId: 'ebay-123-456',
  },
  {
    id: 'o2',
    listingId: 'l2',
    platform: 'vinted',
    itemName: 'Levi\'s 501 Denim',
    buyerName: 'Sarah Johnson',
    price: 45,
    platform_fee: 2.25,
    shipping_cost: 0,
    margin: 34.75,
    status: 'shipped',
    soldAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    shippedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    platformOrderId: 'vinted-789-012',
  },
  {
    id: 'o3',
    listingId: 'l3',
    platform: 'etsy',
    itemName: 'Vintage Watch',
    buyerName: 'Emma Wilson',
    price: 110,
    platform_fee: 7.15,
    shipping_cost: 15,
    margin: 75.85,
    status: 'delivered',
    soldAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    shippedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    platformOrderId: 'etsy-345-678',
  },
  {
    id: 'o4',
    listingId: 'l4',
    platform: 'ebay',
    itemName: 'Nike Air Max 90',
    buyerName: 'Michael Brown',
    price: 95,
    platform_fee: 12.16,
    shipping_cost: 7.99,
    margin: 59.85,
    status: 'shipped',
    soldAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    shippedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    platformOrderId: 'ebay-901-234',
  },
  {
    id: 'o5',
    listingId: 'l5',
    platform: 'vinted',
    itemName: 'Ralph Lauren Polo',
    buyerName: 'Lisa Garcia',
    price: 28,
    platform_fee: 1.4,
    shipping_cost: 0,
    margin: 19.6,
    status: 'delivered',
    soldAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    shippedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    platformOrderId: 'vinted-567-890',
  },
  {
    id: 'o6',
    listingId: 'l6',
    platform: 'etsy',
    itemName: 'Vintage Leather Belt',
    buyerName: 'Robert Taylor',
    price: 32,
    platform_fee: 2.08,
    shipping_cost: 4.50,
    margin: 20.42,
    status: 'pending',
    soldAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    platformOrderId: 'etsy-123-789',
  },
]

type SortField = 'soldAt' | 'platform' | 'price' | 'status'
type StatusFilter = 'all' | 'pending' | 'shipped' | 'delivered' | 'refunded'

export default function OrdersPage() {
  const [orders, setOrders] = useState(mockOrders)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortField>('soldAt')
  const [sortDesc, setSortDesc] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // Calculate totals
  const filteredOrders = orders.filter((o) =>
    statusFilter === 'all' ? true : o.status === statusFilter
  )

  const sorted = [...filteredOrders].sort((a, b) => {
    let aVal: any = a[sortBy]
    let bVal: any = b[sortBy]

    if (sortBy === 'soldAt') {
      aVal = new Date(aVal).getTime()
      bVal = new Date(bVal).getTime()
    }

    if (aVal < bVal) return sortDesc ? 1 : -1
    if (aVal > bVal) return sortDesc ? -1 : 1
    return 0
  })

  const totalRevenue = sorted.reduce((sum, o) => sum + o.price, 0)
  const totalFees = sorted.reduce((sum, o) => sum + o.platform_fee, 0)
  const totalMargin = sorted.reduce((sum, o) => sum + (o.margin || 0), 0)

  const getStatusColor = (status: Order['status']) => {
    if (status === 'pending') return 'bg-amber-50 text-amber border-amber/22'
    if (status === 'shipped') return 'bg-blue-50 text-blue border-blue/22'
    if (status === 'delivered') return 'bg-sage-pale text-sage-dk border-sage'
    return 'bg-red-50 text-red border-red/22'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleMarkShipped = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'shipped', shippedAt: new Date().toISOString() }
          : o
      )
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-sage/14 pb-6">
        <h1 className="font-serif text-2xl italic text-ink mb-4">orders</h1>
        <p className="text-sm text-ink-lt">
          Track sales across all platforms and manage shipments
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">total revenue</div>
          <div className="text-2xl font-serif font-medium text-ink">
            £{totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-ink-lt mt-1">{filteredOrders.length} orders</div>
        </div>

        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">platform fees</div>
          <div className="text-2xl font-serif font-medium text-red">
            -£{totalFees.toFixed(2)}
          </div>
          <div className="text-xs text-ink-lt mt-1">avg {((totalFees / totalRevenue) * 100).toFixed(1)}%</div>
        </div>

        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">net margin</div>
          <div className="text-2xl font-serif font-medium text-sage-dk">
            £{totalMargin.toFixed(2)}
          </div>
          <div className="text-xs text-ink-lt mt-1">
            {filteredOrders.length > 0 ? `avg £${(totalMargin / filteredOrders.length).toFixed(2)}` : '—'}
          </div>
        </div>

        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">avg time to ship</div>
          <div className="text-2xl font-serif font-medium text-ink">
            ~2
            <span className="text-sm text-ink-lt ml-1">days</span>
          </div>
          <div className="text-xs text-ink-lt mt-1">from order date</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between border-b border-sage/14 pb-4">
        <div className="flex gap-2">
          {(['all', 'pending', 'shipped', 'delivered'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-sage-pale border border-sage text-sage'
                  : 'bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream'
              }`}
            >
              {status === 'all' ? 'all orders' : status}
            </button>
          ))}
        </div>

        <div className="text-xs text-ink-lt">
          Sorted by: <span className="font-medium">{sortBy}</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-ink-lt">loading orders...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-ink-lt">no orders yet</div>
        ) : (
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-[auto_1fr_120px_100px_100px_120px_80px] gap-4 px-4 py-2 text-xs font-medium text-ink-lt uppercase tracking-wide border-b border-sage/14">
              <div>order</div>
              <div>item & buyer</div>
              <div className="text-right">price</div>
              <div className="text-right">margin</div>
              <div>platform</div>
              <div>date</div>
              <div className="text-right">status</div>
            </div>

            {/* Table Rows */}
            {sorted.map((order) => (
              <div
                key={order.id}
                className="grid grid-cols-[auto_1fr_120px_100px_100px_120px_80px] gap-4 px-4 py-3 items-center bg-white border border-sage/14 rounded hover:bg-cream transition-colors"
              >
                {/* Order ID */}
                <div className="text-xs font-mono text-ink-lt">#{order.id.substring(0, 4)}</div>

                {/* Item & Buyer */}
                <div>
                  <div className="text-sm font-medium text-ink">{order.itemName}</div>
                  <div className="text-xs text-ink-lt mt-0.5">
                    {order.buyerName}
                    {order.buyerEmail && ` (${order.buyerEmail})`}
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className="text-sm font-serif font-medium text-ink">
                    £{order.price.toFixed(2)}
                  </div>
                  <div className="text-xs text-ink-lt">-£{order.platform_fee.toFixed(2)}</div>
                </div>

                {/* Margin */}
                <div className="text-right font-serif font-medium text-sage-dk">
                  £{(order.margin || 0).toFixed(2)}
                </div>

                {/* Platform */}
                <div>
                  <PlatformTag platform={order.platform} live={true} />
                </div>

                {/* Date */}
                <div className="text-xs text-ink-lt">{formatDate(order.soldAt)}</div>

                {/* Status & Actions */}
                <div className="text-right flex flex-col gap-2 items-end">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>

                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleMarkShipped(order.id)}
                      className="text-xs px-2 py-1 bg-transparent border border-sage/22 text-ink-lt hover:bg-cream-md rounded transition"
                    >
                      ship
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-ink-lt border-t border-sage/14 pt-4">
        Orders sync automatically every 5 minutes. Last synced: just now
      </div>
    </div>
  )
}
