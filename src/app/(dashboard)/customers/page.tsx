'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { useApiCall } from '@/hooks/useApiCall'
import { fetchApi } from '@/lib/api-utils'
import type { Customer, Platform } from '@/types'
import Link from 'next/link'

interface CustomersResponse {
  customers: Customer[]
  stats: { total: number; repeatCustomers: number; avgOrders: number }
}

export default function CustomersPage() {
  const router = useRouter()
  const { data, isLoading, error, call } = useApiCall<CustomersResponse>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    call(() => fetchApi<CustomersResponse>(`/api/customers?${params}`))
  }, [call, debouncedSearch])

  const customers = data?.customers ?? []
  const stats = data?.stats

  const formatDate = (d: string | null) => {
    if (!d) return '--'
    const date = new Date(d)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (diff === 0) return 'today'
    if (diff === 1) return 'yesterday'
    if (diff < 7) return `${diff}d ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="font-serif text-2xl italic text-ink">customers</h1>
          <p className="text-xs text-ink-lt mt-1">Track buyers across your marketplaces</p>
        </div>
        <input
          type="text"
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-sage w-48"
        />
      </div>

      {error && (
        <div className="bg-red-lt border border-red-dk/20 rounded p-3 text-sm text-red-dk">{error}</div>
      )}

      {isLoading && <div className="text-center py-8 text-ink-lt">Loading customers...</div>}

      {!isLoading && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="total customers" value={stats.total.toString()} />
          <StatCard label="repeat customers" value={stats.repeatCustomers.toString()} delta={stats.total > 0 ? `${Math.round((stats.repeatCustomers / stats.total) * 100)}% of total` : ''} />
          <StatCard label="avg orders" value={stats.avgOrders.toString()} delta="per customer" />
        </div>
      )}

      {!isLoading && customers.length === 0 && (
        <Panel>
          <div className="py-12 text-center">
            <p className="text-ink-lt text-sm mb-4">No customers yet</p>
            <p className="text-xs text-ink-lt mb-6">Customers are created automatically when you sync sales from your marketplaces.</p>
            <Link href="/sold" className="inline-block px-4 py-2 bg-sage text-cream rounded text-sm font-medium hover:bg-sage-lt transition-colors">
              Go to sold items
            </Link>
          </div>
        </Panel>
      )}

      {!isLoading && customers.length > 0 && (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Platform</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Username</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Orders</th>
                  <th className="px-3 py-2 text-right font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Total Spent</th>
                  <th className="px-3 py-2 text-left font-medium text-ink-lt text-[10px] uppercase tracking-[.08em]">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr
                    key={c.id}
                    className={`border-b border-border hover:bg-cream-md transition cursor-pointer ${c.total_orders >= 2 ? 'bg-green-50/40' : ''}`}
                    onClick={() => router.push(`/customers/${c.id}`)}
                  >
                    <td className="px-3 py-2">
                      <MarketplaceIcon platform={c.marketplace as Platform} size="sm" />
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-ink font-medium">{c.full_name || c.username || '--'}</span>
                      {c.total_orders >= 2 && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">repeat</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink-lt text-xs">{c.username || '--'}</td>
                    <td className="px-3 py-2 text-right font-mono">{c.total_orders}</td>
                    <td className="px-3 py-2 text-right font-mono">£{Number(c.total_spent_gbp).toFixed(2)}</td>
                    <td className="px-3 py-2 text-ink-lt text-xs">{formatDate(c.last_order_at)}</td>
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
