'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2 } from 'lucide-react'
import type { SourcingTripWithStats, SourcingTripType } from '@/types'
import { SOURCING_TRIP_TYPES } from '@/types'

type FilterType = 'all' | SourcingTripType

const FILTER_TABS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'car_boot', label: 'Car boot' },
  { value: 'charity_shop', label: 'Charity shop' },
  { value: 'house_clearance', label: 'House clearance' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
]

export default function SourcingPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<SourcingTripWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'car_boot' as SourcingTripType,
    location: '',
    date: new Date().toISOString().split('T')[0],
    miles: '',
    entry_fee_gbp: '',
    notes: '',
  })

  // Fetch trips
  const fetchTrips = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/sourcing')
      if (!response.ok) {
        throw new Error('Failed to fetch trips')
      }
      const result = await response.json()
      setTrips(result.data || [])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error fetching trips:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Create new trip
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.type || !formData.date) {
      setError('Please fill in required fields')
      return
    }

    try {
      setIsCreating(true)
      setError(null)

      const payload = {
        name: formData.name.trim(),
        type: formData.type,
        location: formData.location.trim() || null,
        date: formData.date,
        miles: formData.miles ? parseFloat(formData.miles) : null,
        entry_fee_gbp: formData.entry_fee_gbp ? parseFloat(formData.entry_fee_gbp) : null,
        notes: formData.notes.trim() || null,
      }

      const response = await fetch('/api/sourcing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create trip')
      }

      // Reset form and refresh list
      setFormData({
        name: '',
        type: 'car_boot',
        location: '',
        date: new Date().toISOString().split('T')[0],
        miles: '',
        entry_fee_gbp: '',
        notes: '',
      })
      setShowCreateForm(false)
      await fetchTrips()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('Error creating trip:', err)
    } finally {
      setIsCreating(false)
    }
  }

  // Filter trips
  const filteredTrips = trips.filter((trip) => (filter === 'all' ? true : trip.type === filter))

  // Calculate mileage deductible hint
  const mileageDeductible = formData.miles ? parseFloat(formData.miles) * 0.45 : 0

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Determine ROI status
  const getRoiStatus = (trip: SourcingTripWithStats) => {
    if (!trip.roi_multiplier) return null

    if (trip.roi_multiplier >= 3) {
      return { text: 'Worth it ✓', bg: 'bg-teal-100', text_color: 'text-teal-700' }
    } else if (trip.roi_multiplier >= 1) {
      return { text: 'Break even', bg: 'bg-amber-100', text_color: 'text-amber-700' }
    } else {
      return { text: 'Loss', bg: 'bg-red-100', text_color: 'text-red-700' }
    }
  }

  // Calculate total trip cost (items + entry fee + mileage)
  const getTripTotalCost = (trip: SourcingTripWithStats) => {
    const mileageDeductible = (trip.miles || 0) * 0.45
    const tripCost = (trip.entry_fee_gbp || 0) + mileageDeductible
    return trip.total_spent_gbp + tripCost
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-start justify-between border-b border-sage/14 pb-6">
        <div>
          <h1 className="font-serif text-2xl italic text-ink mb-1">🛍 Sourcing trips</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors"
        >
          + Log trip
        </button>
      </div>

      {/* Empty State */}
      {!isLoading && trips.length === 0 && (
        <div className="border border-sage/14 rounded-lg p-12 text-center bg-cream/50">
          <div className="text-4xl mb-4">🛍</div>
          <h2 className="font-serif text-xl italic text-ink mb-2">Sourcing trips</h2>
          <p className="text-sm text-ink-lt max-w-md mx-auto mb-6 leading-relaxed">
            Every time you go out buying — car boot, charity shop, house clearance — log it here.
            Record where you went, how far you drove, what you spent, and what you found.
            Over time you will see which spots are worth the petrol.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="text-sage font-medium text-sm hover:underline"
          >
            Log your first trip →
          </button>
        </div>
      )}

      {/* Create Trip Form */}
      {showCreateForm && (
        <div className="border border-sage/14 rounded-lg p-6 bg-cream/30">
          <h2 className="font-serif text-lg italic text-ink mb-4">Log new trip</h2>
          <form onSubmit={handleCreateTrip} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-sage-dim font-medium mb-1.5">
                  Trip name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. Car boot sale at Hyde Park"
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                  required
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-sage-dim font-medium mb-1.5">
                  Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                  required
                >
                  {Object.entries(SOURCING_TRIP_TYPES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-sage-dim font-medium mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g. Hyde Park, London"
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-sage-dim font-medium mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                  required
                />
              </div>

              {/* Miles */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-sage-dim font-medium mb-1.5">
                  Miles driven
                </label>
                <input
                  type="number"
                  name="miles"
                  value={formData.miles}
                  onChange={handleInputChange}
                  placeholder="e.g. 10"
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
                {formData.miles && (
                  <p className="text-xs text-sage-dim mt-1">
                    = £{mileageDeductible.toFixed(2)} HMRC deductible
                  </p>
                )}
              </div>

              {/* Entry Fee */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-sage-dim font-medium mb-1.5">
                  Entry fee £
                </label>
                <input
                  type="number"
                  name="entry_fee_gbp"
                  value={formData.entry_fee_gbp}
                  onChange={handleInputChange}
                  placeholder="e.g. 5"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-sage/22 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-sage-dim font-medium mb-1.5">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="e.g. Found lots of Royal Doulton, pricy seller at stall 12"
                className="w-full px-3 py-2 border border-sage/22 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none"
                rows={3}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-100 border border-red-300 rounded p-2 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                disabled={isCreating}
                className="px-4 py-2 text-sm border border-sage/22 rounded-sm hover:bg-cream-md transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 text-sm bg-sage text-cream rounded-sm font-medium hover:bg-sage-dk transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isCreating && <Loader2 className="w-3 h-3 animate-spin" />}
                Save trip
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      {!isLoading && trips.length > 0 && (
        <div className="flex gap-2 flex-wrap border-b border-sage/14 pb-4">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-sage-pale border border-sage text-sage'
                  : 'bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center text-ink-lt py-8 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading trips...
        </div>
      )}

      {/* Error State */}
      {error && !isCreating && (
        <div className="bg-red-100 border border-red-300 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Trip Cards Grid */}
      {!isLoading && trips.length > 0 && (
        <div className="grid gap-4">
          {filteredTrips.map((trip) => {
            const roiStatus = getRoiStatus(trip)
            const totalCost = getTripTotalCost(trip)

            return (
              <button
                key={trip.id}
                onClick={() => router.push(`/sourcing/${trip.id}`)}
                className="border border-sage/14 rounded-lg p-4 hover:bg-cream/30 transition-colors text-left"
              >
                {/* Header: Name + Type Badge + Date */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-ink">{trip.name}</h3>
                      <span className="inline-block px-2 py-0.5 bg-sage-pale text-sage text-xs rounded-full font-medium">
                        {SOURCING_TRIP_TYPES[trip.type]}
                      </span>
                    </div>
                    {trip.location && <p className="text-xs text-ink-lt">{trip.location}</p>}
                  </div>
                  <span className="text-xs text-ink-lt whitespace-nowrap">{formatDate(trip.date)}</span>
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-xs text-ink-lt mb-3">
                  <span>{trip.find_count} find{trip.find_count !== 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>£{trip.total_spent_gbp.toFixed(2)} spent</span>
                  <span>•</span>
                  <span>£{trip.total_potential_revenue_gbp.toFixed(2)} potential</span>
                  {trip.miles && (
                    <>
                      <span>•</span>
                      <span>{trip.miles} mi</span>
                    </>
                  )}
                </div>

                {/* ROI Pill + View Button */}
                <div className="flex items-center justify-between">
                  {roiStatus && (
                    <span
                      className={`inline-block px-2 py-1 rounded text-xs font-medium ${roiStatus.bg} ${roiStatus.text_color}`}
                    >
                      {roiStatus.text}
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-sage text-xs font-medium hover:gap-2 transition-all">
                    View trip
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* No trips after filter */}
      {!isLoading && trips.length > 0 && filteredTrips.length === 0 && (
        <div className="text-center text-ink-lt py-8">
          No trips found for this filter
        </div>
      )}
    </div>
  )
}
