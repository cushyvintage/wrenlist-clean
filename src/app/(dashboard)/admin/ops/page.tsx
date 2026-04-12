'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/admin'

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
  ebayConnected: number
  vintedConnected: number
  etsyConnected: number
  shopifyConnected: number
  totalProducts: number
  activeListings: number
  stashes: number
  recentSignups: RecentSignup[]
}

function StatCard({ label, value, unit = '' }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="bg-white rounded-lg border border-sage/14 p-4 flex flex-col">
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

  // Admin gate
  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (!user || !isAdmin(user.email)) {
    return null
  }

  // Fetch metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/admin/ops-metrics')

        if (!response.ok) {
          throw new Error('Failed to fetch metrics')
        }

        const data = await response.json()
        setMetrics(data.data)
        setError(null)
      } catch (err) {
        setError((err as any).message || 'Failed to load metrics')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-semibold text-ink mb-6">Ops Dashboard</h1>
          <p className="text-sage-dim">Loading metrics...</p>
        </div>
      </div>
    )
  }

  if (error) {
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
  const conversionRate = metrics.totalUsers > 0 ? ((metrics.payingUsers / metrics.totalUsers) * 100).toFixed(1) : '0'
  const listingRate = metrics.totalProducts > 0 ? ((metrics.activeListings / metrics.totalProducts) * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-cream p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold text-ink mb-8">Ops Dashboard</h1>

        {/* Row 1: KPI Cards */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">KPIs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={metrics.totalUsers} />
            <StatCard label="Paying Users" value={metrics.payingUsers} />
            <StatCard label="New This Week" value={metrics.newSignupsThisWeek} />
            <StatCard label="MRR Estimate" value={formattedMRR} />
          </div>
        </section>

        {/* Row 2: Platform Connections */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">Platform Connections</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="eBay Connected" value={metrics.ebayConnected} />
            <StatCard label="Vinted Connected" value={metrics.vintedConnected} />
            <StatCard label="Etsy Connected" value={metrics.etsyConnected} />
            <StatCard label="Shopify Connected" value={metrics.shopifyConnected} />
          </div>
        </section>

        {/* Row 3: Inventory Health */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-sage-dim uppercase tracking-[.08em] mb-4">Inventory Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Products" value={metrics.totalProducts} />
            <StatCard label="Active Listings" value={metrics.activeListings} />
            <StatCard label="Listing Rate" value={listingRate} unit="%" />
            <StatCard label="Stashes" value={metrics.stashes} />
          </div>
        </section>

        {/* Row 4: Recent Signups Table */}
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
                          <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#E8F5E3' }}>
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
        <div className="mt-8 pt-6 border-t border-sage/14">
          <p className="text-xs text-sage-dim">Last updated: {new Date().toLocaleString('en-GB')}</p>
        </div>
      </div>
    </div>
  )
}
