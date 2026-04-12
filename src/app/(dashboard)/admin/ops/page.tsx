'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/admin'
import { fetchApi } from '@/lib/api-utils'

interface RecentSignup {
  email: string
  createdAt: string
  plan: string
  platformCount: number
}

interface OpsMetrics {
  totalUsers: number
  payingUsers: number
  newSignupsThisWeek: number
  mrrEstimate: number
  conversionRate: number
  ebayConnected: number
  vintedConnected: number
  etsyConnected: number
  shopifyConnected: number
  depopConnected: number
  totalProducts: number
  activeListings: number
  listingRate: number
  stashes: number
  extensionActive7d: number
  publishJobs24h: number
  errorEvents24h: number
  deletedAccounts: number
  avgDaysActiveBeforeChurn: number | null
  revenueLostToChurn: number
  anonymisedSalesCount: number
  soldCompsTotal: number
  soldCompsAvgPrice: number
  soldCompsPlatforms: Record<string, number>
  soldCompsAvgDaysToSell: number
  recentSignups: RecentSignup[]
}

function StatCard({
  label,
  value,
  unit = '',
  highlight = false,
}: {
  label: string
  value: string | number
  unit?: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-white rounded-lg border p-4 flex flex-col ${highlight ? 'border-amber-300 bg-amber-50/30' : 'border-sage/14'}`}>
      <div className="text-xs text-sage-dim uppercase tracking-[.08em] font-semibold mb-2">{label}</div>
      <div className="text-2xl font-semibold text-ink">
        {value}
        {unit && <span className="text-lg ml-1">{unit}</span>}
      </div>
    </div>
  )
}

export default function OpsAdminPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [metrics, setMetrics] = useState<OpsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Admin gate — inside effect, not between hooks
  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await fetchApi<OpsMetrics>('/api/admin/ops-metrics')
      setMetrics(data)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError((err as Error).message || 'Failed to load metrics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    if (user && isAdmin(user.email)) {
      loadMetrics()
    }
  }, [user, loadMetrics])

  // Auto-refresh every 60s
  useEffect(() => {
    if (!user || !isAdmin(user.email)) return
    const interval = setInterval(loadMetrics, 60_000)
    return () => clearInterval(interval)
  }, [user, loadMetrics])

  // Gate render (after all hooks)
  if (!user || !isAdmin(user.email)) {
    return null
  }

  if (isLoading && !metrics) {
    return (
      <div className="min-h-screen bg-cream p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-ink mb-6">Ops Dashboard</h1>
          <p className="text-sage-dim">Loading metrics...</p>
        </div>
      </div>
    )
  }

  if (error && !metrics) {
    return (
      <div className="min-h-screen bg-cream p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-ink mb-6">Ops Dashboard</h1>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-cream p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-ink mb-6">Ops Dashboard</h1>
          <p className="text-sage-dim">No data available.</p>
        </div>
      </div>
    )
  }

  const formattedMRR = `£${metrics.mrrEstimate.toLocaleString('en-GB')}`

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with refresh */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-ink">Ops Dashboard</h1>
          <button
            onClick={loadMetrics}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium text-sage-dim border border-sage/14 rounded-md hover:bg-white transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>

        {/* Row 1: KPIs */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">KPIs</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Users" value={metrics.totalUsers} />
            <StatCard label="Paying Users" value={metrics.payingUsers} />
            <StatCard label="Conversion" value={metrics.conversionRate} unit="%" />
            <StatCard label="New This Week" value={metrics.newSignupsThisWeek} />
            <StatCard label="MRR" value={formattedMRR} highlight />
          </div>
        </section>

        {/* Row 2: Platform Connections */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">Platform Connections</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="eBay" value={metrics.ebayConnected} />
            <StatCard label="Vinted" value={metrics.vintedConnected} />
            <StatCard label="Etsy" value={metrics.etsyConnected} />
            <StatCard label="Shopify" value={metrics.shopifyConnected} />
            <StatCard label="Depop" value={metrics.depopConnected} />
          </div>
        </section>

        {/* Row 3: Inventory Health */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">Inventory Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Products" value={metrics.totalProducts} />
            <StatCard label="Active Listings" value={metrics.activeListings} />
            <StatCard label="Listing Rate" value={metrics.listingRate} unit="%" />
            <StatCard label="Stashes" value={metrics.stashes} />
          </div>
        </section>

        {/* Row 4: Activity & Health */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">Activity (24h / 7d)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Extension Active (7d)" value={metrics.extensionActive7d} />
            <StatCard label="Publish Jobs (24h)" value={metrics.publishJobs24h} />
            <StatCard label="Errors (24h)" value={metrics.errorEvents24h} highlight={metrics.errorEvents24h > 0} />
          </div>
        </section>

        {/* Row 5: Churn */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">Churn</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Deleted Accounts" value={metrics.deletedAccounts} highlight={metrics.deletedAccounts > 0} />
            <StatCard label="Avg Days Active" value={metrics.avgDaysActiveBeforeChurn ?? '—'} />
            <StatCard label="Revenue Lost" value={`£${metrics.revenueLostToChurn.toLocaleString('en-GB')}`} />
            <StatCard label="Anonymised Sales" value={metrics.anonymisedSalesCount} />
          </div>
        </section>

        {/* Row 6: Sold Comps / ML Training Data */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">Sold Comps / ML Training</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Sold Records" value={metrics.soldCompsTotal} highlight />
            <StatCard label="Avg Sale Price" value={`£${metrics.soldCompsAvgPrice.toFixed(2)}`} />
            <StatCard label="Avg Days to Sell" value={metrics.soldCompsAvgDaysToSell} />
            <StatCard
              label="Platforms"
              value={Object.entries(metrics.soldCompsPlatforms)
                .map(([p, c]) => `${p}: ${c}`)
                .join(', ') || '—'}
            />
          </div>
        </section>

        {/* Row 7: Recent Signups Table */}
        <section>
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">Recent Signups (Last 10)</h2>
          <div className="bg-white rounded-lg border border-sage/14 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#FDFBF7' }} className="border-b border-sage/14">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-sage-dim uppercase tracking-[.08em]">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-sage-dim uppercase tracking-[.08em]">
                      Signed Up
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-sage-dim uppercase tracking-[.08em]">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-sage-dim uppercase tracking-[.08em]">
                      Platforms
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentSignups.length > 0 ? (
                    metrics.recentSignups.map((signup, idx) => (
                      <tr key={idx} className="border-b border-sage/14 hover:bg-cream/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-ink font-mono">{signup.email}</td>
                        <td className="px-4 py-3 text-sm text-sage-dim">
                          {new Date(signup.createdAt).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-ink capitalize">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: signup.plan === 'free' ? '#f3f4f6' : '#E8F5E3',
                              color: signup.plan === 'free' ? '#6b7280' : '#2d5016',
                            }}
                          >
                            {signup.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-sage-dim">{signup.platformCount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sage-dim">
                        No recent signups
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Metadata */}
        <div className="mt-8 pt-6 border-t border-sage/14 flex items-center justify-between">
          <p className="text-xs text-sage-dim">
            Last updated: {lastUpdated ? lastUpdated.toLocaleString('en-GB') : '—'}
            {isLoading && <span className="ml-2 text-sage-dim/60">refreshing…</span>}
          </p>
          <p className="text-xs text-sage-dim">Auto-refreshes every 60s</p>
        </div>
      </div>
    </div>
  )
}
