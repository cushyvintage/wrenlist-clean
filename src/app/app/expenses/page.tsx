'use client'

import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Expense {
  id: string
  date: string
  description: string
  category: 'packaging' | 'postage' | 'platform fees' | 'supplies' | 'vehicle' | 'other'
  amount: number
  vat?: number
}

const mockExpenses: Expense[] = [
  {
    id: '1',
    date: '28 Mar 2026',
    description: 'eBay selling fees — March',
    category: 'platform fees',
    amount: 38.40,
    vat: 7.68,
  },
  {
    id: '2',
    date: '25 Mar 2026',
    description: 'Jiffy bags × 100 (9×12")',
    category: 'packaging',
    amount: 14.99,
  },
  {
    id: '3',
    date: '22 Mar 2026',
    description: 'Royal Mail Click & Drop — batch',
    category: 'postage',
    amount: 67.20,
  },
  {
    id: '4',
    date: '18 Mar 2026',
    description: 'Vinted subscription — March',
    category: 'platform fees',
    amount: 4.99,
    vat: 1.00,
  },
  {
    id: '5',
    date: '15 Mar 2026',
    description: 'Wrenlist — Forager plan',
    category: 'supplies',
    amount: 29.00,
    vat: 5.80,
  },
  {
    id: '6',
    date: '10 Mar 2026',
    description: 'Bubble wrap roll × 2',
    category: 'packaging',
    amount: 8.50,
  },
  {
    id: '7',
    date: '04 Mar 2026',
    description: 'Petrol — sourcing run Portobello',
    category: 'vehicle',
    amount: 22.00,
    vat: 4.40,
  },
]

const categoryColors: Record<string, string> = {
  'packaging': 'bg-amber-lt text-amber-dk',
  'postage': 'bg-blue-lt text-blue-dk',
  'platform fees': 'bg-red-lt text-red-dk',
  'supplies': 'bg-sage-pale text-sage-dk',
  'vehicle': 'bg-cream-dk text-ink',
  'other': 'bg-cream-md text-ink-lt',
}

export default function ExpensesPage() {
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchTerm] = useState('')

  const categories: (Expense['category'] | 'all')[] = ['all', 'packaging', 'postage', 'platform fees', 'supplies', 'vehicle', 'other']

  const filteredExpenses = mockExpenses.filter(exp => {
    const matchesCategory = !activeCategory || activeCategory === 'all' || exp.category === activeCategory
    const matchesSearch = !searchTerm || exp.description.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-blue-lt border border-blue-dk/20 rounded-md p-4 text-sm text-blue-dk">
        <strong>Disclaimer:</strong> Wrenlist helps you track your business expenses — you are responsible for your own tax filings. Always consult an accountant for advice.
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat === 'all' ? null : cat)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              (activeCategory === null && cat === 'all') || activeCategory === cat
                ? 'bg-sage text-cream'
                : 'bg-cream-md text-ink-lt hover:bg-cream-dk'
            }`}
          >
            {cat === 'all' ? 'all' : cat}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-lt">Apr 2025 – Mar 2026</span>
      </div>

      {/* Expenses table */}
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
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-cream-md transition">
                  <td className="py-3 px-4 text-xs text-ink-lt">{expense.date}</td>
                  <td className="py-3 px-4 text-ink">{expense.description}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${categoryColors[expense.category]}`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium text-ink">£{expense.amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-ink-lt">
                    {expense.vat ? `£${expense.vat.toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs text-ink-lt cursor-pointer hover:text-ink transition">
                    edit
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total row */}
        <div className="px-4 py-4 bg-cream-md border-t border-sage/14 flex justify-between items-center font-medium">
          <span className="text-sm text-ink-lt">Total expenses this tax year</span>
          <span className="font-serif text-xl font-medium text-ink">£{(1847.30).toFixed(2)}</span>
        </div>
      </Panel>

      {/* Insight card */}
      <InsightCard
        text="Platform fees are your largest expense at £312/mo. eBay alone is 68% of that — worth checking if a different listing strategy reduces final value fees."
        link={{ text: 'see revenue trend →', onClick: () => router.push('/app/analytics') }}
      />
    </div>
  )
}
