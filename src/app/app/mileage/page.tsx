'use client'

import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { useState } from 'react'

interface Trip {
  id: string
  date: string
  location: string
  vehicle: string
  purpose: 'car boot' | 'charity shop' | 'house clearance' | 'sourcing' | 'delivery'
  miles: number
  deductible: number
}

const mockTrips: Trip[] = [
  {
    id: '1',
    date: '28 Mar 2026',
    location: 'Portobello Road Market',
    vehicle: 'Ford Fiesta',
    purpose: 'car boot',
    miles: 18,
    deductible: 8.10,
  },
  {
    id: '2',
    date: '22 Mar 2026',
    location: 'Oxfam Notting Hill + Age UK',
    vehicle: 'Ford Fiesta',
    purpose: 'charity shop',
    miles: 12,
    deductible: 5.40,
  },
  {
    id: '3',
    date: '15 Mar 2026',
    location: 'Sunbury Antiques Market',
    vehicle: 'Ford Fiesta',
    purpose: 'house clearance',
    miles: 34,
    deductible: 15.30,
  },
  {
    id: '4',
    date: '08 Mar 2026',
    location: 'Battersea Car Boot',
    vehicle: 'Ford Fiesta',
    purpose: 'car boot',
    miles: 9,
    deductible: 4.05,
  },
]

const purposeColors: Record<Trip['purpose'], string> = {
  'car boot': 'bg-amber-lt text-amber-dk',
  'charity shop': 'bg-sage-pale text-sage-dk',
  'house clearance': 'bg-blue-lt text-blue-dk',
  'sourcing': 'bg-cream-dk text-ink',
  'delivery': 'bg-red-lt text-red-dk',
}

export default function MileagePage() {
  const [filterVehicle, setFilterVehicle] = useState('Ford Fiesta')

  const filteredTrips = mockTrips.filter(trip => trip.vehicle === filterVehicle)
  const totalMiles = filteredTrips.reduce((sum, trip) => sum + trip.miles, 0)
  const totalDeductible = filteredTrips.reduce((sum, trip) => sum + trip.deductible, 0)
  const avgMilesPerTrip = filteredTrips.length > 0 ? Math.round((totalMiles / filteredTrips.length) * 10) / 10 : 0

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-blue-lt border border-blue-dk/20 rounded-md p-4 text-sm text-blue-dk">
        <strong>HMRC mileage rates applied automatically.</strong> You are responsible for submitting accurate records — keep receipts and logs as evidence.
      </div>

      {/* Vehicles */}
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-widest text-sage-dim font-medium">your vehicles</div>
        <div className="space-y-2">
          {/* Primary vehicle */}
          <div className="border border-sage/14 rounded-md p-4 flex items-center justify-between bg-cream hover:bg-cream-md transition">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-2xl">🚗</div>
              <div className="flex-1">
                <div className="font-medium text-ink">Ford Fiesta — YK21 ABC</div>
                <div className="text-xs text-ink-lt mt-1">Primary vehicle · 3,240 business miles logged this year</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium px-3 py-1 bg-sage/10 text-sage rounded">45p / mile</div>
              <div className="text-xs text-ink-lt mt-2">first 10,000 mi</div>
            </div>
          </div>

          {/* Secondary vehicle */}
          <div className="border border-sage/14 rounded-md p-4 flex items-center justify-between opacity-50">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-2xl">🚐</div>
              <div className="flex-1">
                <div className="font-medium text-ink">VW Caddy Van — LN68 XYZ</div>
                <div className="text-xs text-ink-lt mt-1">Secondary vehicle · 0 miles logged this year</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium px-3 py-1 bg-sage/10 text-sage rounded">45p / mile</div>
              <div className="text-xs text-ink-lt mt-2">first 10,000 mi</div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="total miles"
          value={3240}
          delta="this tax year"
          suffix=""
        />
        <StatCard
          label="deductible value"
          value={1458}
          prefix="£"
          delta="@ 45p/mile"
          suffix=""
        />
        <StatCard
          label="trips logged"
          value={47}
          delta="avg 69 miles/trip"
          suffix=""
        />
      </div>

      {/* Trip log */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium">recent trips — {filterVehicle}</div>
          <button className="text-xs text-sage hover:text-sage-dk transition">manage vehicles</button>
        </div>

        <Panel>
          <div className="divide-y divide-sage/14">
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="p-4 flex items-center justify-between hover:bg-cream-md transition">
                <div className="flex-1">
                  <div className="font-medium text-ink">{trip.location}</div>
                  <div className="text-xs text-ink-lt mt-1">
                    {trip.date} · London {trip.location.includes('Sunbury') ? 'KT12' : 'W11'}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${purposeColors[trip.purpose]}`}>
                    {trip.purpose}
                  </span>
                  <div className="font-mono text-sm text-ink w-16">{trip.miles} mi</div>
                  <div className="text-right w-20">
                    <div className="font-mono font-medium text-sage">£{trip.deductible.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Summary stats for selected vehicle */}
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
    </div>
  )
}
