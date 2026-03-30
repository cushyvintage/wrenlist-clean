'use client'

import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { InsightCard } from '@/components/wren/InsightCard'

interface SupplierVisit {
  date: string
  items: number
  spend: number
  margin: number
}

interface Supplier {
  id: string
  name: string
  contact: string
  phone: string
  area: string
  frequency: string
  bestCategories: string[]
  notes: string
  visits: SupplierVisit[]
  totalVisits: number
  totalSpend: number
  itemsBought: number
  avgMargin: number
}

// Mock data
const mockSupplier: Supplier = {
  id: '1',
  name: 'Smith House Clearances',
  contact: 'James Smith',
  phone: '07700 900123',
  area: 'East London — Hackney, Bethnal Green, Bow',
  frequency: 'Monthly — notified by SMS',
  bestCategories: ['Workwear', 'Denim', 'Footwear'],
  notes: 'Always gets good 1980s–90s workwear. Arrive early (7am) for best selection. Cash preferred.',
  visits: [
    { date: '29 Mar 2026', items: 14, spend: 68, margin: 94 },
    { date: '15 Mar 2026', items: 18, spend: 92, margin: 96 },
    { date: '1 Feb 2026', items: 10, spend: 54, margin: 91 },
    { date: '8 Jan 2026', items: 12, spend: 70, margin: 93 },
  ],
  totalVisits: 12,
  totalSpend: 640,
  itemsBought: 142,
  avgMargin: 94,
}

export default function SupplierDetailPage() {
  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <a href="/suppliers" className="text-sm text-sage-lt hover:text-sage transition">
            ← suppliers
          </a>
          <span className="text-border-md">/</span>
          <h1 className="text-lg font-serif text-ink">{mockSupplier.name}</h1>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition">
            edit
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
            + log visit
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-[1fr_320px] gap-6 items-start">
        {/* LEFT: Supplier info & visit history */}
        <div className="space-y-4">
          {/* Supplier info panel */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-6">supplier info</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-ink-lt mb-1 uppercase tracking-wide">contact</div>
                  <div className="text-sm text-ink">{mockSupplier.contact}</div>
                </div>
                <div>
                  <div className="text-xs font-medium text-ink-lt mb-1 uppercase tracking-wide">phone</div>
                  <div className="text-sm text-ink">{mockSupplier.phone}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-ink-lt mb-1 uppercase tracking-wide">area</div>
                <div className="text-sm text-ink">{mockSupplier.area}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-ink-lt mb-1 uppercase tracking-wide">frequency</div>
                <div className="text-sm text-ink">{mockSupplier.frequency}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">best categories</div>
                <div className="flex gap-2 flex-wrap">
                  {mockSupplier.bestCategories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1 text-xs font-medium rounded bg-sage-pale text-sage-dk"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-ink-lt mb-1 uppercase tracking-wide">notes</div>
                <div className="text-sm text-ink-lt font-light">{mockSupplier.notes}</div>
              </div>
            </div>
          </Panel>

          {/* Visit history table */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-4">visit history</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">date</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">items</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">spend</th>
                    <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">margin</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSupplier.visits.map((visit, idx) => (
                    <tr key={idx} className="border-b border-border">
                      <td className="px-4 py-2 text-ink text-sm">{visit.date}</td>
                      <td className="px-4 py-2 text-ink text-sm font-mono">{visit.items}</td>
                      <td className="px-4 py-2 text-ink text-sm font-mono">£{visit.spend}</td>
                      <td className="px-4 py-2 text-green-600 text-sm font-mono">{visit.margin}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* RIGHT: Stats & next visit */}
        <div className="space-y-4">
          {/* Stats grid */}
          <div className="space-y-2">
            <StatCard label="total visits" value={mockSupplier.totalVisits.toString()} />
            <StatCard
              label="total spend"
              value={`£${mockSupplier.totalSpend}`}
            />
            <StatCard
              label="items bought"
              value={mockSupplier.itemsBought.toString()}
            />
            <StatCard
              label="avg margin"
              value={`${mockSupplier.avgMargin}%`}
              delta="best supplier"
            />
          </div>

          {/* Insight */}
          <InsightCard
            text="Smith House Clearances is your highest-performing source by margin and sell-through speed. Worth prioritising every available visit."
          />

          {/* Next visit panel */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-4">next visit</h3>
            <div className="space-y-4">
              <div className="text-2xl font-serif text-ink">Wednesday, 2 April</div>
              <div className="text-sm text-ink-lt">Hackney, East London · est. 7am start</div>
              <button className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
                add to calendar
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
