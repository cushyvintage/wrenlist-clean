'use client'

import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { MileageForm } from '@/components/forms/MileageForm'
import { useState, useEffect } from 'react'
import type { Mileage, MileagePurpose } from '@/types'
import { MILEAGE_PURPOSE_LABELS, HMRC_MILEAGE_RATE } from '@/types'

const purposeColors: Record<MileagePurpose, string> = {
  car_boot: 'bg-amber-lt text-amber-dk',
  charity_shop: 'bg-sage-pale text-sage-dk',
  house_clearance: 'bg-blue-lt text-blue-dk',
  sourcing: 'bg-cream-dk text-ink',
  delivery: 'bg-red-lt text-red-dk',
  other: 'bg-cream-md text-ink-lt',
}

export default function MileagePage() {
  const [mileages, setMileages] = useState<Mileage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [vehicles, setVehicles] = useState<string[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [filterVehicle, setFilterVehicle] = useState<string | null>(null)

  // Fetch mileage entries
  useEffect(() => {
    const fetchMileage = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/mileage')
        if (!response.ok) throw new Error('Failed to fetch mileage')
        const data = await response.json()
        const entries: Mileage[] = data.data || []
        setMileages(entries)

        // Extract unique vehicles
        const uniqueVehicles = Array.from(new Set(entries.map((e: Mileage) => e.vehicle)))
        setVehicles(uniqueVehicles as string[])
        if (uniqueVehicles.length > 0 && !filterVehicle) {
          setFilterVehicle(uniqueVehicles[0] as string)
        }
      } catch (err) {
        console.error('Failed to fetch mileage:', err)
        setError(err instanceof Error ? err.message : 'Failed to load mileage')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMileage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFormSuccess = () => {
    setShowForm(false)
    // Refetch mileage
    const fetchMileage = async () => {
      try {
        const response = await fetch('/api/mileage')
        if (!response.ok) throw new Error('Failed to fetch mileage')
        const data = await response.json()
        const entries: Mileage[] = data.data || []
        setMileages(entries)

        // Update vehicles
        const uniqueVehicles = Array.from(new Set(entries.map((e: Mileage) => e.vehicle)))
        setVehicles(uniqueVehicles as string[])
        if (!filterVehicle && uniqueVehicles.length > 0) {
          setFilterVehicle(uniqueVehicles[0] as string)
        }
      } catch (err) {
        console.error('Failed to refetch mileage:', err)
      }
    }
    fetchMileage()
  }

  const filteredTrips = filterVehicle ? mileages.filter(m => m.vehicle === filterVehicle) : mileages
  const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.miles, 0)
  const totalDeductible = filteredTrips.reduce((sum, trip) => sum + trip.deductible_value_gbp, 0)
  const avgMilesPerTrip = filteredTrips.length > 0 ? Math.round((totalMiles / filteredTrips.length) * 10) / 10 : 0

  const allTotalMiles = mileages.reduce((sum, m) => sum + m.miles, 0)
  const allTotalDeductible = mileages.reduce((sum, m) => sum + m.deductible_value_gbp, 0)

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatLocation = (from: string | null, to: string | null): string => {
    if (from && to) return `${from} → ${to}`
    if (from) return from
    return '—'
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-blue-lt border border-blue-dk/20 rounded-md p-4 text-sm text-blue-dk">
        <strong>HMRC mileage rates applied automatically.</strong> You are responsible for submitting accurate records — keep receipts and logs as evidence.
      </div>

      {/* Form toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-ink">Mileage Log</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm font-medium bg-sage text-cream rounded hover:bg-sage-dk transition"
        >
          {showForm ? 'Hide form' : 'Log trip'}
        </button>
      </div>

      {/* Form */}
      {showForm && <MileageForm vehicles={vehicles} onSuccess={handleFormSuccess} />}

      {/* Error message */}
      {error && <div className="p-4 bg-red-lt text-red-dk rounded-md text-sm">{error}</div>}

      {/* Loading state */}
      {isLoading && <div className="text-center py-8 text-ink-lt">Loading mileage records...</div>}

      {!isLoading && (
        <>
          {/* Vehicles */}
          {vehicles.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-widest text-sage-dim font-medium">vehicles</div>
              <div className="space-y-2">
                {vehicles.map((vehicle) => {
                  const vehicleMileages = mileages.filter(m => m.vehicle === vehicle)
                  const vehicleTotalMiles = vehicleMileages.reduce((sum, m) => sum + m.miles, 0)
                  const vehicleTotalDeductible = vehicleMileages.reduce((sum, m) => sum + m.deductible_value_gbp, 0)

                  return (
                    <div
                      key={vehicle}
                      onClick={() => setFilterVehicle(vehicle)}
                      className={`border border-sage/14 rounded-md p-4 flex items-center justify-between cursor-pointer transition ${
                        filterVehicle === vehicle ? 'bg-cream-md' : 'bg-cream hover:bg-cream-md'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl">🚗</div>
                        <div className="flex-1">
                          <div className="font-medium text-ink">{vehicle}</div>
                          <div className="text-xs text-ink-lt mt-1">{vehicleMileages.length} trips · {vehicleTotalMiles} miles logged</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium px-3 py-1 bg-sage/10 text-sage rounded">
                          £{vehicleTotalDeductible.toFixed(2)}
                        </div>
                        <div className="text-xs text-ink-lt mt-2">deductible</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="total miles" value={allTotalMiles} delta="this tax year" suffix="" />
            <StatCard label="deductible value" value={allTotalDeductible} prefix="£" delta="@ 45p/mile" suffix="" />
            <StatCard label="trips logged" value={mileages.length} delta="all vehicles" suffix="" />
          </div>

          {/* Trip log */}
          {filterVehicle && (
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-widest text-sage-dim font-medium">
                trips — {filterVehicle}
              </div>

              <Panel>
                <div className="divide-y divide-sage/14">
                  {filteredTrips.length === 0 ? (
                    <div className="p-8 text-center text-ink-lt">No trips logged for this vehicle yet.</div>
                  ) : (
                    filteredTrips.map((trip) => (
                      <div key={trip.id} className="p-4 flex items-center justify-between hover:bg-cream-md transition">
                        <div className="flex-1">
                          <div className="font-medium text-ink">{formatLocation(trip.from_location, trip.to_location)}</div>
                          <div className="text-xs text-ink-lt mt-1">{formatDate(trip.date)}</div>
                        </div>
                        <div className="flex items-center gap-6">
                          <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${purposeColors[trip.purpose]}`}>
                            {MILEAGE_PURPOSE_LABELS[trip.purpose]}
                          </span>
                          <div className="font-mono text-sm text-ink w-16 text-right">{trip.miles} mi</div>
                          <div className="text-right w-20">
                            <div className="font-mono font-medium text-sage">£{trip.deductible_value_gbp.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>

              {/* Summary stats for selected vehicle */}
              {filteredTrips.length > 0 && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-cream-md rounded-md">
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Miles this year</div>
                    <div className="font-serif text-3xl text-ink">{totalMiles}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Deductible value</div>
                    <div className="font-serif text-3xl text-sage">£{totalDeductible.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Avg per trip</div>
                    <div className="font-serif text-3xl text-ink">{avgMilesPerTrip} mi</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {mileages.length === 0 && (
            <div className="text-center py-8 text-ink-lt">No mileage records yet. Log your first trip to get started.</div>
          )}
        </>
      )}
    </div>
  )
}
