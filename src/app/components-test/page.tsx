'use client'

import { StatCard } from '@/components/wren/StatCard'
import { Badge } from '@/components/wren/Badge'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { PlatformTag } from '@/components/wren/PlatformTag'
import { InventoryRow } from '@/components/wren/InventoryRow'
import { SidebarItem } from '@/components/wren/SidebarItem'
import { ListingCard } from '@/components/wren/ListingCard'
import { WrenInsight } from '@/components/wren/WrenInsight'
import { PriceCalculator } from '@/components/wren/PriceCalculator'
import { useState } from 'react'

// Mock data
const mockFind = {
  id: '123',
  name: 'Carhartt Detroit Jacket',
  category: 'workwear',
  cost_gbp: 12,
  asking_price_gbp: 145,
  source_name: 'house clearance',
  status: 'listed' as const,
  sourced_at: new Date().toISOString(),
}

const mockListing = {
  id: '456',
  find_id: '123',
  platform: 'vinted' as const,
  status: 'live' as const,
  find: mockFind,
  views: 42,
  platform_listing_id: 'vinted_123',
  listed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
}

export default function ComponentsTest() {
  const [cost, setCost] = useState<number | null>(12)
  const [askingPrice, setAskingPrice] = useState<number | null>(145)

  return (
    <div className="min-h-screen bg-cream p-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-4xl text-ink mb-2">Wrenlist Component Library</h1>
        <p className="text-ink-lt mb-12">All 10 components with sample data</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 1. StatCard */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">1. StatCard</h2>
            <StatCard
              label="Active Finds"
              value={42}
              delta="+8 this month"
              suffix=""
            />
          </div>

          {/* 2. Badge */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">2. Badge</h2>
            <div className="space-y-2">
              <Badge status="listed" />
              <Badge status="draft" />
              <Badge status="on_hold" />
              <Badge status="sold" />
            </div>
          </div>

          {/* 3. Panel */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">3. Panel</h2>
            <Panel
              title="Recent Activity"
              action={{ text: 'view all', onClick: () => {} }}
            >
              <p className="text-sm text-ink">Panel content goes here</p>
            </Panel>
          </div>

          {/* 4. InsightCard */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">4. InsightCard</h2>
            <InsightCard
              text="Your house clearance finds convert 40% faster than charity shop finds."
              link={{ text: 'see full analysis →' }}
            />
          </div>

          {/* 5. PlatformTag */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">5. PlatformTag</h2>
            <div className="space-y-2">
              <PlatformTag platform="vinted" live={true} />
              <PlatformTag platform="ebay" live={false} />
              <PlatformTag platform="etsy" live={true} />
            </div>
          </div>

          {/* 6. InventoryRow */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">6. InventoryRow</h2>
            <Panel>
              <table className="w-full">
                <tbody>
                  <InventoryRow find={mockFind} />
                </tbody>
              </table>
            </Panel>
          </div>

          {/* 7. SidebarItem */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">7. SidebarItem</h2>
            <div className="bg-slate-800 rounded p-2 w-fit">
              <SidebarItem
                icon="📊"
                label="Dashboard"
                active={true}
                onClick={() => {}}
              />
              <SidebarItem
                icon="📦"
                label="Inventory"
                active={false}
                onClick={() => {}}
              />
            </div>
          </div>

          {/* 8. ListingCard */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">8. ListingCard</h2>
            <ListingCard
              listing={mockListing}
              onEdit={() => {}}
              onMarkSold={() => {}}
              onRelist={() => {}}
            />
          </div>

          {/* 9. WrenInsight */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">9. WrenInsight</h2>
            <WrenInsight
              find={mockFind}
              loading={false}
              insight={{
                priceRange: { min: 120, max: 180 },
                bestPlatform: 'vinted',
                projectedMargin: 92,
                avgDaysToSell: 8,
              }}
            />
          </div>

          {/* 10. PriceCalculator */}
          <div>
            <h2 className="text-lg font-medium text-ink mb-3">10. PriceCalculator</h2>
            <PriceCalculator
              cost={cost}
              askingPrice={askingPrice}
              onCostChange={setCost}
              onAskingPriceChange={setAskingPrice}
            />
          </div>
        </div>

        <div className="mt-16 p-6 bg-white border border-sage/14 rounded-md">
          <h2 className="text-lg font-medium text-ink mb-2">Design System Check</h2>
          <ul className="space-y-1 text-sm text-ink-md">
            <li>✓ Colors: Cream (#F5F0E8) background</li>
            <li>✓ Typography: Cormorant Garamond (display), Jost (UI), DM Mono (prices)</li>
            <li>✓ Spacing: Tailwind defaults (p-5, gap-4)</li>
            <li>✓ Borders: sage/14 opacity instead of shadows</li>
            <li>✓ All 10 components rendering correctly</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
