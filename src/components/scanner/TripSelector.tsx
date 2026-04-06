'use client'

import { useState, useCallback, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import { fetchApi } from '@/lib/api-utils'
import type { SourcingTrip } from '@/types'

const ACTIVE_TRIP_KEY = 'wrenlist:active-scan-trip'

interface TripSelectorProps {
  onTripChange: (trip: SourcingTrip | null) => void
}

export function TripSelector({ onTripChange }: TripSelectorProps) {
  const [trips, setTrips] = useState<SourcingTrip[]>([])
  const [activeTrip, setActiveTrip] = useState<SourcingTrip | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchApi<SourcingTrip[]>('/api/sourcing')
      .then((data) => {
        setTrips(data)
        const savedId = localStorage.getItem(ACTIVE_TRIP_KEY)
        if (savedId) {
          const match = data.find((t) => t.id === savedId)
          if (match) {
            setActiveTrip(match)
            onTripChange(match)
          }
        }
      })
      .catch(() => {})
  }, [onTripChange])

  const select = useCallback(
    (trip: SourcingTrip | null) => {
      setActiveTrip(trip)
      setOpen(false)
      onTripChange(trip)
      if (trip) {
        localStorage.setItem(ACTIVE_TRIP_KEY, trip.id)
      } else {
        localStorage.removeItem(ACTIVE_TRIP_KEY)
      }
    },
    [onTripChange]
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-xs text-ink-lt hover:text-ink transition-colors"
      >
        <span className="text-[10px] uppercase tracking-widest text-sage-dim font-medium">
          Scanning for:
        </span>
        <span className="font-medium text-ink">
          {activeTrip ? activeTrip.name : 'No trip selected'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-sage/14 rounded-md shadow-md min-w-[240px] py-1">
          <button
            onClick={() => select(null)}
            className={`w-full text-left px-4 py-2 text-xs hover:bg-sage/5 transition-colors ${!activeTrip ? 'text-sage font-medium' : 'text-ink-lt'}`}
          >
            No trip
          </button>
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => select(trip)}
              className={`w-full text-left px-4 py-2 text-xs hover:bg-sage/5 transition-colors ${activeTrip?.id === trip.id ? 'text-sage font-medium' : 'text-ink'}`}
            >
              {trip.name}
              <span className="text-ink-lt ml-2">{trip.location ?? ''}</span>
            </button>
          ))}
          {trips.length === 0 && (
            <p className="px-4 py-2 text-xs text-ink-lt">No trips yet</p>
          )}
        </div>
      )}
    </div>
  )
}

/** Hook to get the active trip for external consumers */
export function useActiveTrip() {
  const [trip, setTrip] = useState<SourcingTrip | null>(null)
  return { activeTrip: trip, setActiveTrip: setTrip }
}
