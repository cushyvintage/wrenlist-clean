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
  draft_finds: number
  total_sales: number
  cogs: number
  gross_profit: number
  profit_margin_pct: number
  avg_profit_per_item: number
  stock_cost: number
  stock_listed_value: number
  stock_count: number
  avg_days_to_sell: number
  sell_through_pct: number
  this_month_sales: number
  this_month_profit: number
  this_month_items_sold: number
  this_month_items_sourced: number
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
  label: string
  sales: number
  profit: number
  items_sold: number
  items_sourced: number
}

interface MarketplaceData {
  marketplace: string
  listed_count: number
  sold_count: number
  total_revenue: number
}

interface AgingData {
  aged_30: number
  aged_60: number
  aged_90: number
  aged_stock_value: number
  oldest_item: {
    name: string
    days_listed: number
    category: string | null
    cost_gbp: number | null
    asking_price_gbp: number | null
  } | null
}

function formatGBP(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toFixed(0)
}

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [categories, setCategories] = useState<CategoryAnalytics[]>([])
  const [monthly, setMonthly] = useState<MonthlyData[]>([])
  const [marketplaces, setMarketplaces] = useState<MarketplaceData[]>([])
  const [aging, setAging] = useState<AgingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const [summaryRes, categoriesRes, monthlyRes, marketplaceRes, agingRes] =
          await Promise.all([
            fetch(`/api/analytics/summary?period=${timePeriod}`),
            fetch('/api/analytics/by-category'),
            fetch('/api/analytics/monthly'),
            fetch('/api/analytics/by-marketplace'),
            fetch('/api/analytics/aging'),
          ])

        if (!summaryRes.ok) throw new Error('Failed to fetch summary')

        const summaryData = await summaryRes.json()
        setSummary(summaryData)

        if (categoriesRes.ok) setCategories(await categoriesRes.json())
        if (monthlyRes.ok) setMonthly(await monthlyRes.json())
        if (marketplaceRes.ok) setMarketplaces(await marketplaceRes.json())
        if (agingRes.ok) setAging(await agingRes.json())
      } catch (err) {
        console.error('Error fetching analytics:', err)
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [timePeriod, retryCount])

  // Chart helpers
  const maxSales = Math.max(...monthly.map((m) => m.sales), 1)

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-serif text-2xl italic text-ink">analytics</h1>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="px-4 py-2 bg-sage text-white rounded font-medium text-sm hover:bg-sage-dk transition-colors"
          >
            Retry
          </button>
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

      {/* Hero stats — the numbers that matter */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-sage/10 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Profit"
            value={summary?.gross_profit || 0}
            prefix="£"
            delta={
              summary && summary.sold_finds > 0
                ? `£${summary.avg_profit_per_item.toFixed(0)} avg per item`
                : 'no sales yet'
            }
          />
          <StatCard
            label="Total sales"
            value={summary?.total_sales || 0}
            prefix="£"
            delta={
              summary ? `${summary.sold_finds} item${summary.sold_finds !== 1 ? 's' : ''} sold` : '—'
            }
          />
          <StatCard
            label="Profit margin"
            value={summary?.profit_margin_pct || 0}
            suffix="%"
            delta={summary && summary.cogs > 0 ? `£${summary.cogs.toFixed(0)} COGS` : '—'}
          />
          <StatCard
            label="Sell-through rate"
            value={summary?.sell_through_pct || 0}
            suffix="%"
            delta={
              summary
                ? `${summary.avg_days_to_sell}d avg to sell`
                : '—'
            }
          />
        </div>
      )}

      {/* Stock value card */}
      {!isLoading && summary && summary.stock_count > 0 && (
        <div className="bg-white border border-sage/14 rounded-md p-5">
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-3">
            Stock on hand
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-[11px] text-ink-lt mb-1">Items in stock</div>
              <div className="font-serif text-xl text-ink">{summary.stock_count}</div>
              <div className="text-[11px] text-ink-lt">
                {summary.listed_finds} listed · {summary.draft_finds} draft
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-lt mb-1">What you paid</div>
              <div className="font-serif text-xl text-ink">
                <span className="font-mono text-sm">£</span>
                {formatGBP(summary.stock_cost)}
              </div>
              <div className="text-[11px] text-ink-lt">capital tied up</div>
            </div>
            <div>
              <div className="text-[11px] text-ink-lt mb-1">Listed value</div>
              <div className="font-serif text-xl text-ink">
                <span className="font-mono text-sm">£</span>
                {formatGBP(summary.stock_listed_value)}
              </div>
              <div className="text-[11px] text-ink-lt">asking prices</div>
            </div>
            <div>
              <div className="text-[11px] text-ink-lt mb-1">Potential profit</div>
              <div className="font-serif text-xl text-ink" style={{ color: '#4A7A45' }}>
                <span className="font-mono text-sm">£</span>
                {formatGBP(summary.stock_listed_value - summary.stock_cost)}
              </div>
              <div className="text-[11px] text-ink-lt">if all sells at asking</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !summary?.total_finds && (
        <div className="text-center py-12">
          <p className="text-ink-lt mb-4">Add and sell finds to see analytics here</p>
        </div>
      )}

      {/* Aged stock alert */}
      {!isLoading && aging && aging.aged_30 > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
          <p className="text-sm text-amber-700 font-medium mb-2">Aged stock alert</p>
          <p className="text-sm text-amber-900 mb-1">
            {aging.aged_90 > 0 && <>{aging.aged_90} items 90+ days · </>}
            {aging.aged_60 - (aging.aged_90 || 0) > 0 && (
              <>{aging.aged_60 - (aging.aged_90 || 0)} items 60+ days · </>
            )}
            {aging.aged_30 - aging.aged_60} items 30+ days
          </p>
          {aging.aged_stock_value > 0 && (
            <p className="text-xs text-amber-800 mb-2">
              £{aging.aged_stock_value.toFixed(0)} tied up in aging stock
            </p>
          )}
          {aging.oldest_item && (
            <p className="text-xs text-amber-700">
              Oldest: {aging.oldest_item.name} ({aging.oldest_item.days_listed}d)
            </p>
          )}
        </div>
      )}

      {/* This month snapshot */}
      {!isLoading && summary && (
        <Panel title="this month">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-[11px] text-ink-lt mb-0.5">Sales</div>
              <div className="font-mono text-sm font-medium text-ink">
                £{summary.this_month_sales.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-lt mb-0.5">Profit</div>
              <div
                className="font-mono text-sm font-medium"
                style={{ color: summary.this_month_profit >= 0 ? '#4A7A45' : '#dc2626' }}
              >
                £{summary.this_month_profit.toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-lt mb-0.5">Items sold</div>
              <div className="font-mono text-sm font-medium text-ink">
                {summary.this_month_items_sold}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-lt mb-0.5">Items sourced</div>
              <div className="font-mono text-sm font-medium text-ink">
                {summary.this_month_items_sourced}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-lt mb-0.5">Expenses + mileage</div>
              <div className="font-mono text-sm font-medium text-ink">
                £{(summary.this_month_expenses + summary.this_month_mileage_gbp).toFixed(0)}
              </div>
            </div>
          </div>
        </Panel>
      )}

      {/* Charts row */}
      {!isLoading && summary && summary.total_finds > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monthly sales chart — real data */}
          <div className="lg:col-span-2">
            <Panel title="monthly sales">
              {monthly.some((m) => m.sales > 0) ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-2 h-40 px-2">
                    {monthly.map((item, idx) => {
                      const isLast = idx === monthly.length - 1
                      const pct = maxSales > 0 ? (item.sales / maxSales) * 100 : 0
                      return (
                        <div
                          key={item.month}
                          className="flex-1 flex flex-col items-center gap-1.5"
                        >
                          <div
                            className={`text-xs font-mono font-medium ${
                              isLast ? 'text-sage' : 'text-ink-md'
                            }`}
                          >
                            {item.sales > 0 ? `£${formatGBP(item.sales)}` : '—'}
                          </div>
                          <div
                            className={`w-full rounded-t transition-all ${
                              isLast ? 'bg-sage' : 'bg-sage-pale'
                            }`}
                            style={{ height: `${Math.max(pct, 4)}%` }}
                          />
                          <div
                            className={`text-xs font-medium ${
                              isLast ? 'text-sage' : 'text-ink-lt'
                            }`}
                          >
                            {item.label}
                          </div>
                          {item.items_sold > 0 && (
                            <div className="text-[10px] text-ink-lt">
                              {item.items_sold} sold
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-ink-lt text-sm py-4">No sales data yet</p>
              )}
            </Panel>
          </div>

          {/* By marketplace */}
          <Panel title="by marketplace">
            {marketplaces.length > 0 ? (
              <div className="space-y-3">
                {marketplaces.map((mp) => {
                  const maxRev = Math.max(...marketplaces.map((m) => m.total_revenue), 1)
                  const pct = (mp.total_revenue / maxRev) * 100
                  return (
                    <div key={mp.marketplace}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-ink-md">{mp.marketplace}</span>
                        <span className="font-mono text-xs text-ink">
                          £{mp.total_revenue.toFixed(0)}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-sage/10 rounded-full">
                        <div
                          className="h-full bg-sage rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-ink-lt mt-0.5">
                        {mp.listed_count} listed · {mp.sold_count} sold
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-ink-lt text-sm py-4">No marketplace data yet</p>
            )}
          </Panel>
        </div>
      )}

      {/* Category breakdown table */}
      {!isLoading && summary && categories.length > 0 && (
        <Panel title="category breakdown">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-sage-dim font-medium border-b border-sage/14">
                <tr>
                  <th className="text-left py-3 px-3">category</th>
                  <th className="text-right py-3 px-3">items</th>
                  <th className="text-right py-3 px-3">revenue</th>
                  <th className="text-right py-3 px-3">avg sold price</th>
                  <th className="text-right py-3 px-3">avg days to sell</th>
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
                      {item.avg_price > 0 ? `£${item.avg_price.toFixed(0)}` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      {item.avg_days_to_sell > 0 ? `${item.avg_days_to_sell}d` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Dynamic insight */}
      {!isLoading && summary && (
        <InsightCard
          type={summary.sell_through_pct > 50 ? 'tip' : 'info'}
          text={generateInsight(summary, aging)}
          link={{
            text: summary.total_finds > 0 ? 'view inventory' : 'add first find',
            onClick: () => {
              window.location.href = summary.total_finds > 0 ? '/finds' : '/add-find'
            },
          }}
        />
      )}
    </div>
  )
}

function generateInsight(
  summary: AnalyticsSummary,
  aging: AgingData | null,
): string {
  if (summary.total_finds === 0) {
    return 'Add items to your inventory to start tracking metrics and insights.'
  }

  if (summary.sold_finds === 0) {
    return `You have ${summary.stock_count} items worth £${summary.stock_listed_value.toFixed(0)} listed. Once you start selling, profit and margin metrics will appear here.`
  }

  // Pick the most useful insight
  if (aging && aging.aged_60 > 5) {
    return `${aging.aged_60} items have been listed for over 60 days — £${aging.aged_stock_value.toFixed(0)} tied up. Consider repricing or bundling slow movers.`
  }

  if (summary.sell_through_pct >= 60) {
    return `${summary.sell_through_pct}% sell-through rate is strong. You're averaging £${summary.avg_profit_per_item.toFixed(0)} profit per item across ${summary.sold_finds} sales.`
  }

  if (summary.profit_margin_pct < 30 && summary.sold_finds > 3) {
    return `Your margin is ${summary.profit_margin_pct}% — tight for resale. Look at your best-performing categories and focus sourcing there.`
  }

  return `${summary.sold_finds} items sold at ${summary.profit_margin_pct}% margin, averaging £${summary.avg_profit_per_item.toFixed(0)} profit each. Sell-through rate: ${summary.sell_through_pct}%.`
}
