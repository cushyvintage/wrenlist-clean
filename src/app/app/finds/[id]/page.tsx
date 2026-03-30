'use client'

import { useState } from 'react'
import { Panel } from '@/components/wren/Panel'
import { Badge } from '@/components/wren/Badge'
import { InsightCard } from '@/components/wren/InsightCard'
import { Button } from '@/components/wren/Button'
import type { Find, Listing } from '@/types'

// Mock data
const mockFind: Find & { listings: Listing[] } = {
  id: '1',
  user_id: 'user_1',
  name: 'Carhartt Detroit jacket — brown, M',
  category: 'workwear',
  brand: 'Carhartt',
  size: 'M',
  colour: 'Brown',
  condition: 'good',
  description:
    'Iconic Carhartt Detroit Jacket in brown, men\'s medium. Heavy cotton duck canvas, quilted nylon lining. Classic workwear silhouette. Minor wear on cuffs consistent with age — overall excellent vintage condition. One of the most sought-after Carhartt pieces.',
  cost_gbp: 12,
  asking_price_gbp: 145,
  source_type: 'house_clearance',
  source_name: 'Builth Wells house clearance',
  sourced_at: '2026-02-14T00:00:00Z',
  status: 'listed',
  sold_price_gbp: null,
  sold_at: null,
  photos: [],
  ai_generated_description: null,
  ai_suggested_price_low: null,
  ai_suggested_price_high: null,
  created_at: '2026-02-14T00:00:00Z',
  updated_at: '2026-03-30T00:00:00Z',
  listings: [
    {
      id: 'l1',
      find_id: '1',
      user_id: 'user_1',
      platform: 'ebay',
      platform_listing_id: 'ebay_123',
      status: 'live',
      listed_at: '2026-02-15T00:00:00Z',
      delisted_at: null,
      views: 145,
      created_at: '2026-02-15T00:00:00Z',
      updated_at: '2026-03-30T00:00:00Z',
    },
    {
      id: 'l2',
      find_id: '1',
      user_id: 'user_1',
      platform: 'vinted',
      platform_listing_id: 'vinted_456',
      status: 'live',
      listed_at: '2026-02-16T00:00:00Z',
      delisted_at: null,
      views: 89,
      created_at: '2026-02-16T00:00:00Z',
      updated_at: '2026-03-30T00:00:00Z',
    },
  ],
}

const margin = Math.round(((mockFind.asking_price_gbp! - mockFind.cost_gbp!) / mockFind.cost_gbp!) * 100)

export default function FindDetailPage({ params }: { params: { id: string } }) {
  const [find, setFind] = useState(mockFind)

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <a href="/app/inventory" className="text-sm text-ink-lt hover:text-ink transition">
            ← inventory
          </a>
          <span className="text-border-md">/</span>
          <h1 className="text-lg font-serif text-ink">{find.name}</h1>
          <Badge status={find.status}>{find.status}</Badge>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition">
            mark sold
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
            save changes
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-[340px_1fr] gap-6 items-start">
        {/* LEFT: Photos & Platforms */}
        <div className="space-y-4">
          {/* Photos panel */}
          <Panel>
            <div className="space-y-4">
              <div className="text-center py-12 bg-cream-md rounded flex items-center justify-center text-4xl min-h-[300px]">
                🧥
              </div>
              <div className="flex gap-2">
                <div className="w-12 h-12 rounded bg-cream-md flex items-center justify-center text-lg border-2 border-sage cursor-pointer">
                  🧥
                </div>
                <div className="w-12 h-12 rounded bg-cream-md flex items-center justify-center text-lg border-2 border-border cursor-pointer">
                  🧥
                </div>
                <div className="w-12 h-12 rounded bg-cream-md flex items-center justify-center text-lg border-2 border-border cursor-pointer">
                  🏷
                </div>
                <div className="w-12 h-12 rounded border-2 border-dashed border-border flex items-center justify-center text-lg text-ink-lt cursor-pointer hover:bg-cream-md transition">
                  +
                </div>
              </div>
            </div>
          </Panel>

          {/* Platforms panel */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-4">platforms</h3>
            <div className="space-y-2">
              {find.listings.map((listing) => (
                <div key={listing.id} className="flex justify-between items-center p-3 bg-cream-md rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {listing.platform === 'ebay' ? '🛒' : listing.platform === 'vinted' ? '👚' : '🎨'}
                    </span>
                    <span className="text-sm font-medium text-ink capitalize">{listing.platform}</span>
                  </div>
                  <Badge status="listed">{listing.status}</Badge>
                </div>
              ))}
              <button className="w-full p-3 border border-dashed border-border rounded text-sm text-ink-lt hover:bg-cream-md transition">
                + list on another platform
              </button>
            </div>
          </Panel>

          {/* Danger zone */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-4">danger zone</h3>
            <div className="space-y-2">
              <button className="w-full px-4 py-2 text-sm font-medium text-amber border border-border rounded hover:bg-amber hover:bg-opacity-5 transition">
                delist from all platforms
              </button>
              <button className="w-full px-4 py-2 text-sm font-medium text-red border border-border rounded hover:bg-red hover:bg-opacity-5 transition">
                delete find
              </button>
            </div>
          </Panel>
        </div>

        {/* RIGHT: Details form */}
        <div className="space-y-4">
          {/* Item details */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-6">item details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  item name
                </label>
                <input
                  type="text"
                  value={find.name}
                  className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                  readOnly
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    category
                  </label>
                  <input
                    type="text"
                    value={find.category || ''}
                    className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    brand
                  </label>
                  <input
                    type="text"
                    value={find.brand || ''}
                    className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    size
                  </label>
                  <input
                    type="text"
                    value={find.size || ''}
                    className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    colour
                  </label>
                  <input
                    type="text"
                    value={find.colour || ''}
                    className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  description
                </label>
                <textarea
                  value={find.description || ''}
                  rows={4}
                  className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                  readOnly
                />
              </div>
            </div>
          </Panel>

          {/* Pricing */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-6">pricing</h3>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  cost price
                </label>
                <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm font-mono text-ink">
                  £{find.cost_gbp?.toFixed(2)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  asking price
                </label>
                <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm font-mono text-ink">
                  £{find.asking_price_gbp?.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-sage-pale rounded text-center">
                <div className="text-xs font-medium text-sage-dim mb-1 uppercase tracking-wide">margin</div>
                <div className="text-2xl font-mono font-semibold text-sage-dk">{margin}%</div>
              </div>
            </div>
          </Panel>

          {/* Sourcing */}
          <Panel>
            <h3 className="font-medium text-sm text-ink mb-6">sourcing</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  source type
                </label>
                <input
                  type="text"
                  value={find.source_type || ''}
                  className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  source name / location
                </label>
                <input
                  type="text"
                  value={find.source_name || ''}
                  className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  sourced date
                </label>
                <input
                  type="date"
                  value={find.sourced_at?.split('T')[0] || ''}
                  className="w-full px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink"
                  readOnly
                />
              </div>
            </div>
          </Panel>

          {/* Insight */}
          <InsightCard
            title="wren insight"
            text="Carhartt Detroit jackets in brown are moving fast on eBay right now — average sell time 8 days, avg price £138. Your asking price of £145 is positioned well. Consider crosslisting to Depop for the younger buyer segment."
          />
        </div>
      </div>
    </div>
  )
}
