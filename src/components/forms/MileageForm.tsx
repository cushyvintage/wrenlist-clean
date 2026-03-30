'use client'

import { useState, useEffect } from 'react'
import type { MileagePurpose } from '@/types'
import { MILEAGE_PURPOSE_LABELS, HMRC_MILEAGE_RATE } from '@/types'

interface MileageFormProps {
  onSubmit: (data: MileageFormData) => Promise<void>
  isLoading?: boolean
  vehicles: string[]
  defaultValues?: Partial<MileageFormData>
  submitLabel?: string
}

export interface MileageFormData {
  date: string
  miles: number
  purpose: MileagePurpose
  fromLocation?: string | null
  toLocation?: string | null
  vehicle: string
}

const purposes: MileagePurpose[] = ['car_boot', 'charity_shop', 'house_clearance', 'sourcing', 'delivery', 'other']

export function MileageForm({
  onSubmit,
  isLoading = false,
  vehicles,
  defaultValues,
  submitLabel = 'Log trip',
}: MileageFormProps) {
  const defaultData: MileageFormData = {
    date: new Date().toISOString().split('T')[0]!,
    miles: 0,
    purpose: 'sourcing',
    vehicle: vehicles[0] || '',
    fromLocation: '',
    toLocation: '',
  }

  const [formData, setFormData] = useState<MileageFormData>(
    defaultValues ? { ...defaultData, ...defaultValues } : defaultData
  )
  const [error, setError] = useState<string | null>(null)
  const [deductible, setDeductible] = useState(0)

  useEffect(() => {
    setDeductible(formData.miles * HMRC_MILEAGE_RATE)
  }, [formData.miles])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (!formData.date) {
        setError('Date is required')
        return
      }
      if (formData.miles <= 0) {
        setError('Miles must be greater than 0')
        return
      }
      if (!formData.vehicle) {
        setError('Vehicle is required')
        return
      }

      await onSubmit(formData)

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0]!,
        miles: 0,
        purpose: 'sourcing',
        vehicle: formData.vehicle,
        fromLocation: '',
        toLocation: '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trip')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-cream-md rounded-lg border border-sage/14">
      {error && <div className="p-3 bg-red-lt text-red-dk rounded text-sm">{error}</div>}

      <div className="grid grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
          />
        </div>

        {/* Vehicle */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Vehicle</label>
          {vehicles.length > 0 ? (
            <select
              value={formData.vehicle}
              onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
            >
              {vehicles.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              placeholder="e.g. Ford Fiesta"
              value={formData.vehicle}
              onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
              className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
            />
          )}
        </div>
      </div>

      {/* From/To Locations */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">From</label>
          <input
            type="text"
            placeholder="e.g. Portobello Road"
            value={formData.fromLocation || ''}
            onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value || null })}
            className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">To</label>
          <input
            type="text"
            placeholder="Optional"
            value={formData.toLocation || ''}
            onChange={(e) => setFormData({ ...formData, toLocation: e.target.value || null })}
            className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Miles */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Miles</label>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={formData.miles || ''}
            onChange={(e) => setFormData({ ...formData, miles: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage font-mono"
          />
        </div>

        {/* Deductible value (read-only) */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Deductible</label>
          <div className="w-full px-3 py-2 border border-sage/14 rounded text-sm bg-cream text-sage font-mono font-medium">
            £{deductible.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Purpose */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Purpose</label>
        <select
          value={formData.purpose}
          onChange={(e) => setFormData({ ...formData, purpose: e.target.value as MileagePurpose })}
          className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
        >
          {purposes.map((p) => (
            <option key={p} value={p}>
              {MILEAGE_PURPOSE_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-sage text-cream rounded font-medium text-sm hover:bg-sage-dk transition disabled:opacity-50"
      >
        {isLoading ? 'Logging...' : submitLabel}
      </button>
    </form>
  )
}
