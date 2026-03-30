'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ExpenseCategory } from '@/types'
import { EXPENSE_LABELS } from '@/types'

interface ExpenseFormProps {
  onSubmit?: (data: ExpenseFormData) => Promise<void>
  isLoading?: boolean
  defaultValues?: Partial<ExpenseFormData>
  submitLabel?: string
  onSuccess?: () => void
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

const getTodayDate = (): string => new Date().toISOString().split('T')[0]!

export function ExpenseForm({
  onSubmit,
  isLoading: externalIsLoading = false,
  defaultValues,
  submitLabel = 'Add expense',
  onSuccess,
}: ExpenseFormProps) {
  const router = useRouter()
  const defaultData: ExpenseFormData = {
    date: new Date().toISOString().split('T')[0]!,
    category: 'supplies',
    description: '',
    amount: 0,
    vat: null,
  }

  const [formData, setFormData] = useState<ExpenseFormData>(
    defaultValues ? { ...defaultData, ...defaultValues } : defaultData
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

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

      setIsLoading(true)

      if (onSubmit) {
        // Custom submission handler
        await onSubmit(formData)
      } else {
        // Default: POST to API
        const payload = {
          date: formData.date,
          category: formData.category,
          description: formData.description,
          amount_gbp: formData.amount,
          vat_amount_gbp: formData.vat || null,
        }

        const response = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save expense')
        }
      }

      // Show success and reset
      setSuccessMessage('Expense added successfully!')
      setFormData({
        date: new Date().toISOString().split('T')[0]!,
        category: 'supplies',
        description: '',
        amount: 0,
        vat: null,
      })

      // Call callback if provided
      if (onSuccess) {
        onSuccess()
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-cream-md rounded-lg border border-sage/14">
      {error && <div className="p-3 bg-red-lt text-red-dk rounded text-sm">{error}</div>}
      {successMessage && <div className="p-3 bg-green-lt text-green-dk rounded text-sm">{successMessage}</div>}

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
        disabled={isLoading || externalIsLoading}
        className="w-full px-4 py-2 bg-sage text-cream rounded font-medium text-sm hover:bg-sage-dk transition disabled:opacity-50"
      >
        {isLoading || externalIsLoading ? 'Adding...' : submitLabel}
      </button>
    </form>
  )
}
