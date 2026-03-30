'use client'

import { useState } from 'react'
import type { ExpenseCategory } from '@/types'
import { EXPENSE_LABELS } from '@/types'

interface ExpenseFormProps {
  onSubmit: (data: ExpenseFormData) => Promise<void>
  isLoading?: boolean
  defaultValues?: Partial<ExpenseFormData>
  submitLabel?: string
}

export interface ExpenseFormData {
  date: string
  category: ExpenseCategory
  description: string
  amount: number
  vat?: number | null
  receiptUrl?: string | null
}

const categories: ExpenseCategory[] = ['packaging', 'postage', 'platform_fees', 'supplies', 'vehicle', 'other']

export function ExpenseForm({
  onSubmit,
  isLoading = false,
  defaultValues,
  submitLabel = 'Add expense',
}: ExpenseFormProps) {
  const [formData, setFormData] = useState<ExpenseFormData>(
    defaultValues || {
      date: new Date().toISOString().split('T')[0],
      category: 'supplies',
      description: '',
      amount: 0,
      vat: null,
    }
  )
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (!formData.date) {
        setError('Date is required')
        return
      }
      if (formData.amount <= 0) {
        setError('Amount must be greater than 0')
        return
      }
      if (!formData.description.trim()) {
        setError('Description is required')
        return
      }

      await onSubmit(formData)

      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'supplies',
        description: '',
        amount: 0,
        vat: null,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
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

        {/* Category */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
            className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {EXPENSE_LABELS[cat]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Description</label>
        <input
          type="text"
          placeholder="e.g. eBay selling fees — March"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage"
        />
      </div>

      {/* Amount & VAT */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">Amount (£)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage font-mono"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">VAT (£)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Optional"
            value={formData.vat || ''}
            onChange={(e) => setFormData({ ...formData, vat: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-1 focus:ring-sage font-mono"
          />
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-4 py-2 bg-sage text-cream rounded font-medium text-sm hover:bg-sage-dk transition disabled:opacity-50"
      >
        {isLoading ? 'Adding...' : submitLabel}
      </button>
    </form>
  )
}
