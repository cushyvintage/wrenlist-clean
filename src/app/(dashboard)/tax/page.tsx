'use client'

import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { useState, useEffect } from 'react'
import type { Find, Expense, Mileage, VehicleType } from '@/types'
import { HMRC_RATES, VEHICLE_TYPE_LABELS } from '@/types'
import { unwrapApiResponse } from '@/lib/api-utils'
import { useExpenseCategories } from '@/hooks/useExpenseCategories'

export default function TaxPage() {
  const [taxYear, setTaxYear] = useState('2025-26')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { categories: dbCategories, labelsMap } = useExpenseCategories()

  // Data from APIs
  const [sells, setSells] = useState<Find[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [mileages, setMileages] = useState<Mileage[]>([])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get tax year dates (6 Apr to 5 Apr)
        const currentYear = new Date().getFullYear()
        const startDate = taxYear === '2025-26' ? '2025-04-06' : taxYear === '2024-25' ? '2024-04-06' : '2023-04-06'
        const endDate = taxYear === '2025-26' ? '2026-04-05' : taxYear === '2024-25' ? '2025-04-05' : '2024-04-05'

        // Fetch sold finds
        const sellsRes = await fetch('/api/finds?status=sold')
        if (sellsRes.ok) {
          const sellsData = await sellsRes.json()
          setSells(unwrapApiResponse<Find[]>(sellsData))
        }

        // Fetch expenses
        const expensesRes = await fetch(`/api/expenses?start_date=${startDate}&end_date=${endDate}`)
        if (expensesRes.ok) {
          const expensesData = await expensesRes.json()
          setExpenses(unwrapApiResponse<Expense[]>(expensesData))
        }

        // Fetch mileage
        const mileageRes = await fetch(`/api/mileage?start_date=${startDate}&end_date=${endDate}`)
        if (mileageRes.ok) {
          const mileageData = await mileageRes.json()
          setMileages(unwrapApiResponse<Mileage[]>(mileageData))
        }
      } catch (err) {
        console.error('Error fetching tax data:', err)
        setError('Failed to load tax data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [taxYear])

  // Calculate summary values
  const revenue = sells.reduce((sum, find) => sum + (find.sold_price_gbp || 0), 0)
  const costOfGoods = sells.reduce((sum, find) => sum + (find.cost_gbp || 0), 0)
  const operatingExpenses = expenses.reduce((sum, exp) => sum + exp.amount_gbp, 0)
  const mileageDeduction = Math.round(mileages.reduce((sum, m) => sum + m.deductible_value_gbp, 0) * 100) / 100
  const totalMileageMiles = Math.round(mileages.reduce((sum, m) => sum + m.miles, 0) * 10) / 10

  // Build mileage summary by vehicle type
  const mileageByType: Partial<Record<VehicleType, number>> = {}
  for (const m of mileages) {
    const vt = (m.vehicle_type || 'car') as VehicleType
    mileageByType[vt] = (mileageByType[vt] || 0) + m.miles
  }
  const mileageSummaryParts = Object.entries(mileageByType).map(([vt, miles]) => {
    const rate = HMRC_RATES[vt as VehicleType]
    return `${Math.round(miles as number)} mi ${VEHICLE_TYPE_LABELS[vt as VehicleType].toLowerCase()} @ ${(rate.first * 100).toFixed(0)}p`
  })
  const mileageSummaryLabel = mileageSummaryParts.length > 0
    ? mileageSummaryParts.join(' · ')
    : 'no trips logged'
  const taxableProfit = revenue - costOfGoods - operatingExpenses - mileageDeduction

  // VAT threshold
  const vatThreshold = 90000
  const vatPercentage = (revenue / vatThreshold) * 100
  const vatRemaining = vatThreshold - revenue

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-lt border border-red-dk/20 rounded-md p-4 text-sm text-red-dk">
          {error}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-ink-lt">Loading tax summary...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-blue-lt border border-blue-dk/20 rounded-md p-4 text-sm text-blue-dk">
        <strong>This summary is a guide to help you prepare your self-assessment.</strong> Wrenlist tracks your numbers — you are responsible for your own tax filings. For VAT, HMRC registration, or complex situations always consult a qualified accountant.
      </div>

      {/* Tax Year selector and export */}
      <div className="flex items-center justify-between">
        <select
          value={taxYear}
          onChange={(e) => setTaxYear(e.target.value)}
          className="px-4 py-2 bg-cream-md border border-sage/14 rounded text-sm text-ink font-medium focus:outline-none focus:ring-1 focus:ring-sage"
        >
          <option value="2025-26">Tax year 2025–26</option>
          <option value="2024-25">Tax year 2024–25</option>
          <option value="2023-24">Tax year 2023–24</option>
        </select>
        <button className="text-sm font-medium text-ink-lt hover:text-ink px-3 py-2 border border-sage/14 rounded hover:bg-cream-md transition">
          ↓ download CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-cream border border-sage/14 rounded-lg p-4">
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">total revenue</div>
          <div className="font-serif text-2xl text-ink mb-1">£{revenue.toLocaleString()}</div>
          <div className="text-xs text-ink-lt">all platforms · Apr 25 – Mar 26</div>
        </div>

        <div className="bg-cream border border-sage/14 rounded-lg p-4">
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">cost of goods (finds)</div>
          <div className="font-serif text-2xl text-ink mb-1">£{costOfGoods.toLocaleString()}</div>
          <div className="text-xs text-ink-lt">total sourcing spend</div>
        </div>

        <div className="bg-cream border border-sage/14 rounded-lg p-4">
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">operating expenses</div>
          <div className="font-serif text-2xl text-ink mb-1">£{operatingExpenses.toLocaleString()}</div>
          <div className="text-xs text-ink-lt">fees, postage, packaging</div>
        </div>

        <div className="bg-cream border border-sage/14 rounded-lg p-4">
          <div className="text-xs uppercase tracking-widest text-sage-dim font-medium mb-2">mileage deduction</div>
          <div className="font-serif text-2xl text-ink mb-1">£{mileageDeduction.toLocaleString()}</div>
          <div className="text-xs text-ink-lt">{totalMileageMiles > 0 ? `${totalMileageMiles.toLocaleString()} mi · HMRC rates` : 'no trips logged'}</div>
        </div>
      </div>

      {/* Profit breakdown */}
      <Panel title="profit calculation">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-sage/14">
            <tr className="border-b border-sage/14">
              <td className="py-4 px-4 text-ink font-medium">Total revenue</td>
              <td className="py-4 px-4 text-right font-mono text-ink">£{revenue.toLocaleString()}</td>
            </tr>
            <tr className="bg-cream-md border-b border-sage/14">
              <td className="py-4 px-4 text-ink-lt">− Cost of goods sold</td>
              <td className="py-4 px-4 text-right font-mono text-sage">− £{costOfGoods.toLocaleString()}</td>
            </tr>
            <tr className="bg-cream-md border-b border-sage/14">
              <td className="py-4 px-4 text-ink-lt">− Operating expenses</td>
              <td className="py-4 px-4 text-right font-mono text-sage">− £{operatingExpenses.toLocaleString()}</td>
            </tr>
            <tr className="bg-cream-md">
              <td className="py-4 px-4 text-ink-lt">
                − Mileage deduction
                {mileageSummaryParts.length > 0 && (
                  <span className="block text-[11px] text-ink-lt/60 mt-0.5">{mileageSummaryLabel}</span>
                )}
              </td>
              <td className="py-4 px-4 text-right font-mono text-sage">− £{mileageDeduction.toLocaleString()}</td>
            </tr>
            <tr className="bg-cream-dk border-t-2 border-sage/22">
              <td className="py-4 px-4 text-ink font-medium">Estimated taxable profit</td>
              <td className="py-4 px-4 text-right font-mono font-medium text-ink text-lg">£{taxableProfit.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      {/* VAT Tracker */}
      <Panel title="VAT tracker">
        <div className="p-4 space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-ink-lt">Your taxable turnover this year</span>
              <span className="font-mono text-sm font-medium text-ink">
                £{revenue.toLocaleString()}
                <span className="text-sage font-normal"> ({vatPercentage.toFixed(0)}% of threshold)</span>
              </span>
            </div>
            <div className="w-full h-2 bg-sage/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-sage transition-all"
                style={{ width: `${vatPercentage}%` }}
              />
            </div>
            <div className="text-xs text-ink-lt mt-2">
              You are <strong className="text-ink">£{vatRemaining.toLocaleString()} below</strong> the VAT registration threshold. No action required.
            </div>
          </div>

          <div className="border-t border-sage/14 pt-4 text-sm text-ink-lt">
            Already VAT registered?{' '}
            <span className="text-sage-lt cursor-pointer hover:text-sage transition underline">
              Switch to VAT-registered view →
            </span>
          </div>
        </div>
      </Panel>

      {/* Insight card */}
      <InsightCard
        text="At current growth (+18%/mo) you could reach the VAT threshold in approximately 14 months. Worth planning ahead with your accountant."
        link={{ text: 'see revenue trend →', onClick: () => {} }}
      />

      {/* Summary breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <Panel title="income summary">
          <div className="p-4 space-y-3 text-sm">
            {(['vinted', 'ebay', 'other'] as const).map((platform) => {
              const platformRevenue = sells
                .filter((s) => {
                  const fields = s.platform_fields as Record<string, unknown> | null
                  const hasVinted = !!fields?.['vinted']
                  const hasEbay = !!fields?.['ebay']
                  if (platform === 'vinted') return hasVinted
                  if (platform === 'ebay') return hasEbay
                  return !hasVinted && !hasEbay
                })
                .reduce((sum, s) => sum + (s.sold_price_gbp || 0), 0)
              if (platformRevenue === 0) return null
              return (
                <div key={platform} className="flex justify-between">
                  <span className="text-ink-lt">{platform === 'ebay' ? 'eBay UK' : platform === 'vinted' ? 'Vinted' : 'Other'}</span>
                  <span className="font-mono font-medium text-ink">£{platformRevenue.toLocaleString()}</span>
                </div>
              )
            })}
            {sells.length === 0 && (
              <p className="text-ink-lt text-xs">No sales recorded in this period</p>
            )}
            <div className="flex justify-between border-t border-sage/14 pt-3 font-medium text-ink">
              <span>Total income</span>
              <span className="font-mono">£{revenue.toLocaleString()}</span>
            </div>
          </div>
        </Panel>

        <Panel title="expense summary">
          <div className="p-4 space-y-3 text-sm">
            {dbCategories.map((cat) => {
              const catTotal = expenses
                .filter((e) => e.category === cat.id)
                .reduce((sum, e) => sum + e.amount_gbp, 0)
              if (catTotal === 0) return null
              return (
                <div key={cat.id} className="flex justify-between">
                  <span className="text-ink-lt">{cat.label}</span>
                  <span className="font-mono font-medium text-ink">£{catTotal.toLocaleString()}</span>
                </div>
              )
            })}
            {expenses.length === 0 && (
              <p className="text-ink-lt text-xs">No expenses recorded in this period</p>
            )}
            <div className="flex justify-between border-t border-sage/14 pt-3 font-medium text-ink">
              <span>Total expenses</span>
              <span className="font-mono">£{operatingExpenses.toLocaleString()}</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
