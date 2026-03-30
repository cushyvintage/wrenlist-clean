'use client'

import { useState } from 'react'
import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { Badge } from '@/components/wren/Badge'

interface SoldItem {
  name: string
  category: string
  source: string
  cost: number
  soldFor: number
  margin: number
  platform: string
  daysListed: number
  soldDate: string
}

const mockSoldItems: SoldItem[] = [
  {
    name: 'Pendleton wool shirt — L',
    category: 'tops',
    source: 'flea market',
    cost: 6,
    soldFor: 89,
    margin: 93,
    platform: 'Vinted',
    daysListed: 5,
    soldDate: 'today',
  },
  {
    name: "Levi's 501 orange tab — 34×32",
    category: 'denim',
    source: 'house clearance',
    cost: 8,
    soldFor: 112,
    margin: 93,
    platform: 'eBay UK',
    daysListed: 3,
    soldDate: '3 days ago',
  },
  {
    name: 'Laura Ashley dress — 12',
    category: 'womenswear',
    source: 'car boot',
    cost: 2,
    soldFor: 38,
    margin: 95,
    platform: 'Etsy',
    daysListed: 8,
    soldDate: '4 days ago',
  },
  {
    name: 'Barbour Bedale — navy, M',
    category: 'outerwear',
    source: 'charity shop',
    cost: 18,
    soldFor: 185,
    margin: 90,
    platform: 'eBay UK',
    daysListed: 11,
    soldDate: '6 days ago',
  },
  {
    name: "Levi's 550 relaxed — 36×30",
    category: 'denim',
    source: 'Oxfam',
    cost: 4,
    soldFor: 52,
    margin: 92,
    platform: 'Vinted',
    daysListed: 9,
    soldDate: '1 week ago',
  },
  {
    name: 'Timberland 6" boot — 10',
    category: 'footwear',
    source: 'online haul',
    cost: 14,
    soldFor: 95,
    margin: 85,
    platform: 'eBay UK',
    daysListed: 14,
    soldDate: '1 week ago',
  },
]

export default function SoldHistoryPage() {
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'all'>('month')

  const itemsSold = mockSoldItems.length
  const totalRevenue = mockSoldItems.reduce((sum, item) => sum + item.soldFor, 0)
  const totalCost = mockSoldItems.reduce((sum, item) => sum + item.cost, 0)
  const totalProfit = totalRevenue - totalCost - 150 // Subtract packaging costs
  const avgMargin = Math.round(mockSoldItems.reduce((sum, item) => sum + item.margin, 0) / mockSoldItems.length)

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-serif text-ink">sold history</h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setTimeframe('month')}
              className={`px-4 py-2 text-sm font-medium rounded transition ${
                timeframe === 'month'
                  ? 'bg-sage text-white'
                  : 'bg-cream-md text-ink hover:bg-cream-dk'
              }`}
            >
              this month
            </button>
            <button
              onClick={() => setTimeframe('quarter')}
              className={`px-4 py-2 text-sm font-medium rounded transition ${
                timeframe === 'quarter'
                  ? 'bg-sage text-white'
                  : 'bg-cream-md text-ink hover:bg-cream-dk'
              }`}
            >
              3 months
            </button>
            <button
              onClick={() => setTimeframe('all')}
              className={`px-4 py-2 text-sm font-medium rounded transition ${
                timeframe === 'all'
                  ? 'bg-sage text-white'
                  : 'bg-cream-md text-ink hover:bg-cream-dk'
              }`}
            >
              all time
            </button>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition">
            export CSV
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="items sold"
          value={itemsSold.toString()}
          delta="+8 vs last month"
        />
        <StatCard
          label="total revenue"
          value={`£${totalRevenue.toLocaleString()}`}
          delta={`£${Math.round(totalRevenue / itemsSold)} avg per item`}
        />
        <StatCard
          label="total profit"
          value={`£${totalProfit.toLocaleString()}`}
          delta="after cost & packaging"
        />
        <StatCard
          label="avg margin"
          value={`${avgMargin}%`}
          delta="up from 61%"
        />
      </div>

      {/* Sold items table */}
      <Panel>
        <h3 className="font-medium text-sm text-ink mb-4">all sold items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">item</th>
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">category</th>
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">source</th>
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">cost</th>
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">sold for</th>
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">margin</th>
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">platform</th>
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">days listed</th>
                <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">sold</th>
              </tr>
            </thead>
            <tbody>
              {mockSoldItems.map((item, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-cream-md transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-sm text-ink">{item.name}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-lt text-sm">{item.category}</td>
                  <td className="px-4 py-3 text-ink-lt text-sm">{item.source}</td>
                  <td className="px-4 py-3 font-mono text-ink text-sm">£{item.cost}</td>
                  <td className="px-4 py-3 font-mono text-ink text-sm">£{item.soldFor}</td>
                  <td className="px-4 py-3 text-green-600 text-sm font-mono">{item.margin}%</td>
                  <td className="px-4 py-3">
                    <Badge status="listed" label={item.platform} />
                  </td>
                  <td className="px-4 py-3 font-mono text-ink text-sm">{item.daysListed}</td>
                  <td className="px-4 py-3 text-ink-lt text-sm">{item.soldDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
