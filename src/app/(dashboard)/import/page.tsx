'use client'

import { useState } from 'react'
import { Panel } from '@/components/wren/Panel'
import { InsightCard } from '@/components/wren/InsightCard'
import { Badge } from '@/components/wren/Badge'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

interface ImportItem {
  id: string
  name: string
  category: string
  platform: string
  listingId: string
  listedAt: string
  price: number
  emoji: string
  status: 'new' | 'imported'
  checked: boolean
}

const mockItems: ImportItem[] = [
  {
    id: '1',
    name: 'Carhartt Detroit Jacket — Brown, M',
    category: 'workwear',
    platform: 'eBay UK',
    listingId: '158234019283',
    listedAt: 'Mar 2026',
    price: 145,
    emoji: '🧥',
    status: 'new',
    checked: true,
  },
  {
    id: '2',
    name: 'New Balance 990v3 — Grey, 10.5',
    category: 'footwear',
    platform: 'eBay UK',
    listingId: '159902847121',
    listedAt: 'Feb 2026',
    price: 210,
    emoji: '👟',
    status: 'new',
    checked: true,
  },
  {
    id: '3',
    name: 'Laura Ashley Floral Dress — Size 12',
    category: 'womenswear',
    platform: 'eBay UK',
    listingId: '157834920112',
    listedAt: 'Mar 2026',
    price: 38,
    emoji: '👗',
    status: 'new',
    checked: true,
  },
  {
    id: '4',
    name: 'Ray-Ban Clubmaster — Tortoise',
    category: 'accessories',
    platform: 'eBay UK',
    listingId: '156920384721',
    listedAt: 'Jan 2026',
    price: 55,
    emoji: '🕶️',
    status: 'new',
    checked: true,
  },
  {
    id: '5',
    name: 'Pendleton Wool Shirt — Plaid, L',
    category: 'tops',
    platform: 'eBay UK',
    listingId: '157102938471',
    listedAt: 'Feb 2026',
    price: 89,
    emoji: '👕',
    status: 'new',
    checked: true,
  },
  {
    id: '6',
    name: 'Coach Legacy Duffle — Tan',
    category: 'bags',
    platform: 'eBay UK',
    listingId: '156810293847',
    listedAt: 'Dec 2025',
    price: 165,
    emoji: '👜',
    status: 'new',
    checked: false,
  },
  {
    id: '7',
    name: "Levi's 501 — Black, 32×30",
    category: 'denim',
    platform: 'eBay UK',
    listingId: '155920384761',
    listedAt: 'Nov 2025',
    price: 68,
    emoji: '👖',
    status: 'imported',
    checked: false,
  },
]

export default function ImportPage() {
  const [items, setItems] = useState(mockItems)
  const [activeTab, setActiveTab] = useState<'ebay' | 'vinted'>('ebay')
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'imported'>('all')

  const checkedCount = items.filter((i) => i.checked).length
  const filteredItems = items.filter((i) => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'new') return i.status === 'new'
    return i.status === 'imported'
  })

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h1 className="text-lg font-serif text-ink">import finds</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-ink-lt">{checkedCount} selected</span>
          <button className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition">
            import {checkedCount} finds →
          </button>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-0 border-b border-border">
        <button
          onClick={() => setActiveTab('ebay')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'ebay'
              ? 'border-sage text-ink'
              : 'border-transparent text-ink-lt hover:text-ink'
          }`}
        >
          <MarketplaceIcon platform="ebay" size="sm" /> eBay UK <span className="ml-2 text-xs text-ink-lt">147</span>
        </button>
        <button
          onClick={() => setActiveTab('vinted')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === 'vinted'
              ? 'border-sage text-ink'
              : 'border-transparent text-ink-lt hover:text-ink'
          }`}
        >
          <MarketplaceIcon platform="vinted" size="sm" /> Vinted <span className="ml-2 text-xs text-ink-lt">83</span>
        </button>
      </div>

      {/* Sync status bar */}
      <div className="flex items-center justify-between p-4 bg-cream-md rounded border border-border">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-sage"></div>
          <span className="text-sm text-ink">
            147 active listings found · <strong className="text-ink">131 not yet in Wren</strong>
          </span>
        </div>
        <button className="text-sm font-medium text-sage hover:text-sage-dk transition">↻ sync now</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded transition ${
            activeFilter === 'all'
              ? 'bg-sage text-white'
              : 'bg-cream-md text-ink hover:bg-cream-dk'
          }`}
        >
          all
        </button>
        <button
          onClick={() => setActiveFilter('new')}
          className={`px-4 py-2 text-sm font-medium rounded transition ${
            activeFilter === 'new'
              ? 'bg-sage text-white'
              : 'bg-cream-md text-ink hover:bg-cream-dk'
          }`}
        >
          not imported <span className="text-xs font-mono ml-1">131</span>
        </button>
        <button
          onClick={() => setActiveFilter('imported')}
          className={`px-4 py-2 text-sm font-medium rounded transition ${
            activeFilter === 'imported'
              ? 'bg-sage text-white'
              : 'bg-cream-md text-ink hover:bg-cream-dk'
          }`}
        >
          imported <span className="text-xs font-mono ml-1">16</span>
        </button>
        <span className="ml-auto text-sm text-ink-lt">showing {filteredItems.length} finds</span>
      </div>

      {/* Items list */}
      <Panel>
        <div className="space-y-0">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-4 p-4 border-b border-border last:border-b-0 ${
                item.status === 'imported' ? 'bg-cream-md opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={item.checked && item.status === 'new'}
                disabled={item.status === 'imported'}
                onChange={(e) => {
                  setItems(
                    items.map((i) => (i.id === item.id ? { ...i, checked: e.target.checked } : i))
                  )
                }}
                className="w-4 h-4"
              />
              <div className="text-2xl">{item.emoji}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-ink">{item.name}</div>
                <div className="text-xs text-ink-lt mt-1">
                  {item.category} · eBay listing #{item.listingId} · listed {item.listedAt}
                </div>
                <Badge
                  status={item.status === 'new' ? 'draft' : 'listed'}
                  label={item.status === 'new' ? 'not in wren' : 'already in wren'}
                />
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold text-sm text-ink">£{item.price}</div>
                <div className="text-xs text-ink-lt">asking</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Bottom action bar */}
      <div className="flex items-center justify-between p-4 bg-cream-md rounded">
        <div>
          <strong className="text-ink">{checkedCount}</strong> <span className="text-sm text-ink-lt">
            finds selected to import
          </span>
        </div>
        <div className="text-sm text-amber">
          ⚠ Cost price not set — add after import for accurate margins
        </div>
      </div>

      {/* Insight */}
      <InsightCard
        text="Your eBay footwear is averaging 96% margin — prioritise importing those first to get your analytics working for you."
      />
    </div>
  )
}
