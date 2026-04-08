'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/wren/StatCard'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { InventoryRow } from '@/components/wren/InventoryRow'
import { Button } from '@/components/wren/Button'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { unwrapApiResponse } from '@/lib/api-utils'
import type { Find } from '@/types'

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

interface WrenInsight {
  insight: string
  type: 'alert' | 'tip' | 'info'
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [finds, setFinds] = useState<Find[]>([])
  const [insight, setInsight] = useState<WrenInsight | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
          const insightData = await insightRes.json()
          setInsight(insightData)
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
  const activeFinds = summary ? (summary.total_finds - summary.sold_finds) : 0
  const monthlyRevenue = summary?.this_month_revenue || 0
  const avgMargin = summary?.gross_margin_pct || 0
  const avgDaysToSell = summary?.avg_days_to_sell || 0

  // Current month metrics
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

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
      {/* Welcome section */}
      <div>
        <h1 className="font-serif text-4xl italic font-normal mb-2" style={{ color: '#1E2E1C' }}>
          {getGreeting()}
        </h1>
        <p style={{ color: '#6B7D6A' }}>
          You have {activeFinds} active find{activeFinds !== 1 ? 's' : ''} in your inventory
        </p>
      </div>

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
            label="Active finds"
            value={activeFinds}
            delta={`${summary?.listed_finds || 0} listed`}
            suffix=""
          />
          <StatCard
            label="Monthly revenue"
            value={monthlyRevenue}
            prefix="£"
            delta={`£${monthlyRevenue.toFixed(2)}`}
            suffix=""
          />
          <StatCard
            label="Avg margin"
            value={avgMargin}
            suffix="%"
            delta="from sold items"
          />
          <StatCard
            label="Days to sell"
            value={avgDaysToSell}
            suffix=" days"
            delta="average"
          />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent inventory */}
        <div className="lg:col-span-2">
          <Panel title="Recent inventory" action={{ text: 'View all →', onClick: () => router.push('/finds') }}>
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
          {/* Wren insight */}
          {insight && (
            <InsightCard
              text={insight.insight}
              type={insight.type}
              link={{
                text: insight.type === 'alert' ? 'adjust prices' : 'view finds →',
                onClick: () => router.push(insight.type === 'alert' ? '/finds' : '/add-find'),
              }}
            />
          )}

          {/* Quick stats */}
          <Panel title="This month">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-lt">Finds listed</span>
                <span className="font-medium text-ink">{summary?.this_month_finds || 0}</span>
              </div>
              <div className="flex justify-between border-t border-sage/14 pt-3">
                <span className="text-ink-lt">Items sold</span>
                <span className="font-medium text-ink">{summary?.sold_finds || 0}</span>
              </div>
              <div className="flex justify-between border-t border-sage/14 pt-3">
                <span className="text-ink-lt">Total revenue</span>
                <span className="font-mono font-medium text-ink">£{monthlyRevenue.toFixed(2)}</span>
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
