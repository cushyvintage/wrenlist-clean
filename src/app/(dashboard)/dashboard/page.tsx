'use client'

import { useEffect, useMemo, useState } from 'react'
import { StatCard } from '@/components/wren/StatCard'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { InventoryRow } from '@/components/wren/InventoryRow'
import { Button } from '@/components/wren/Button'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { unwrapApiResponse } from '@/lib/api-utils'
import { useConnectedPlatforms } from '@/hooks/useConnectedPlatforms'
import { SessionExpiryBanner } from '@/components/layout/SessionExpiryBanner'
import { useCountUp } from '@/hooks/useCountUp'
import type { Find } from '@/types'
import { PLACEHOLDER_KEYS } from '@/lib/insights/types'

const COUNT_UP_SESSION_KEY = 'dashCountedUp'

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

interface WrenInsight {
  key: string
  text: string
  type: 'alert' | 'tip' | 'info'
  cta: { text: string; href: string }
  meta?: Record<string, number | string>
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [finds, setFinds] = useState<Find[]>([])
  const [insights, setInsights] = useState<WrenInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { disconnected } = useConnectedPlatforms({ pollInterval: 60_000 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch summary, finds, and insight
        const [summaryRes, findsRes, insightRes] = await Promise.all([
          fetch('/api/analytics/summary'),
          fetch('/api/finds'),
          fetch('/api/insights/wren'),
        ])

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json()
          setSummary(summaryData)
        }

        if (findsRes.ok) {
          const json = await findsRes.json()
          const response = unwrapApiResponse<{ items: Find[] }>(json)
          setFinds(response?.items || [])
        }

        if (insightRes.ok) {
          const json = await insightRes.json()
          const response = unwrapApiResponse<{ insights: WrenInsight[] }>(json)
          setInsights(response?.insights ?? [])
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setFinds([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Use summary data for metrics
  const activeFinds = summary?.stock_count ?? 0
  const monthlyRevenue = summary?.this_month_sales || 0
  const monthlyProfit = summary?.this_month_profit || 0
  const avgMargin = summary?.profit_margin_pct || 0
  const avgDaysToSell = summary?.avg_days_to_sell || 0

  // Count-up animation runs once per session across all 4 stat cards.
  // The session gate is read ONCE at mount (useMemo) so all 4 cards stay in
  // sync for this render tree. The first card passes sessionKey so it writes
  // the gate on completion — the other three share `enabled` from the
  // page-level memo and animate in the same wave.
  const countUpEnabled = useMemo(() => {
    if (isLoading) return false
    if (typeof window === 'undefined') return false
    try {
      return !window.sessionStorage.getItem(COUNT_UP_SESSION_KEY)
    } catch {
      return false
    }
  }, [isLoading])

  const animatedActiveFinds = useCountUp(activeFinds, {
    enabled: countUpEnabled,
    sessionKey: COUNT_UP_SESSION_KEY,
  })
  const animatedMonthlyRevenue = useCountUp(monthlyRevenue, { enabled: countUpEnabled })
  const animatedAvgMargin = useCountUp(avgMargin, { enabled: countUpEnabled })
  const animatedAvgDaysToSell = useCountUp(avgDaysToSell, { enabled: countUpEnabled })

  const recentFinds = finds.slice(0, 3)
  const findsList = isLoading ? 'skeleton' : finds.length === 0 ? 'empty' : 'loaded'

  const getGreeting = () => {
    const hour = new Date().getHours()
    const rawName = user?.full_name || user?.email?.split('@')[0] || 'there'
    const firstWord = rawName.split(' ')[0] ?? rawName
    const firstName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase()

    if (hour < 12) return `Good morning, ${firstName}`
    if (hour < 18) return `Good afternoon, ${firstName}`
    return `Good evening, ${firstName}`
  }

  return (
    <div className="space-y-8">
      <SessionExpiryBanner disconnected={disconnected} />

      {/* Welcome section */}
      <div>
        <h1 className="font-serif text-4xl italic font-normal mb-2" style={{ color: '#1E2E1C' }}>
          {getGreeting()}
        </h1>
        <p style={{ color: '#6B7D6A' }}>
          You have {activeFinds} active find{activeFinds !== 1 ? 's' : ''} in your inventory
        </p>
      </div>

      {/* New user: Vinted import nudge — only when fewer than 5 finds */}
      {!isLoading && finds.length < 5 && (
        <div className="rounded-lg border border-[rgba(61,92,58,0.14)] bg-white p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
          <div>
            <div className="text-sm font-medium text-ink mb-1">
              Already selling on Vinted? Bring your listings across.
            </div>
            <p className="text-xs text-ink-lt">
              One-click import of your active Vinted inventory into Wrenlist. Takes 60 seconds.
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push('/import?platform=vinted')}
            className="flex-shrink-0 text-sage hover:text-sage-dk"
          >
            Import from Vinted →
          </Button>
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-sage/10 rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            className="stat-card-stagger"
            label="Active stock"
            value={Math.round(animatedActiveFinds)}
            delta={`${summary?.listed_finds || 0} listed · ${summary?.draft_finds || 0} draft`}
          />
          <StatCard
            className="stat-card-stagger"
            label="This month sales"
            value={Math.round(animatedMonthlyRevenue)}
            prefix="£"
            delta={`${summary?.this_month_items_sold || 0} sold · £${monthlyProfit.toFixed(0)} profit`}
          />
          <StatCard
            className="stat-card-stagger"
            label="Profit margin"
            value={Math.round(animatedAvgMargin)}
            suffix="%"
            delta={`£${(summary?.avg_profit_per_item || 0).toFixed(0)} avg per item`}
          />
          <StatCard
            className="stat-card-stagger"
            label="Days to sell"
            value={Math.round(animatedAvgDaysToSell)}
            suffix=" days"
            delta={`${summary?.sell_through_pct || 0}% sell-through`}
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent inventory */}
        <div className="lg:col-span-2">
          <Panel title="Recent finds" action={{ text: 'View all →', onClick: () => router.push('/finds') }}>
            {findsList === 'empty' ? (
              <div className="py-8 text-center">
                <p className="text-ink-lt mb-4">No items in your inventory yet</p>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/add-find')}
                  className="text-sage hover:text-sage-dk"
                >
                  Add your first find →
                </Button>
              </div>
            ) : findsList === 'skeleton' ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-sage/10 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ color: '#8A9E88' }}>
                  <tr style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}>
                    <th className="text-left py-3 px-4 text-[10px] uppercase tracking-[.08em] font-medium">Item</th>
                    <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[.08em] font-medium">Cost</th>
                    <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[.08em] font-medium">Price</th>
                    <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[.08em] font-medium">Margin</th>
                    <th className="text-right py-3 px-4 text-[10px] uppercase tracking-[.08em] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFinds.map((find) => (
                    <InventoryRow
                      key={find.id}
                      find={find}
                      onClick={() => router.push(`/finds/${find.id}`)}
                    />
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Right: Insights & activity */}
        <div className="space-y-4">
          {/* Wren insights — up to 3, stacked */}
          {insights.map((insight) => (
            <InsightCard
              key={insight.key}
              text={insight.text}
              type={insight.type}
              link={{
                text: insight.cta.text,
                onClick: () => {
                  // sendBeacon survives page teardown from router.push().
                  // A plain fetch would often be aborted mid-flight, losing
                  // the click event from our analytics.
                  try {
                    const body = new Blob(
                      [JSON.stringify({ insight_key: insight.key })],
                      { type: 'application/json' },
                    )
                    navigator.sendBeacon?.('/api/insights/clicked', body)
                  } catch {
                    /* best-effort; never block navigation */
                  }
                  router.push(insight.cta.href)
                },
              }}
              onDismiss={
                PLACEHOLDER_KEYS.has(insight.key)
                  ? undefined
                  : async () => {
                      // Optimistic removal by key — rollback on failure reinserts
                      // the snapshot taken *inside* the updater so we capture the
                      // freshest state, not a render-time closure.
                      let snapshot: WrenInsight[] = []
                      setInsights((prev) => {
                        snapshot = prev
                        return prev.filter((i) => i.key !== insight.key)
                      })
                      try {
                        const res = await fetch('/api/insights/dismiss', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ insight_key: insight.key, days: 7 }),
                        })
                        if (!res.ok) throw new Error('Dismiss failed')
                      } catch (err) {
                        console.error('[dashboard] dismiss failed:', err)
                        setInsights(snapshot)
                      }
                    }
              }
            />
          ))}

          {/* Quick stats */}
          <Panel title="This month">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-lt">Items sourced</span>
                <span className="font-medium text-ink">{summary?.this_month_items_sourced || 0}</span>
              </div>
              <div className="flex justify-between border-t border-sage/14 pt-3">
                <span className="text-ink-lt">Items sold</span>
                <span className="font-medium text-ink">{summary?.this_month_items_sold || 0}</span>
              </div>
              <div className="flex justify-between border-t border-sage/14 pt-3">
                <span className="text-ink-lt">Sales</span>
                <span className="font-mono font-medium text-ink">£{monthlyRevenue.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-sage/14 pt-3">
                <span className="text-ink-lt">Profit</span>
                <span
                  className="font-mono font-medium"
                  style={{ color: monthlyProfit >= 0 ? '#4A7A45' : '#dc2626' }}
                >
                  £{monthlyProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </Panel>

          {/* CTA */}
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/add-find')}
            className="w-full"
          >
            ➕ Add new find
          </Button>
        </div>
      </div>

      {/* Activity section */}
      <Panel title="Recent activity">
        {finds.length === 0 ? (
          <p className="text-ink-lt text-sm">No activity yet. Add a find to get started.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {finds.slice(0, 3).map((find) => (
              <div key={find.id} className="pb-3 border-b border-sage/14 last:border-0">
                <p className="font-medium text-ink">
                  {find.status === 'sold' ? 'Sold' : 'Added'} &ldquo;{find.name && !/^[0-9a-f-]{36}$/.test(find.name) ? find.name : 'Untitled item'}&rdquo;
                </p>
                <p className="text-xs text-ink-lt mt-1">
                  {find.status === 'sold' && find.sold_at
                    ? `${new Date(find.sold_at).toLocaleDateString()} • £${find.sold_price_gbp}`
                    : [new Date(find.created_at).toLocaleDateString(), find.source_name || find.source_type || null].filter(Boolean).join(' • ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}
