'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/wren/Badge'
import type { Find } from '@/types'

interface HaulGroup {
  date: string
  sourceType: string
  sourceName: string
  items: Find[]
  totalSpend: number
  avgMarginPct: number
}

type FilterType = 'all' | 'this_week' | 'this_month' | 'house_clearance' | 'charity_shop' | 'car_boot' | 'online_haul' | 'flea_market' | 'other'

export default function SourcingPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [hauls, setHauls] = useState<HaulGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch finds from API and group by sourcing haul
   */
  useEffect(() => {
    async function fetchFinds() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/finds')
        if (!response.ok) {
          throw new Error('Failed to fetch finds')
        }
        const result = await response.json()
        const finds = result.data as Find[]

        // Group finds by sourced_at date + source combo
        const grouped = new Map<string, Find[]>()
        finds.forEach((find) => {
          const date = find.sourced_at?.substring(0, 10) || new Date().toISOString().substring(0, 10)
          const key = `${date}|${find.source_type}|${find.source_name}`
          if (!grouped.has(key)) {
            grouped.set(key, [])
          }
          grouped.get(key)!.push(find)
        })

        // Convert to HaulGroup array
        const haulGroups: HaulGroup[] = Array.from(grouped.entries()).map(
          ([key, items]) => {
            const [date = '', sourceType, sourceName] = key.split('|')
            const totalSpend = items.reduce((sum, item) => sum + (item.cost_gbp || 0), 0)
            const validMargins = items
              .map((item) => {
                if (!item.cost_gbp || !item.asking_price_gbp) return null
                return ((item.asking_price_gbp - item.cost_gbp) / item.asking_price_gbp) * 100
              })
              .filter((m) => m !== null) as number[]

            const avgMarginPct =
              validMargins.length > 0
                ? Math.round(validMargins.reduce((a, b) => a + b, 0) / validMargins.length)
                : 0

            return {
              date,
              sourceType: sourceType || 'other',
              sourceName: sourceName || 'Unknown',
              items,
              totalSpend,
              avgMarginPct,
            }
          }
        )

        // Sort by date descending
        haulGroups.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        setHauls(haulGroups)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching finds:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFinds()
  }, [])

  const now = Date.now()
  const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000
  const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000

  // Filter hauls
  const filtered = hauls.filter((haul) => {
    const haulDate = new Date(haul.date).getTime()

    if (filter === 'all') return true
    if (filter === 'this_week') return haulDate >= oneWeekAgo
    if (filter === 'this_month') return haulDate >= oneMonthAgo
    // Otherwise filter is a source type
    return haul.sourceType === (filter as unknown as string)
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    })
  }

  const sourceTypeLabels: Record<string, string> = {
    house_clearance: 'House clearance',
    charity_shop: 'Charity shop',
    car_boot: 'Car boot',
    online_haul: 'Online haul',
    flea_market: 'Flea market',
    other: 'Other',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-sage/14 pb-6">
        <h1 className="font-serif text-2xl italic text-ink mb-4">sourcing log</h1>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'this_week', 'this_month', 'house_clearance', 'charity_shop', 'car_boot', 'online_haul', 'flea_market'] as const).map(
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
                      : sourceTypeLabels[f]}
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

      {/* Loading State */}
      {isLoading && (
        <div className="text-center text-ink-lt py-8">
          Loading hauls...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-amber/10 border border-amber/30 rounded p-3 text-sm text-amber">
          {error}
        </div>
      )}

      {/* Table */}
      {!isLoading && (
        <div className="bg-white border border-sage/14 rounded-md overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-cream border-b border-sage/14">
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                  Source Type
                </th>
                <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">
                  Source Name
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-ink-lt">
                    No hauls found
                  </td>
                </tr>
              ) : (
                filtered.map((haul) => (
                  <tr
                    key={`${haul.date}|${haul.sourceType}|${haul.sourceName}`}
                    className="border-b border-sage/14 hover:bg-cream transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-ink font-medium">
                      {formatDate(haul.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink">
                      {sourceTypeLabels[haul.sourceType] || haul.sourceType}
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-lt">
                      {haul.sourceName}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-ink">
                      {haul.items.length}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-ink">
                      £{haul.totalSpend.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-mono text-sage font-medium">
                      {haul.avgMarginPct}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {!isLoading && filtered.length > 0 && (
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
              {filtered.reduce((sum, h) => sum + h.items.length, 0)}
            </div>
          </div>
          <div className="bg-cream-md rounded-md p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-2">
              Total Spend
            </div>
            <div className="font-serif text-2xl font-medium text-ink">
              £{filtered.reduce((sum, h) => sum + h.totalSpend, 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-cream-md rounded-md p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-2">
              Avg Margin
            </div>
            <div className="font-serif text-2xl font-medium text-sage">
              {filtered.length > 0
                ? Math.round(
                    filtered.reduce((sum, h) => sum + h.avgMarginPct, 0) /
                      filtered.length
                  )
                : 0}
              %
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
