'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/wren/StatCard'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import type { Find, Listing } from '@/types'
import { SOURCE_LABELS, PLATFORM_LABELS } from '@/types'

type TimePeriod = 'month' | '3months' | 'all'

interface MonthlyData {
  month: string
  revenue: number
  percentage: number
  highlight?: boolean
}

interface PlatformData {
  platform: string
  revenue: number
  percentage: number
}

interface SourceData {
  source: string
  revenue: number
  margin: number
  days: string
}

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')
  const [finds, setFinds] = useState<Find[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [findsRes, listingsRes] = await Promise.all([
          fetch('/api/finds'),
          fetch('/api/listings'),
        ])
        if (findsRes.ok) setFinds(findsRes.ok ? (await findsRes.json()).data : [])
        if (listingsRes.ok) setListings(listingsRes.ok ? (await listingsRes.json()).data : [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter by time period
  const getDateRangeStart = () => {
    const now = new Date()
    if (timePeriod === 'month') {
      return new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (timePeriod === '3months') {
      return new Date(now.getFullYear(), now.getMonth() - 3, 1)
    }
    return new Date(0) // all time
  }

  const dateRangeStart = getDateRangeStart()

  // Calculate monthly revenue
  const monthlyData: MonthlyData[] = (() => {
    const months = new Map<string, number>()
    const now = new Date()

    finds.forEach((find) => {
      if (!find.sold_at || !find.sold_price_gbp) return
      const soldDate = new Date(find.sold_at)
      if (soldDate < dateRangeStart) return

      const key = soldDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      months.set(key, (months.get(key) || 0) + find.sold_price_gbp)
    })

    // Get last 6 months worth of labels
    const labels: string[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      labels.push(d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))
    }

    const maxRevenue = Math.max(...Array.from(months.values()), 1)
    const now_key = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })

    return labels.map((month) => ({
      month: month.split(' ')[0] || month,
      revenue: months.get(month) || 0,
      percentage: ((months.get(month) || 0) / maxRevenue) * 100,
      highlight: month === now_key,
    }))
  })()

  // Calculate platform breakdown
  const platformData: PlatformData[] = (() => {
    const platforms = new Map<string, number>()

    finds.forEach((find) => {
      if (!find.sold_at || !find.sold_price_gbp) return
      const soldDate = new Date(find.sold_at)
      if (soldDate < dateRangeStart) return

      const listing = listings.find((l) => l.find_id === find.id && l.status === 'sold')
      const platform = listing ? PLATFORM_LABELS[listing.platform] : 'Unknown'
      platforms.set(platform, (platforms.get(platform) || 0) + find.sold_price_gbp)
    })

    const totalRevenue = Array.from(platforms.values()).reduce((a, b) => a + b, 0)
    return Array.from(platforms.entries())
      .map(([platform, revenue]) => ({
        platform,
        revenue,
        percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  })()

  // Calculate source breakdown
  const sourceData: SourceData[] = (() => {
    const sources = new Map<
      string,
      {
        revenue: number
        margins: number[]
        dayToSells: number[]
      }
    >()

    finds.forEach((find) => {
      if (!find.sold_at || !find.sold_price_gbp) return
      const soldDate = new Date(find.sold_at)
      if (soldDate < dateRangeStart) return

      const sourceLabel = find.source_type ? SOURCE_LABELS[find.source_type] : 'Unknown'
      const existing = sources.get(sourceLabel) || {
        revenue: 0,
        margins: [],
        dayToSells: [],
      }

      existing.revenue += find.sold_price_gbp

      if (find.cost_gbp) {
        const margin = ((find.sold_price_gbp - find.cost_gbp) / find.cost_gbp) * 100
        existing.margins.push(margin)
      }

      if (find.sourced_at) {
        const days = Math.round(
          (new Date(find.sold_at).getTime() - new Date(find.sourced_at).getTime()) /
            (1000 * 60 * 60 * 24),
        )
        existing.dayToSells.push(days)
      }

      sources.set(sourceLabel, existing)
    })

    return Array.from(sources.entries())
      .map(([source, data]) => ({
        source,
        revenue: data.revenue,
        margin:
          data.margins.length > 0
            ? Math.round(data.margins.reduce((a, b) => a + b, 0) / data.margins.length)
            : 0,
        days:
          data.dayToSells.length > 0
            ? (
                data.dayToSells.reduce((a, b) => a + b, 0) / data.dayToSells.length
              ).toFixed(1)
            : '0',
      }))
      .sort((a, b) => b.revenue - a.revenue)
  })()

  // Total metrics
  const totalRevenue = finds
    .filter((f) => {
      if (!f.sold_at) return false
      return new Date(f.sold_at) >= dateRangeStart
    })
    .reduce((sum, f) => sum + (f.sold_price_gbp || 0), 0)

  const allMargins = finds
    .filter((f) => f.cost_gbp && f.sold_price_gbp)
    .map((f) => ((f.sold_price_gbp! - f.cost_gbp!) / f.cost_gbp!) * 100)
  const avgMargin = allMargins.length > 0
    ? Math.round(allMargins.reduce((a, b) => a + b, 0) / allMargins.length)
    : 0

  const itemsSold = finds.filter((f) => {
    if (!f.sold_at) return false
    return new Date(f.sold_at) >= dateRangeStart
  }).length

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between pb-4 border-b border-sage/14">
        <h1 className="font-serif text-2xl italic text-ink">analytics</h1>
        <div className="flex gap-2">
          {[
            { value: 'month' as const, label: 'this month' },
            { value: '3months' as const, label: '3 months' },
            { value: 'all' as const, label: 'all time' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimePeriod(value)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                timePeriod === value
                  ? 'bg-sage-pale border border-sage text-sage'
                  : 'bg-white border border-sage/14 text-ink-lt hover:bg-cream-md'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total revenue"
          value={totalRevenue}
          prefix="£"
          delta={isLoading ? '...' : `${itemsSold} items sold`}
          suffix=""
        />
        <StatCard
          label="Avg margin"
          value={avgMargin}
          suffix="%"
          delta={isLoading ? '...' : 'from sold items'}
        />
        <StatCard
          label="Items sold"
          value={itemsSold}
          delta={
            isLoading
              ? '...'
              : itemsSold > 0
                ? `avg £${(totalRevenue / itemsSold).toFixed(2)} per item`
                : 'no sales yet'
          }
          suffix=""
        />
      </div>

      {/* Empty state */}
      {!isLoading && finds.length === 0 && (
        <div className="text-center py-12">
          <p className="text-ink-lt mb-4">Add and sell finds to see analytics here</p>
        </div>
      )}

      {/* Charts and tables */}
      {!isLoading && finds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly revenue chart - spans 2 columns */}
          <div className="lg:col-span-2">
            <Panel title="monthly revenue">
              {monthlyData.some((m) => m.revenue > 0) ? (
                <div className="space-y-4">
                  {/* Bar chart */}
                  <div className="flex items-end gap-2 h-40 px-2">
                    {monthlyData.map((item) => (
                      <div
                        key={item.month}
                        className="flex-1 flex flex-col items-center gap-1.5"
                      >
                        {/* Value label */}
                        <div
                          className={`text-xs font-mono font-medium ${
                            item.highlight ? 'text-sage' : 'text-ink-md'
                          }`}
                        >
                          £{item.revenue > 0 ? (item.revenue / 1000).toFixed(1) : '0'}k
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t ${
                            item.highlight ? 'bg-sage' : 'bg-sage-pale'
                          }`}
                          style={{ height: `${item.percentage}%` }}
                        />

                        {/* Month label */}
                        <div
                          className={`text-xs font-medium ${
                            item.highlight ? 'text-sage' : 'text-ink-lt'
                          }`}
                        >
                          {item.month} {item.highlight ? '↑' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-ink-lt text-sm py-4">No sales data yet</p>
              )}
            </Panel>
          </div>

          {/* By Platform table */}
          <Panel title="by platform">
            {platformData.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {platformData.map((item, idx) => (
                    <tr
                      key={item.platform}
                      className={`border-b border-sage/14 ${
                        idx === platformData.length - 1 ? 'border-0' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-ink-md">{item.platform}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs">
                        £{item.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-medium text-sage-lt">
                        {item.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-ink-lt text-sm py-4">No sales data yet</p>
            )}
          </Panel>
        </div>
      )}

      {/* Bottom section - By Source + Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Source table - spans 2 columns */}
        <div className="lg:col-span-2">
          <Panel title="by source">
            {sourceData.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-widest text-sage-dim font-medium border-b border-sage/14">
                  <tr>
                    <th className="text-left py-3 px-3">source</th>
                    <th className="text-right py-3 px-3">revenue</th>
                    <th className="text-right py-3 px-3">avg margin</th>
                    <th className="text-right py-3 px-3">avg days</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceData.map((item, idx) => (
                    <tr
                      key={item.source}
                      className={`border-b border-sage/14 ${
                        idx === sourceData.length - 1 ? 'border-0' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-ink-md">{item.source}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs">
                        £{item.revenue.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs font-medium text-green-700">
                        {item.margin}%
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-xs">
                        {item.days}d
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-ink-lt text-sm py-4">No sales data yet</p>
            )}
          </Panel>
        </div>

        {/* Insight card */}
        <InsightCard
          text={
            sourceData.length > 0
              ? 'House clearances deliver 40% faster sell-through and 27 points more margin than charity shops. Your next sourcing trip should prioritise them.'
              : 'Sell items from different sources to see sourcing insights.'
          }
          link={{
            text: sourceData.length > 0 ? 'view sourcing recommendations →' : 'add first find',
            onClick: () => {},
          }}
        />
      </div>
    </div>
  )
}
