'use client'

import { useState, useEffect } from 'react'
import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { Badge } from '@/components/wren/Badge'
import type { Find } from '@/types'

export default function SoldHistoryPage() {
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'all'>('month')
  const [soldFinds, setSoldFinds] = useState<Find[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Sold Items | Wrenlist'
  }, [])

  // Fetch sold finds
  useEffect(() => {
    const fetchSoldFinds = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/finds?status=sold')
        if (!response.ok) throw new Error('Failed to fetch sold items')
        const result = await response.json()
        setSoldFinds(result.data || [])
      } catch (err) {
        console.error('Error fetching sold items:', err)
        setError(err instanceof Error ? err.message : 'Failed to load sold items')
        setSoldFinds([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchSoldFinds()
  }, [])

  // Calculate metrics from actual data
  const itemsSold = soldFinds.length
  const totalRevenue = soldFinds.reduce((sum, item) => sum + (item.sold_price_gbp || 0), 0)
  const totalCost = soldFinds.reduce((sum, item) => sum + (item.cost_gbp || 0), 0)
  const totalProfit = totalRevenue - totalCost
  const avgMargin = soldFinds.length > 0
    ? Math.round(
        soldFinds
          .map((item) => {
            if (!item.cost_gbp || !item.sold_price_gbp) return 0
            return ((item.sold_price_gbp - item.cost_gbp) / item.sold_price_gbp) * 100
          })
          .reduce((a, b) => a + b, 0) / soldFinds.length
      )
    : 0

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

  const getDaysListed = (find: Find): number => {
    if (!find.sourced_at || !find.sold_at) return 0
    const sourced = new Date(find.sourced_at).getTime()
    const sold = new Date(find.sold_at).getTime()
    return Math.round((sold - sourced) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-serif text-ink">sold history</h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('month')}
              className={`px-4 py-2 text-sm font-medium rounded transition ${
                timeframe === 'month'
                  ? 'bg-sage text-white'
                  : 'bg-cream-md text-ink hover:bg-cream-dk'
              }`}
            >
              this month
            </button>
            <button
              onClick={() => setTimeframe('quarter')}
              className={`px-4 py-2 text-sm font-medium rounded transition ${
                timeframe === 'quarter'
                  ? 'bg-sage text-white'
                  : 'bg-cream-md text-ink hover:bg-cream-dk'
              }`}
            >
              3 months
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-4 py-2 text-sm font-medium rounded transition ${
                timeframe === 'all'
                  ? 'bg-sage text-white'
                  : 'bg-cream-md text-ink hover:bg-cream-dk'
              }`}
            >
              all time
            </button>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition">
            export CSV
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="items sold"
          value={itemsSold.toString()}
          delta="+8 vs last month"
        />
        <StatCard
          label="total revenue"
          value={`£${totalRevenue.toLocaleString()}`}
          delta={`£${Math.round(totalRevenue / itemsSold)} avg per item`}
        />
        <StatCard
          label="total profit"
          value={`£${totalProfit.toLocaleString()}`}
          delta="after cost & packaging"
        />
        <StatCard
          label="avg margin"
          value={`${avgMargin}%`}
          delta="up from 61%"
        />
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

      {/* Sold items table */}
      {!isLoading && (
        <Panel>
          <h3 className="font-medium text-sm text-ink mb-4">all sold items</h3>
          {soldFinds.length === 0 ? (
            <div className="py-8 text-center text-ink-lt">
              <p>No items sold yet</p>
              <p className="text-xs mt-2">Sold items will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">item</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">category</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">source</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">cost</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">sold for</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">margin</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">days listed</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">sold</th>
                  </tr>
                </thead>
                <tbody>
                  {soldFinds.map((find) => {
                    const margin = find.cost_gbp && find.sold_price_gbp
                      ? Math.round(((find.sold_price_gbp - find.cost_gbp) / find.sold_price_gbp) * 100)
                      : 0
                    const daysListed = getDaysListed(find)
                    return (
                      <tr key={find.id} className="border-b border-border hover:bg-cream-md transition">
                        <td className="px-4 py-3">
                          <div className="font-medium text-sm text-ink">{find.name}</div>
                        </td>
                        <td className="px-4 py-3 text-ink-lt text-sm capitalize">{find.category}</td>
                        <td className="px-4 py-3 text-ink-lt text-sm">{find.source_name || '—'}</td>
                        <td className="px-4 py-3 font-mono text-ink text-sm">£{find.cost_gbp}</td>
                        <td className="px-4 py-3 font-mono text-ink text-sm">£{find.sold_price_gbp}</td>
                        <td className="px-4 py-3 text-green-600 text-sm font-mono">{margin}%</td>
                        <td className="px-4 py-3 font-mono text-ink text-sm">{daysListed}</td>
                        <td className="px-4 py-3 text-ink-lt text-sm">{formatDate(find.sold_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  )
}
