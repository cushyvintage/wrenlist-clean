'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/wren/StatCard'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'

type TimePeriod = 'month' | '3months' | 'all'

interface AnalyticsSummary {
  total_finds: number
  listed_finds: number
  sold_finds: number
  total_revenue_gbp: number
  total_cost_gbp: number
  gross_margin_pct: number
  avg_days_to_sell: number
  this_month_finds: number
  this_month_revenue: number
  this_month_expenses: number
  this_month_mileage_gbp: number
}

interface CategoryAnalytics {
  category: string
  count: number
  total_revenue: number
  avg_price: number
  avg_days_to_sell: number
}

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

interface AgingData {
  aged_30: number
  aged_60: number
  oldest_item: {
    name: string
    days_listed: number
    category: string | null
  } | null
}

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [categories, setCategories] = useState<CategoryAnalytics[]>([])
  const [aging, setAging] = useState<AgingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Analytics | Wrenlist'
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [summaryRes, categoriesRes, agingRes] = await Promise.all([
          fetch('/api/analytics/summary'),
          fetch('/api/analytics/by-category'),
          fetch('/api/analytics/aging'),
        ])

        if (!summaryRes.ok || !categoriesRes.ok || !agingRes.ok) {
          throw new Error('Failed to fetch analytics data')
        }

        const summaryData = await summaryRes.json()
        const categoriesData = await categoriesRes.json()
        const agingData = await agingRes.json()

        setSummary(summaryData)
        setCategories(categoriesData)
        setAging(agingData)
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Generate monthly data for visualization (last 6 months)
  const monthlyData: MonthlyData[] = (() => {
    const now = new Date()
    const labels: string[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      labels.push(d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }))
    }

    // For now, use this month's revenue across the timeline
    // In production, you'd want detailed monthly breakdown
    const now_key = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    const maxRevenue = Math.max(summary?.this_month_revenue || 1, 1)

    return labels.map((month) => ({
      month: month.split(' ')[0] || month,
      revenue: month === now_key ? summary?.this_month_revenue || 0 : 0,
      percentage: month === now_key ? 100 : 0,
      highlight: month === now_key,
    }))
  })()

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl italic text-ink">analytics</h1>
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

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
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-sage/10 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total revenue"
            value={summary?.total_revenue_gbp || 0}
            prefix="£"
            delta={summary ? `${summary.sold_finds} items sold` : 'no sales yet'}
            suffix=""
          />
          <StatCard
            label="Gross margin"
            value={summary?.gross_margin_pct || 0}
            suffix="%"
            delta={summary ? 'from sold items' : '—'}
          />
          <StatCard
            label="Avg days to sell"
            value={summary?.avg_days_to_sell || 0}
            suffix=" days"
            delta={summary ? 'average' : '—'}
          />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !summary?.total_finds && (
        <div className="text-center py-12">
          <p className="text-ink-lt mb-4">Add and sell finds to see analytics here</p>
        </div>
      )}

      {/* Aged stock alert */}
      {!isLoading && aging && (aging.aged_30 > 0 || aging.aged_60 > 0) && (
        <div className="bg-amber/10 border border-amber/30 rounded p-4">
          <p className="text-sm text-amber font-medium mb-2">
            📦 Aged stock alert
          </p>
          <p className="text-sm text-amber-900 mb-3">
            {aging.aged_60} items listed 60+ days · {aging.aged_30 - aging.aged_60} items listed 30+ days
            {aging.oldest_item && (
              <>
                <br />
                <span className="text-xs">Oldest: {aging.oldest_item.name} ({aging.oldest_item.days_listed}d)</span>
              </>
            )}
          </p>
          <button
            onClick={() => {
              // Navigate to inventory with aging filter
              window.location.href = '/finds?filter=aging'
            }}
            className="text-sm underline underline-offset-2 text-amber hover:text-amber-900 transition-colors"
          >
            Review aged inventory →
          </button>
        </div>
      )}

      {/* Charts and tables */}
      {!isLoading && summary && summary.total_finds > 0 && (
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
                          £{item.revenue > 0 ? item.revenue.toFixed(0) : '0'}
                        </div>

                        {/* Bar */}
                        <div
                          className={`w-full rounded-t ${
                            item.highlight ? 'bg-sage' : 'bg-sage-pale'
                          }`}
                          style={{ height: `${Math.max(item.percentage, 5)}%` }}
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

          {/* By Category table */}
          <Panel title="by category">
            {categories.length > 0 ? (
              <table className="w-full text-sm">
                <tbody>
                  {categories.slice(0, 5).map((item, idx) => (
                    <tr
                      key={item.category}
                      className={`border-b border-sage/14 ${
                        idx === Math.min(categories.length - 1, 4) ? 'border-0' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-ink-md text-xs">{item.category}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs">
                        £{item.total_revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-ink-lt text-sm py-4">No categories yet</p>
            )}
          </Panel>
        </div>
      )}

      {/* Category breakdown table - full width */}
      {!isLoading && summary && categories.length > 0 && (
        <Panel title="category breakdown">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-sage-dim font-medium border-b border-sage/14">
              <tr>
                <th className="text-left py-3 px-3">category</th>
                <th className="text-right py-3 px-3">count</th>
                <th className="text-right py-3 px-3">revenue</th>
                <th className="text-right py-3 px-3">avg price</th>
                <th className="text-right py-3 px-3">avg days</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((item, idx) => (
                <tr
                  key={item.category}
                  className={`border-b border-sage/14 ${
                    idx === categories.length - 1 ? 'border-0' : ''
                  }`}
                >
                  <td className="py-3 px-3 text-ink-md">{item.category}</td>
                  <td className="py-3 px-3 text-right font-mono text-xs">{item.count}</td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    £{item.total_revenue.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    £{item.avg_price.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {item.avg_days_to_sell}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Insight card */}
      <InsightCard
        text={
          summary && summary.total_finds > 0
            ? `You've listed ${summary.total_finds} items and sold ${summary.sold_finds} with an average margin of ${summary.gross_margin_pct}%. Keep up the momentum!`
            : 'Add items to your inventory to start tracking metrics and insights.'
        }
        link={{
          text: summary && summary.total_finds > 0 ? 'view inventory' : 'add first find',
          onClick: () => {},
        }}
      />
    </div>
  )
}
