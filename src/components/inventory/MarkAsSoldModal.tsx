'use client'

import { useState } from 'react'
import type { Find } from '@/types'

interface MarkAsSoldModalProps {
  find: Find
  onConfirm: (price: string, date: string) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export default function MarkAsSoldModal({
  find,
  onConfirm,
  onCancel,
  isLoading = false,
}: MarkAsSoldModalProps) {
  const [price, setPrice] = useState('')
  const [date, setDate] = useState('')

  const handleSubmit = async () => {
    await onConfirm(price, date)
    // Reset on success (handled by parent)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="p-8 rounded"
        style={{
          backgroundColor: '#FFF9F3',
          borderWidth: '1px',
          borderColor: 'rgba(196,138,58,.2)',
        }}
      >
        <h2 className="text-lg font-medium mb-2" style={{ color: '#1E2E1C' }}>
          Mark "{find.name}" as sold?
        </h2>
        <p className="text-sm mb-6" style={{ color: '#6B7D6A' }}>
          This will delist the item from all active marketplaces.
        </p>

        {/* Form fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7D6A' }}>
              Sold price (£)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder={find.asking_price_gbp?.toString() || '0.00'}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border"
              style={{
                borderColor: 'rgba(61,92,58,.22)',
                backgroundColor: '#FFF',
                color: '#1E2E1C',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6B7D6A' }}>
              Date sold
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border"
              style={{
                borderColor: 'rgba(61,92,58,.22)',
                backgroundColor: '#FFF',
                color: '#1E2E1C',
              }}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.22)',
              backgroundColor: 'transparent',
              color: '#3D5C3A',
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#EDE8DE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#C4883A', color: '#FFF9F3' }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#A5723A')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C4883A')}
          >
            {isLoading ? 'Processing...' : 'Mark as Sold'}
          </button>
        </div>
      </div>
    </div>
  )
}
