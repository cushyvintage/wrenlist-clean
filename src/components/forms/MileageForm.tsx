'use client'

import { useState, useEffect } from 'react'
import type { MileagePurpose, VehicleType } from '@/types'
import { MILEAGE_PURPOSE_LABELS, HMRC_RATES, VEHICLE_TYPE_LABELS, VEHICLE_TYPE_ICONS } from '@/types'

interface MileageFormProps {
  onSubmit?: (data: MileageFormData) => Promise<void>
  isLoading?: boolean
  vehicles: string[]
  defaultValues?: Partial<MileageFormData>
  submitLabel?: string
  onSuccess?: () => void
}

export interface MileageFormData {
  date: string
  miles: number
  purpose: MileagePurpose
  fromLocation?: string | null
  toLocation?: string | null
  vehicle: string
  vehicleType: VehicleType
}

const purposes: MileagePurpose[] = ['car_boot', 'charity_shop', 'house_clearance', 'sourcing', 'delivery', 'other']
const vehicleTypes: VehicleType[] = ['car', 'van', 'motorcycle', 'bicycle']

export function MileageForm({
  onSubmit,
  isLoading: externalIsLoading = false,
  vehicles,
  defaultValues,
  submitLabel = 'Log trip',
  onSuccess,
}: MileageFormProps) {
  const defaultData: MileageFormData = {
    date: new Date().toISOString().split('T')[0]!,
    miles: 0,
    purpose: 'sourcing',
    vehicle: vehicles[0] || '',
    vehicleType: 'car',
    fromLocation: '',
    toLocation: '',
  }

  const [formData, setFormData] = useState<MileageFormData>(
    defaultValues ? { ...defaultData, ...defaultValues } : defaultData
  )
  const [error, setError] = useState<string | null>(null)
  const [deductible, setDeductible] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Calculate deductible preview using first rate (conservative estimate)
  useEffect(() => {
    const rate = HMRC_RATES[formData.vehicleType]
    setDeductible(formData.miles * rate.first)
  }, [formData.miles, formData.vehicleType])

  const currentRate = HMRC_RATES[formData.vehicleType]
  const rateLabel = currentRate.second !== null
    ? `${(currentRate.first * 100).toFixed(0)}p/mi (first ${currentRate.threshold?.toLocaleString()}), then ${(currentRate.second * 100).toFixed(0)}p`
    : `${(currentRate.first * 100).toFixed(0)}p/mi`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

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

      setIsLoading(true)

      if (onSubmit) {
        await onSubmit(formData)
      } else {
        const payload = {
          date: formData.date,
          miles: formData.miles,
          purpose: formData.purpose,
          from_location: formData.fromLocation || null,
          to_location: formData.toLocation || null,
          vehicle: formData.vehicle,
          vehicle_type: formData.vehicleType,
        }

        const response = await fetch('/api/mileage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save trip')
        }
      }

      setSuccessMessage('Trip logged successfully!')
      setFormData({
        date: new Date().toISOString().split('T')[0]!,
        miles: 0,
        purpose: 'sourcing',
        vehicle: formData.vehicle,
        vehicleType: formData.vehicleType,
        fromLocation: '',
        toLocation: '',
      })

      if (onSuccess) {
        onSuccess()
      }

      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trip')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-cream-md rounded-lg border border-sage/14">
      {error && <div className="p-3 bg-red-lt text-red-dk rounded text-sm">{error}</div>}
      {successMessage && <div className="p-3 bg-green-lt text-green-dk rounded text-sm">{successMessage}</div>}

      {/* Vehicle Type Selector */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Vehicle Type</label>
        <div className="grid grid-cols-4 gap-2">
          {vehicleTypes.map((vt) => (
            <button
              key={vt}
              type="button"
              onClick={() => setFormData({ ...formData, vehicleType: vt })}
              className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded border text-sm transition ${
                formData.vehicleType === vt
                  ? 'bg-sage text-cream border-sage'
                  : 'bg-cream border-sage/14 text-ink hover:bg-cream-dk'
              }`}
            >
              <span className="text-lg">{VEHICLE_TYPE_ICONS[vt]}</span>
              <span className="text-xs font-medium">{VEHICLE_TYPE_LABELS[vt]}</span>
            </button>
          ))}
        </div>
        <div className="text-xs text-sage-dim mt-1.5">HMRC rate: {rateLabel}</div>
      </div>

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

        {/* Vehicle Name */}
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
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Deductible (est.)</label>
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
        disabled={isLoading || externalIsLoading}
        className="w-full px-4 py-2 bg-sage text-cream rounded font-medium text-sm hover:bg-sage-dk transition disabled:opacity-50"
      >
        {isLoading || externalIsLoading ? 'Logging...' : submitLabel}
      </button>
    </form>
  )
}
