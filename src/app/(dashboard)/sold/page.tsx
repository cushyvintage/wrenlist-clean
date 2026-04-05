'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'

interface SoldItem {
  id: string
  name: string
  category: string
  cost_gbp: number | null
  sold_price_gbp: number | null
  sourced_at: string | null
  sold_at: string | null
  marketplace?: string
  margin_percent?: number
  days_listed?: number
}

interface Metrics {
  itemsSold: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  avgMargin: number
  avgPerItem: number
}

export default function SoldHistoryPage() {
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'all'>('month')
  const [items, setItems] = useState<SoldItem[]>([])
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Sold Items | Wrenlist'
  }, [])

  // Fetch sold items with metrics
  useEffect(() => {
    const fetchSoldItems = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(`/api/sold?timeframe=${timeframe}`)
        if (!response.ok) throw new Error('Failed to fetch sold items')
        const result = await response.json()
        setItems(result.data?.items || [])
        setMetrics(result.data?.metrics || null)
      } catch (err) {
        console.error('Error fetching sold items:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sold items')
        setItems([])
        setMetrics(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSoldItems()
  }, [timeframe])

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '—'
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

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
        <div className="flex items-center gap-2">
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
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">item</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">category</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">marketplace</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">cost</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">sold for</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">margin</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">days listed</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">sold</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border hover:bg-cream-md transition"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/finds/${item.id}`}
                        className="font-medium text-sm text-sage hover:underline"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-lt text-sm capitalize">{item.category}</td>
                    <td className="px-4 py-3 text-ink-lt text-sm">{item.marketplace || '—'}</td>
                    <td className="px-4 py-3 font-mono text-ink text-sm">
                      £{item.cost_gbp?.toFixed(2) || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-ink text-sm font-medium">
                      £{item.sold_price_gbp?.toFixed(2) || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      <span className={item.margin_percent && item.margin_percent > 0 ? 'text-green-600' : 'text-ink-lt'}>
                        {item.margin_percent}%
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-ink text-sm">{item.days_listed}</td>
                    <td className="px-4 py-3 text-ink-lt text-sm">{formatDate(item.sold_at)}</td>
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
