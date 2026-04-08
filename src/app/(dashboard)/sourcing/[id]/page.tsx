'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { SOURCING_TRIP_TYPES } from '@/types'
import type { SourcingTripWithStats, Find } from '@/types'

interface TripDetail extends SourcingTripWithStats {
  finds: Find[]
}

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [trip, setTrip] = useState<TripDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tripId, setTripId] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ id }) => {
      setTripId(id)
      fetchTrip(id)
    })
  }, [params])

  async function fetchTrip(id: string) {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sourcing/${id}`)
      if (!response.ok) {
        throw new Error('Failed to load trip')
      }
      const data = await response.json()
      setTrip(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error fetching trip:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00Z')
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (isLoading) {
    return (
      <div className="text-center text-ink-lt py-8">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
        Loading trip...
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/sourcing" className="text-xs text-sage hover:text-ink inline-flex items-center gap-1">&larr; Back to Sourcing</Link>
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error || 'Trip not found'}
        </div>
      </div>
    )
  }

  const mileageDeductible = (trip.miles || 0) * 0.45
  const tripCostGbp = (trip.entry_fee_gbp || 0) + mileageDeductible
  const totalCostGbp = trip.total_spent_gbp + tripCostGbp

  return (
    <div className="flex flex-col gap-6">
      <Link href="/sourcing" className="text-xs text-sage hover:text-ink mb-4 inline-flex items-center gap-1">&larr; Back to Sourcing</Link>

      <div className="border-b border-sage/14 pb-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="font-serif text-2xl italic text-ink">{trip.name}</h1>
            <span className="text-xs bg-sage/8 text-sage-dim px-2 py-0.5 rounded">
              {SOURCING_TRIP_TYPES[trip.type]}
            </span>
          </div>
          <div className="text-sm text-ink-lt">
            {formatDate(trip.date)}
            {trip.location && ` • ${trip.location}`}
          </div>
        </div>

        {trip.notes && (
          <div className="bg-cream-md rounded p-3 text-sm text-ink-lt italic">
            "{trip.notes}"
          </div>
        )}
      </div>

      <div className="bg-cream-md rounded-md p-6">
        <h2 className="font-medium text-ink mb-4">Trip cost breakdown</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-sage/14">
            <div className="text-sm text-ink-lt">Items purchased</div>
            <div className="font-mono font-medium text-ink">£{trip.total_spent_gbp.toFixed(2)}</div>
          </div>
          {trip.entry_fee_gbp ? (
            <div className="flex justify-between items-center pb-2 border-b border-sage/14">
              <div className="text-sm text-ink-lt">Entry fee</div>
              <div className="font-mono font-medium text-ink">£{trip.entry_fee_gbp.toFixed(2)}</div>
            </div>
          ) : null}
          {trip.miles ? (
            <div className="flex justify-between items-center pb-2 border-b border-sage/14">
              <div className="text-sm text-ink-lt">Mileage ({trip.miles}mi × £0.45)</div>
              <div className="font-mono font-medium text-ink">£{mileageDeductible.toFixed(2)}</div>
            </div>
          ) : null}
          <div className="flex justify-between items-center pt-2">
            <div className="font-medium text-ink">Total trip cost</div>
            <div className="font-serif text-xl font-medium text-ink">£{totalCostGbp.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div className="bg-cream-md rounded-md p-6">
        <h2 className="font-medium text-ink mb-4">ROI summary</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded border border-sage/14 p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-1">Total cost</div>
            <div className="font-serif text-2xl font-medium text-ink">£{totalCostGbp.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded border border-sage/14 p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-1">Potential revenue</div>
            <div className="font-serif text-2xl font-medium text-ink">£{trip.total_potential_revenue_gbp.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded border border-sage/14 p-4">
            <div className="text-xs uppercase tracking-wider text-sage-dim font-medium mb-1">ROI multiplier</div>
            <div className="font-serif text-2xl font-medium text-sage">{trip.roi_multiplier ? trip.roi_multiplier.toFixed(1) : '—'}x</div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium text-ink">Finds ({trip.find_count})</h2>
          <Link
            href={`/add-find?sourcingTripId=${trip.id}`}
            className="px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors"
          >
            + Add find from this trip
          </Link>
        </div>

        {trip.finds.length === 0 ? (
          <div className="bg-cream-md rounded-md p-8 text-center text-ink-lt">
            <p className="mb-4">No finds from this trip yet</p>
            <Link
              href={`/add-find?sourcingTripId=${trip.id}`}
              className="inline-block px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors"
            >
              Add one now
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-sage/14 rounded-md overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-cream border-b border-sage/14">
                  <th className="px-6 py-3 text-left text-xs uppercase tracking-wider font-medium text-sage-dim">Item</th>
                  <th className="px-6 py-3 text-right text-xs uppercase tracking-wider font-medium text-sage-dim">Cost</th>
                  <th className="px-6 py-3 text-right text-xs uppercase tracking-wider font-medium text-sage-dim">Asking</th>
                  <th className="px-6 py-3 text-right text-xs uppercase tracking-wider font-medium text-sage-dim">Margin</th>
                  <th className="px-6 py-3 text-center text-xs uppercase tracking-wider font-medium text-sage-dim">Status</th>
                </tr>
              </thead>
              <tbody>
                {trip.finds.map((find) => {
                  const margin =
                    find.cost_gbp && find.asking_price_gbp
                      ? ((find.asking_price_gbp - find.cost_gbp) / find.asking_price_gbp) * 100
                      : null
                  return (
                    <tr key={find.id} className="border-b border-sage/14 hover:bg-cream transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/finds/${find.id}`} className="text-sm font-medium text-sage hover:text-sage-dk">
                          {find.name}
                        </Link>
                        <div className="text-xs text-ink-lt">{find.category}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-mono text-ink">£{find.cost_gbp?.toFixed(2) || '—'}</td>
                      <td className="px-6 py-4 text-sm text-right font-mono text-ink">£{find.asking_price_gbp?.toFixed(2) || '—'}</td>
                      <td className="px-6 py-4 text-sm text-right font-mono text-sage font-medium">{margin ? `${Math.round(margin)}%` : '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs px-2 py-1 rounded font-medium bg-sage/8 text-sage-dim">{find.status}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
