'use client'

import { useState } from 'react'
import { Panel } from '@/components/wren/Panel'
import { StatCard } from '@/components/wren/StatCard'
import { InsightCard } from '@/components/wren/InsightCard'
import { Badge } from '@/components/wren/Badge'

interface SoldListing {
  title: string
  platform: string
  condition: string
  price: number
  soldDate: string
}

interface PlatformStats {
  platform: string
  avgPrice: number
  daysToSell: number
}

const mockSoldListings: SoldListing[] = [
  {
    title: 'Carhartt Detroit Jacket Brown M Excellent',
    platform: 'eBay UK',
    condition: 'Excellent',
    price: 165,
    soldDate: '2 days ago',
  },
  {
    title: 'Carhartt WIP Detroit Jacket — M — Brown',
    platform: 'Depop',
    condition: 'Good',
    price: 110,
    soldDate: '3 days ago',
  },
  {
    title: 'Vintage Carhartt Detroit M Brown VGC',
    platform: 'eBay UK',
    condition: 'Very Good',
    price: 142,
    soldDate: '5 days ago',
  },
  {
    title: 'Carhartt Detroit Jacket M Brown Used',
    platform: 'Vinted',
    condition: 'Good',
    price: 88,
    soldDate: '6 days ago',
  },
  {
    title: 'Carhartt Detroit Jacket Blanket Lined M',
    platform: 'eBay UK',
    condition: 'Excellent',
    price: 195,
    soldDate: '1 week ago',
  },
  {
    title: 'Carhartt Detroit Jacket Brown Medium',
    platform: 'Depop',
    condition: 'Good',
    price: 95,
    soldDate: '1 week ago',
  },
]

const platformStats: PlatformStats[] = [
  { platform: 'eBay UK', avgPrice: 148, daysToSell: 6.8 },
  { platform: 'Depop', avgPrice: 108, daysToSell: 8.4 },
  { platform: 'Vinted', avgPrice: 92, daysToSell: 9.1 },
  { platform: 'Etsy', avgPrice: 138, daysToSell: 12.3 },
]

export default function PriceResearchPage() {
  const [searchTerm, setSearchTerm] = useState('Carhartt Detroit jacket brown M')
  const [condition, setCondition] = useState('all')

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-serif text-ink">price research</h1>
      </div>

      {/* Search panel */}
      <Panel>
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
              placeholder="Search for items..."
            />
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
            >
              <option value="all">All conditions</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
            </select>
            <button className="px-6 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
              research
            </button>
          </div>

          {/* Tags */}
          <div className="flex gap-2 flex-wrap">
            {['Carhartt', 'Detroit jacket', 'workwear', 'brown', 'M'].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 text-xs font-medium rounded bg-sage-pale text-sage-dk cursor-pointer hover:bg-sage-dk hover:text-sage-pale transition"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="avg sold price"
          value="£128"
          delta="last 90 days · 47 sales"
        />
        <StatCard
          label="price range"
          value="£85–£195"
          delta="excellent condition"
        />
        <StatCard
          label="avg days to sell"
          value="7.4"
          delta="strong demand"
        />
        <StatCard
          label="best platform"
          value="eBay UK"
          delta="highest avg price"
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-[1fr_320px] gap-6">
        {/* LEFT: Recent sold listings */}
        <Panel>
          <h3 className="font-medium text-sm text-ink mb-4">recent sold listings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">title</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">platform</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">condition</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">price</th>
                  <th className="px-4 py-2 text-left font-medium text-ink-lt text-xs">sold</th>
                </tr>
              </thead>
              <tbody>
                {mockSoldListings.map((listing, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-cream-md transition">
                    <td className="px-4 py-3 text-ink text-sm">{listing.title}</td>
                    <td className="px-4 py-3">
                      <Badge status="listed">{listing.platform}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink text-sm">{listing.condition}</td>
                    <td className="px-4 py-3 font-mono text-ink text-sm">£{listing.price}</td>
                    <td className="px-4 py-3 text-ink-lt text-sm">{listing.soldDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* RIGHT: Platform stats & recommendation */}
        <div className="space-y-4">
          {/* By platform */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-4">by platform</h3>
            <div className="space-y-0">
              {platformStats.map((stat) => (
                <div
                  key={stat.platform}
                  className="flex items-center justify-between p-3 border-b border-border last:border-b-0"
                >
                  <span className="text-sm text-ink">{stat.platform}</span>
                  <div className="text-right">
                    <div className="font-mono text-sm font-semibold text-ink">£{stat.avgPrice} avg</div>
                    <div className="text-xs text-sage-dim">{stat.daysToSell} days</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Recommendation */}
          <InsightCard
            title="wren recommendation"
            text="List on eBay UK at £145–£155 for excellent condition. Vinted at £110 as secondary. Expect to sell within 7–8 days."
          />

          <button className="w-full px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
            use this price in a new find →
          </button>
        </div>
      </div>
    </div>
  )
}
