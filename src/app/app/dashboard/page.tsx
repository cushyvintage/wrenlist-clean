'use client'

import { StatCard } from '@/components/wren/StatCard'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { InventoryRow } from '@/components/wren/InventoryRow'
import { useRouter } from 'next/navigation'
import type { Find } from '@/types'

// Mock data for demo
const mockFinds: Find[] = [
  {
    id: '1',
    user_id: 'user_1',
    name: 'Carhartt Detroit Jacket',
    category: 'workwear',
    brand: 'Carhartt',
    size: 'M',
    colour: 'brown',
    condition: 'excellent',
    description: 'Vintage workwear jacket',
    cost_gbp: 12,
    asking_price_gbp: 145,
    source_type: 'house_clearance',
    source_name: 'house clearance',
    sourced_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'listed',
    sold_price_gbp: null,
    sold_at: null,
    photos: [],
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    user_id: 'user_1',
    name: 'Levi\'s 501 Denim',
    category: 'denim',
    brand: 'Levi\'s',
    size: '32',
    colour: 'indigo',
    condition: 'good',
    description: 'Classic 501 jeans',
    cost_gbp: 8,
    asking_price_gbp: 45,
    source_type: 'charity_shop',
    source_name: 'Oxfam',
    sourced_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'listed',
    sold_price_gbp: null,
    sold_at: null,
    photos: [],
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'user_1',
    name: 'Nike Air Max 90',
    category: 'footwear',
    brand: 'Nike',
    size: '10',
    colour: 'white/red',
    condition: 'excellent',
    description: 'Vintage sneakers',
    cost_gbp: 15,
    asking_price_gbp: 95,
    source_type: 'car_boot',
    source_name: 'car boot sale',
    sourced_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'draft',
    sold_price_gbp: null,
    sold_at: null,
    photos: [],
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export default function DashboardPage() {
  const router = useRouter()

  // Calculate metrics from mock data
  const activeFinds = mockFinds.filter((f) => f.status === 'listed').length
  const monthlyRevenue = 450 // £450 this month
  const avgMargin = 82 // 82% average margin
  const avgDaysToSell = 7 // Days

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="font-serif text-4xl text-ink mb-2">Welcome back</h1>
        <p className="text-ink-lt">You have {activeFinds} finds listed across all platforms</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active finds"
          value={activeFinds}
          delta="+2 this week"
          suffix=""
        />
        <StatCard
          label="Monthly revenue"
          value={monthlyRevenue}
          prefix="£"
          delta="+£120 vs last month"
          suffix=""
        />
        <StatCard
          label="Avg margin"
          value={avgMargin}
          suffix="%"
          delta="stable"
        />
        <StatCard
          label="Days to sell"
          value={avgDaysToSell}
          suffix=" days"
          delta="↓1 day (improving)"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent inventory */}
        <div className="lg:col-span-2">
          <Panel title="Recent inventory">
            <table className="w-full">
              <thead className="text-xs uppercase tracking-widest text-sage-dim font-medium border-b border-sage/14">
                <tr>
                  <th className="text-left py-3 px-0">Item</th>
                  <th className="text-right py-3 px-0">Cost</th>
                  <th className="text-right py-3 px-0">Price</th>
                  <th className="text-right py-3 px-0">Margin</th>
                  <th className="text-right py-3 px-0">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockFinds.slice(0, 3).map((find) => (
                  <InventoryRow
                    key={find.id}
                    find={find}
                    onClick={() => router.push(`/app/inventory/${find.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </Panel>
        </div>

        {/* Right: Insights & activity */}
        <div className="space-y-4">
          {/* Wren insight */}
          <InsightCard
            text="Your estate sale finds have 3x higher margins than charity shop finds."
            link={{ text: 'see sourcing analysis', onClick: () => router.push('/app/analytics') }}
          />

          {/* Quick stats */}
          <Panel title="This month">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-lt">Finds listed</span>
                <span className="font-medium text-ink">8</span>
              </div>
              <div className="flex justify-between border-t border-sage/14 pt-3">
                <span className="text-ink-lt">Items sold</span>
                <span className="font-medium text-ink">3</span>
              </div>
              <div className="flex justify-between border-t border-sage/14 pt-3">
                <span className="text-ink-lt">Total revenue</span>
                <span className="font-mono font-medium text-ink">£450</span>
              </div>
            </div>
          </Panel>

          {/* CTA */}
          <button
            onClick={() => router.push('/app/add-find')}
            className="w-full px-4 py-3 bg-sage text-white hover:bg-sage-dk rounded font-medium transition-colors"
          >
            ➕ Add new find
          </button>
        </div>
      </div>

      {/* Activity section */}
      <Panel title="Recent activity">
        <div className="space-y-3 text-sm">
          <div className="pb-3 border-b border-sage/14">
            <p className="font-medium text-ink">Listed &ldquo;Carhartt Detroit Jacket&rdquo;</p>
            <p className="text-xs text-ink-lt mt-1">5 days ago • Vinted</p>
          </div>
          <div className="pb-3 border-b border-sage/14">
            <p className="font-medium text-ink">Sold &ldquo;Vintage band tee&rdquo;</p>
            <p className="text-xs text-ink-lt mt-1">8 days ago • eBay UK • £28.50</p>
          </div>
          <div>
            <p className="font-medium text-ink">Added to inventory (5 items)</p>
            <p className="text-xs text-ink-lt mt-1">10 days ago • House clearance</p>
          </div>
        </div>
      </Panel>
    </div>
  )
}
