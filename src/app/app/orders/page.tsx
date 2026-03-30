'use client'

import { useState, useEffect } from 'react'
import { PlatformTag } from '@/components/wren/PlatformTag'
import type { Platform, Listing, Find } from '@/types'

interface Order {
  id: string
  name: string
  platform: Platform
  sold_price_gbp: number
  sold_at: string
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Orders | Wrenlist'
  }, [])

  // Fetch sold finds with listings
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch sold finds
        const findsResponse = await fetch('/api/finds?status=sold')
        if (!findsResponse.ok) throw new Error('Failed to fetch orders')
        const findsResult = await findsResponse.json()
        const finds = findsResult.data || []

        // For each sold find, fetch its listings to get the platform
        const ordersWithListings = await Promise.all(
          finds.map(async (find: any) => {
            try {
              const listingsRes = await fetch(`/api/listings?find_id=${find.id}`)
              const listingsData = await listingsRes.json()
              const listing = (listingsData.data || [])[0]

              return {
                id: find.id,
                name: find.name,
                platform: (listing?.platform || 'vinted') as Platform,
                sold_price_gbp: find.sold_price_gbp || 0,
                sold_at: find.sold_at || new Date().toISOString(),
              }
            } catch {
              return {
                id: find.id,
                name: find.name,
                platform: 'vinted' as Platform,
                sold_price_gbp: find.sold_price_gbp || 0,
                sold_at: find.sold_at || new Date().toISOString(),
              }
            }
          })
        )

        setOrders(ordersWithListings)
      } catch (err) {
        console.error('Failed to fetch orders:', err)
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [])

  // Calculate totals
  const sorted = [...orders].sort((a, b) => {
    const aTime = new Date(a.sold_at).getTime()
    const bTime = new Date(b.sold_at).getTime()
    return bTime - aTime
  })

  const totalRevenue = sorted.reduce((sum, o) => sum + o.sold_price_gbp, 0)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    })
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
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">total sold</div>
          <div className="text-2xl font-serif font-medium text-ink">
            £{totalRevenue.toFixed(2)}
          </div>
          <div className="text-xs text-ink-lt mt-1">{sorted.length} orders</div>
        </div>

        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">avg per order</div>
          <div className="text-2xl font-serif font-medium text-ink">
            £{sorted.length > 0 ? (totalRevenue / sorted.length).toFixed(2) : '0.00'}
          </div>
          <div className="text-xs text-ink-lt mt-1">across all platforms</div>
        </div>

        <div className="p-4 bg-white border border-sage/14 rounded">
          <div className="text-xs font-medium text-ink-lt uppercase mb-2">order status</div>
          <div className="text-2xl font-serif font-medium text-sage-dk">
            {sorted.length}
          </div>
          <div className="text-xs text-ink-lt mt-1">all marked as sold</div>
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
        sorted.length === 0 ? (
          <div className="text-center py-12 text-ink-lt">
            <p>Orders appear here when your marketplace listings sell</p>
            <p className="text-xs mt-2">Sync your Vinted, eBay, Etsy, or Shopify accounts to see orders</p>
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
                    <th className="text-left py-3 px-4 text-xs uppercase font-medium text-ink-lt">sold date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage/14">
                  {sorted.map((order) => (
                    <tr key={order.id} className="hover:bg-cream transition">
                      <td className="py-3 px-4 font-medium text-ink">{order.name}</td>
                      <td className="py-3 px-4">
                        <PlatformTag platform={order.platform} live={true} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-ink">
                        £{order.sold_price_gbp.toFixed(2)}
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
