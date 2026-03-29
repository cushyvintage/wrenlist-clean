'use client'

import { useState } from 'react'
import { Badge } from '@/components/wren/Badge'

interface Haul {
  id: string
  date: string
  supplier_name: string
  location: string
  items_found: number
  total_spend: number
  avg_margin_pct: number
  status: 'pending' | 'completed'
}

const mockHauls: Haul[] = [
  {
    id: 'h1',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    supplier_name: 'Oxfam High Street',
    location: 'Manchester',
    items_found: 14,
    total_spend: 28.5,
    avg_margin_pct: 182,
    status: 'completed',
  },
  {
    id: 'h2',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    supplier_name: 'Car Boot Sale - Stockport',
    location: 'Stockport',
    items_found: 22,
    total_spend: 45.0,
    avg_margin_pct: 156,
    status: 'completed',
  },
  {
    id: 'h3',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    supplier_name: 'House Clearance - Wilmslow',
    location: 'Wilmslow',
    items_found: 38,
    total_spend: 120.0,
    avg_margin_pct: 198,
    status: 'completed',
  },
  {
    id: 'h4',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    supplier_name: 'British Heart Foundation',
    location: 'City Centre',
    items_found: 9,
    total_spend: 18.75,
    avg_margin_pct: 224,
    status: 'completed',
  },
  {
    id: 'h5',
    date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    supplier_name: 'Flea Market - Castlefield',
    location: 'Castlefield',
    items_found: 31,
    total_spend: 85.0,
    avg_margin_pct: 167,
    status: 'completed',
  },
  {
    id: 'h6',
    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    supplier_name: 'Charity Shop Haul - TK Maxx',
    location: 'Manchester',
    items_found: 19,
    total_spend: 52.3,
    avg_margin_pct: 189,
    status: 'completed',
  },
  {
    id: 'h7',
    date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    supplier_name: 'Vintage Fair - Macclesfield',
    location: 'Macclesfield',
    items_found: 26,
    total_spend: 95.5,
    avg_margin_pct: 175,
    status: 'completed',
  },
]

type FilterType = 'all' | 'this_week' | 'this_month' | 'completed' | 'pending'

export default function SourcingPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000

  // Filter hauls
  const filtered = mockHauls.filter((haul) => {
    const haulDate = new Date(haul.date).getTime()

    const matchesFilter =
      filter === 'all' ||
      (filter === 'this_week' && haulDate >= oneWeekAgo) ||
      (filter === 'this_month' && haulDate >= oneMonthAgo) ||
      (filter === 'completed' && haul.status === 'completed') ||
      (filter === 'pending' && haul.status === 'pending')

    return matchesFilter
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-sage/14 pb-6">
        <h1 className="font-serif text-2xl italic text-ink mb-4">sourcing log</h1>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'this_week', 'this_month', 'completed', 'pending'] as const).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                  filter === f
                    ? 'bg-sage-pale border border-sage text-sage'
                    : 'bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream'
                }`}
              >
                {f === 'all'
                  ? 'all hauls'
                  : f === 'this_week'
                    ? 'this week'
                    : f === 'this_month'
                      ? 'this month'
                      : f}
              </button>
            )
          )}
        </div>
      </div>

      {/* Add New Haul Button */}
      <div className="flex justify-end">
        <button className="px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors">
          + Add haul
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-sage/14 rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-cream border-b border-sage/14">
              <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                Location
              </th>
              <th className="px-6 py-3 text-right text-xs uppercase tracking-wider font-medium text-sage-dim">
                Items Found
              </th>
              <th className="px-6 py-3 text-right text-xs uppercase tracking-wider font-medium text-sage-dim">
                Total Spend
              </th>
              <th className="px-6 py-3 text-right text-xs uppercase tracking-wider font-medium text-sage-dim">
                Avg Margin
              </th>
              <th className="px-6 py-3 text-center text-xs uppercase tracking-wider font-medium text-sage-dim">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-ink-lt">
                  No hauls found
                </td>
              </tr>
            ) : (
              filtered.map((haul) => (
                <tr
                  key={haul.id}
                  className="border-b border-sage/14 hover:bg-cream transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-ink font-medium">
                    {formatDate(haul.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink">
                    {haul.supplier_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-lt">
                    {haul.location}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono text-ink">
                    {haul.items_found}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono text-ink">
                    £{haul.total_spend.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-mono text-sage font-medium">
                    {haul.avg_margin_pct}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge
                      status={
                        haul.status === 'completed' ? 'listed' : 'on_hold'
                      }
                      label={haul.status}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-cream-md rounded-md p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-2">
              Total Hauls
            </div>
            <div className="font-serif text-2xl font-medium text-ink">
              {filtered.length}
            </div>
          </div>
          <div className="bg-cream-md rounded-md p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-2">
              Items Found
            </div>
            <div className="font-serif text-2xl font-medium text-ink">
              {filtered.reduce((sum, h) => sum + h.items_found, 0)}
            </div>
          </div>
          <div className="bg-cream-md rounded-md p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-2">
              Total Spend
            </div>
            <div className="font-serif text-2xl font-medium text-ink">
              £{filtered.reduce((sum, h) => sum + h.total_spend, 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-cream-md rounded-md p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-2">
              Avg Margin
            </div>
            <div className="font-serif text-2xl font-medium text-sage">
              {Math.round(
                filtered.reduce((sum, h) => sum + h.avg_margin_pct, 0) /
                  filtered.length
              )}
              %
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
