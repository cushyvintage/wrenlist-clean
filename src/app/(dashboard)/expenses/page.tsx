'use client'

import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { ExpenseForm } from '@/components/forms/ExpenseForm'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Expense, ExpenseCategory } from '@/types'
import { EXPENSE_LABELS } from '@/types'

const categoryColors: Record<ExpenseCategory, string> = {
  packaging: 'bg-amber-lt text-amber-dk',
  postage: 'bg-blue-lt text-blue-dk',
  platform_fees: 'bg-red-lt text-red-dk',
  supplies: 'bg-sage-pale text-sage-dk',
  vehicle: 'bg-cream-dk text-ink',
  other: 'bg-cream-md text-ink-lt',
}

export default function ExpensesPage() {
  const router = useRouter()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    document.title = 'Expenses | Wrenlist'
  }, [])

  const categories: (ExpenseCategory | 'all')[] = ['all', 'packaging', 'postage', 'platform_fees', 'supplies', 'vehicle', 'other']

  // Fetch expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setIsLoading(true)
        const queryParams = new URLSearchParams()
        if (activeCategory) {
          queryParams.append('category', activeCategory)
        }
        const response = await fetch(`/api/expenses?${queryParams}`)
        if (!response.ok) throw new Error('Failed to fetch expenses')
        const data = await response.json()
        setExpenses(data.data || [])
      } catch (err) {
        console.error('Failed to fetch expenses:', err)
        setError(err instanceof Error ? err.message : 'Failed to load expenses')
      } finally {
        setIsLoading(false)
      }
    }

    fetchExpenses()
  }, [activeCategory])

  const handleFormSuccess = () => {
    setShowForm(false)
    // Refetch expenses
    const fetchExpenses = async () => {
      try {
        const queryParams = new URLSearchParams()
        if (activeCategory) {
          queryParams.append('category', activeCategory)
        }
        const response = await fetch(`/api/expenses?${queryParams}`)
        if (!response.ok) throw new Error('Failed to fetch expenses')
        const data = await response.json()
        setExpenses(data.data || [])
      } catch (err) {
        console.error('Failed to refetch expenses:', err)
      }
    }
    fetchExpenses()
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount_gbp, 0)
  const totalVat = expenses.reduce((sum, exp) => sum + (exp.vat_amount_gbp || 0), 0)

  // Calculate this month and YTD
  const now = new Date()
  const thisMonth = expenses.filter((exp) => {
    const expDate = new Date(exp.date)
    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
  })
  const thisMonthTotal = thisMonth.reduce((sum, exp) => sum + exp.amount_gbp, 0)

  // Tax year: 6 Apr to 5 Apr
  const taxYearStart = now.getFullYear() - (now.getMonth() < 3 ? 1 : 0)
  const taxYearBegin = new Date(taxYearStart, 3, 6) // 6 Apr
  const ytdExpenses = expenses.filter((exp) => new Date(exp.date) >= taxYearBegin)
  const ytdTotal = ytdExpenses.reduce((sum, exp) => sum + exp.amount_gbp, 0)

  // Tax deductible (all expenses that are not personal spend)
  const taxDeductibleTotal = expenses.reduce((sum, exp) => sum + exp.amount_gbp + (exp.vat_amount_gbp || 0), 0)

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const formatGBP = (amount: number): string => {
    return `£${amount.toFixed(2)}`
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-blue-lt border border-blue-dk/20 rounded-md p-4 text-sm text-blue-dk">
        <strong>Disclaimer:</strong> Wrenlist helps you track your business expenses — you are responsible for your own tax filings. Always consult an accountant for advice.
      </div>

      {/* Summary stats */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-cream border border-sage/14 rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">this month</div>
            <div className="font-serif text-2xl text-ink font-medium">{formatGBP(thisMonthTotal)}</div>
            <div className="text-xs text-ink-lt mt-1">{thisMonth.length} expenses</div>
          </div>

          <div className="bg-cream border border-sage/14 rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">year to date</div>
            <div className="font-serif text-2xl text-ink font-medium">{formatGBP(ytdTotal)}</div>
            <div className="text-xs text-ink-lt mt-1">Apr 6 – today</div>
          </div>

          <div className="bg-cream border border-sage/14 rounded-lg p-4">
            <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">tax deductible</div>
            <div className="font-serif text-2xl text-sage font-medium">{formatGBP(taxDeductibleTotal)}</div>
            <div className="text-xs text-ink-lt mt-1">incl. VAT</div>
          </div>
        </div>
      )}

      {/* Form toggle */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-ink">Expenses</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm font-medium bg-sage text-cream rounded hover:bg-sage-dk transition"
        >
          {showForm ? 'Hide form' : 'Add expense'}
        </button>
      </div>

      {/* Form */}
      {showForm && <ExpenseForm onSuccess={handleFormSuccess} />}

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === 'all' ? null : (cat as ExpenseCategory))}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              (activeCategory === null && cat === 'all') || activeCategory === cat
                ? 'bg-sage text-cream'
                : 'bg-cream-md text-ink-lt hover:bg-cream-dk'
            }`}
          >
            {cat === 'all' ? 'all' : EXPENSE_LABELS[cat as ExpenseCategory]}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-lt">Apr 2025 – Mar 2026</span>
      </div>

      {/* Error message */}
      {error && <div className="p-4 bg-red-lt text-red-dk rounded-md text-sm">{error}</div>}

      {/* Loading state */}
      {isLoading && <div className="text-center py-8 text-ink-lt">Loading expenses...</div>}

      {/* Expenses table */}
      {!isLoading && (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-sage-dim font-medium border-b border-sage/14 bg-cream-md">
                <tr>
                  <th className="text-left py-3 px-4">date</th>
                  <th className="text-left py-3 px-4">description</th>
                  <th className="text-left py-3 px-4">category</th>
                  <th className="text-right py-3 px-4">amount</th>
                  <th className="text-right py-3 px-4">VAT</th>
                  <th className="text-left py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage/14">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-4 text-center text-ink-lt">
                      No expenses yet. Add one to get started.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-cream-md transition">
                      <td className="py-3 px-4 text-xs text-ink-lt">{formatDate(expense.date)}</td>
                      <td className="py-3 px-4 text-ink">{expense.description || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${categoryColors[expense.category]}`}>
                          {EXPENSE_LABELS[expense.category]}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-ink">
                        £{expense.amount_gbp.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-ink-lt">
                        {expense.vat_amount_gbp ? `£${expense.vat_amount_gbp.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-ink-lt cursor-pointer hover:text-ink transition">
                        edit
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total row */}
          {expenses.length > 0 && (
            <div className="px-4 py-4 bg-cream-md border-t border-sage/14 flex justify-between items-center font-medium">
              <div>
                <div className="text-sm text-ink-lt">Total this tax year</div>
                <div className="text-xs text-ink-lt mt-1">
                  Expenses: £{totalAmount.toFixed(2)} • VAT: £{totalVat.toFixed(2)}
                </div>
              </div>
              <span className="font-serif text-xl font-medium text-ink">£{(totalAmount + totalVat).toFixed(2)}</span>
            </div>
          )}
        </Panel>
      )}

      {/* Insight card */}
      <InsightCard
        text="Keep detailed records of all business expenses for tax purposes. VAT-registered sellers can reclaim VAT on eligible expenses."
        link={{ text: 'see analytics →', onClick: () => router.push('/analytics') }}
      />
    </div>
  )
}
