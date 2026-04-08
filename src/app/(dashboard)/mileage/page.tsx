'use client'

import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { MileageForm } from '@/components/forms/MileageForm'
import { useState, useEffect } from 'react'
import type { Mileage, MileagePurpose, VehicleType } from '@/types'
import { MILEAGE_PURPOSE_LABELS, HMRC_RATES, VEHICLE_TYPE_ICONS, VEHICLE_TYPE_LABELS } from '@/types'
import { unwrapApiResponse } from '@/lib/api-utils'

const purposeColors: Record<MileagePurpose, string> = {
  car_boot: 'bg-amber-lt text-amber-dk',
  charity_shop: 'bg-sage-pale text-sage-dk',
  house_clearance: 'bg-blue-lt text-blue-dk',
  sourcing: 'bg-cream-dk text-ink',
  delivery: 'bg-red-lt text-red-dk',
  other: 'bg-cream-md text-ink-lt',
}

function getRateLabel(vehicleType: VehicleType): string {
  const rate = HMRC_RATES[vehicleType]
  if (rate.second !== null) {
    return `${(rate.first * 100).toFixed(0)}p/${(rate.second * 100).toFixed(0)}p`
  }
  return `${(rate.first * 100).toFixed(0)}p/mi`
}

export default function MileagePage() {
  const [mileages, setMileages] = useState<Mileage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [vehicles, setVehicles] = useState<string[]>([])
  const [filterVehicle, setFilterVehicle] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Mileage | Wrenlist'
  }, [])

  const fetchMileage = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/mileage')
      if (!response.ok) throw new Error('Failed to fetch mileage')
      const data = await response.json()
      const entries: Mileage[] = unwrapApiResponse<Mileage[]>(data)
      setMileages(entries)

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

  useEffect(() => {
    fetchMileage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFormSuccess = () => {
    setShowForm(false)
    fetchMileage()
  }

  const filteredTrips = filterVehicle ? mileages.filter(m => m.vehicle === filterVehicle) : mileages
  const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.miles, 0)
  const totalDeductible = Math.round(filteredTrips.reduce((sum, trip) => sum + trip.deductible_value_gbp, 0) * 100) / 100
  const avgMilesPerTrip = filteredTrips.length > 0 ? Math.round((totalMiles / filteredTrips.length) * 10) / 10 : 0

  const allTotalMiles = mileages.reduce((sum, m) => sum + m.miles, 0)
  const allTotalDeductible = Math.round(mileages.reduce((sum, m) => sum + m.deductible_value_gbp, 0) * 100) / 100

  // Check if any vehicle type is approaching the 10k threshold
  const thresholdWarnings: string[] = []
  const vehicleTypeTotals: Partial<Record<VehicleType, number>> = {}
  for (const m of mileages) {
    const vt = m.vehicle_type || 'car'
    vehicleTypeTotals[vt] = (vehicleTypeTotals[vt] || 0) + m.miles
  }
  for (const [vt, total] of Object.entries(vehicleTypeTotals)) {
    const rate = HMRC_RATES[vt as VehicleType]
    if (rate.threshold && total >= rate.threshold * 0.9 && total < rate.threshold) {
      thresholdWarnings.push(`${VEHICLE_TYPE_LABELS[vt as VehicleType]}: ${total.toFixed(0)} of ${rate.threshold.toLocaleString()} miles — approaching reduced rate threshold`)
    } else if (rate.threshold && total >= rate.threshold) {
      thresholdWarnings.push(`${VEHICLE_TYPE_LABELS[vt as VehicleType]}: ${total.toFixed(0)} miles — reduced rate (${(rate.second! * 100).toFixed(0)}p/mi) now applies`)
    }
  }

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
        <strong>HMRC mileage rates applied automatically.</strong> Car/Van: 45p (first 10,000 mi), 25p after. Motorcycle: 24p. Bicycle: 20p.
      </div>

      {/* Threshold warnings */}
      {thresholdWarnings.length > 0 && (
        <div className="bg-amber-lt border border-amber-dk/20 rounded-md p-4 text-sm text-amber-dk space-y-1">
          {thresholdWarnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

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
                  // Get the vehicle type from the most recent entry for this vehicle
                  const vehicleType: VehicleType = vehicleMileages[0]?.vehicle_type || 'car'
                  const icon = VEHICLE_TYPE_ICONS[vehicleType]

                  return (
                    <div
                      key={vehicle}
                      onClick={() => setFilterVehicle(vehicle)}
                      className={`border border-sage/14 rounded-md p-4 flex items-center justify-between cursor-pointer transition ${
                        filterVehicle === vehicle ? 'bg-cream-md' : 'bg-cream hover:bg-cream-md'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-2xl">{icon}</div>
                        <div className="flex-1">
                          <div className="font-medium text-ink">{vehicle}</div>
                          <div className="text-xs text-ink-lt mt-1">
                            {VEHICLE_TYPE_LABELS[vehicleType]} · {vehicleMileages.length} trips · {vehicleTotalMiles} miles · {getRateLabel(vehicleType)}
                          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="total miles" value={allTotalMiles} delta="this tax year" suffix="" />
            <StatCard label="deductible value" value={allTotalDeductible} prefix="£" delta="HMRC tiered rates" suffix="" />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-cream-md rounded-md">
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
            <Panel>
              <div className="text-center py-12 px-6">
                <p className="text-2xl mb-2">🚗</p>
                <p className="text-sage-dim text-sm mb-4">No mileage records yet</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-sage text-cream rounded text-sm font-medium hover:bg-sage-lt transition-colors"
                >
                  Log your first trip
                </button>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  )
}
