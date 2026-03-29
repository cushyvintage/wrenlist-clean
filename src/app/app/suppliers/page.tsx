'use client'

import { useState } from 'react'

interface Supplier {
  id: string
  name: string
  type: 'house_clearance' | 'charity_shop' | 'car_boot' | 'flea_market' | 'other'
  location: string
  contact_name: string
  phone: string
  visit_count: number
  total_items_found: number
  avg_margin_pct: number
  last_visit: string
}

const mockSuppliers: Supplier[] = [
  {
    id: 's1',
    name: 'Oxfam High Street',
    type: 'charity_shop',
    location: 'Manchester City Centre',
    contact_name: 'Sarah',
    phone: '0161 XXX XXXX',
    visit_count: 18,
    total_items_found: 156,
    avg_margin_pct: 182,
    last_visit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's2',
    name: 'Stockport Car Boot Sale',
    type: 'car_boot',
    location: 'Stockport',
    contact_name: 'Mike',
    phone: '0161 XXX XXXX',
    visit_count: 12,
    total_items_found: 234,
    avg_margin_pct: 156,
    last_visit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's3',
    name: 'Wilmslow Estate Clearance',
    type: 'house_clearance',
    location: 'Wilmslow, Cheshire',
    contact_name: 'David',
    phone: '0161 XXX XXXX',
    visit_count: 8,
    total_items_found: 142,
    avg_margin_pct: 198,
    last_visit: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's4',
    name: 'British Heart Foundation',
    type: 'charity_shop',
    location: 'Manchester',
    contact_name: 'Emma',
    phone: '0161 XXX XXXX',
    visit_count: 22,
    total_items_found: 189,
    avg_margin_pct: 224,
    last_visit: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's5',
    name: 'Castlefield Flea Market',
    type: 'flea_market',
    location: 'Castlefield',
    contact_name: 'John',
    phone: '0161 XXX XXXX',
    visit_count: 15,
    total_items_found: 267,
    avg_margin_pct: 167,
    last_visit: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's6',
    name: 'TK Maxx Warehouse',
    type: 'other',
    location: 'Manchester',
    contact_name: 'Lisa',
    phone: '0161 XXX XXXX',
    visit_count: 9,
    total_items_found: 98,
    avg_margin_pct: 189,
    last_visit: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's7',
    name: 'Macclesfield Vintage Fair',
    type: 'flea_market',
    location: 'Macclesfield',
    contact_name: 'Paul',
    phone: '0161 XXX XXXX',
    visit_count: 11,
    total_items_found: 178,
    avg_margin_pct: 175,
    last_visit: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 's8',
    name: 'Independent House Clearance',
    type: 'house_clearance',
    location: 'North Manchester',
    contact_name: 'Robert',
    phone: '0161 XXX XXXX',
    visit_count: 6,
    total_items_found: 104,
    avg_margin_pct: 205,
    last_visit: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

const typeLabel: Record<Supplier['type'], string> = {
  house_clearance: 'House Clearance',
  charity_shop: 'Charity Shop',
  car_boot: 'Car Boot Sale',
  flea_market: 'Flea Market',
  other: 'Other',
}

const typeEmoji: Record<Supplier['type'], string> = {
  house_clearance: '🏠',
  charity_shop: '🏪',
  car_boot: '🚗',
  flea_market: '🎪',
  other: '📍',
}

export default function SuppliersPage() {
  const [search, setSearch] = useState('')

  const filtered = mockSuppliers.filter((supplier) => {
    const matchesSearch =
      !search ||
      supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      supplier.location.toLowerCase().includes(search.toLowerCase()) ||
      supplier.contact_name.toLowerCase().includes(search.toLowerCase())

    return matchesSearch
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}m ago`
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-sage/14 pb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl italic text-ink">suppliers</h1>
        <button className="px-4 py-2 bg-sage text-cream rounded-sm font-medium text-sm hover:bg-sage-dk transition-colors">
          + Add supplier
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search suppliers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-ink-lt outline-none focus:border-sage text-sm w-full max-w-xs"
      />

      {/* Suppliers Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-12 text-ink-lt">
            No suppliers found
          </div>
        ) : (
          filtered.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white border border-sage/14 rounded-md p-5 hover:border-sage/30 transition-all group"
            >
              {/* Type Badge + Name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="text-2xl flex-shrink-0">
                  {typeEmoji[supplier.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-ink text-sm leading-tight">
                    {supplier.name}
                  </h3>
                  <p className="text-xs text-sage-dim mt-0.5">
                    {typeLabel[supplier.type]}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="text-xs text-ink-lt mb-3 pl-9">
                📍 {supplier.location}
              </div>

              {/* Contact Info */}
              <div className="text-xs text-ink-lt mb-4 pl-9 space-y-1">
                <div>
                  👤 <span className="font-medium text-ink">{supplier.contact_name}</span>
                </div>
                <div>
                  ☎️ <span className="text-ink-lt">{supplier.phone}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2 mb-4 pl-9 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-ink-lt">Visits</span>
                  <span className="font-mono font-medium text-ink">
                    {supplier.visit_count}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-lt">Items Found</span>
                  <span className="font-mono font-medium text-ink">
                    {supplier.total_items_found}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-ink-lt">Avg Margin</span>
                  <span className="font-mono font-medium text-sage">
                    {supplier.avg_margin_pct}%
                  </span>
                </div>
              </div>

              {/* Last Visit */}
              <div className="text-xs text-sage-dim border-t border-sage/14 pt-3 pl-9">
                Last visit {formatDate(supplier.last_visit)}
              </div>

              {/* Hidden Action Buttons (show on hover) */}
              <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="flex-1 px-2 py-1.5 text-xs bg-sage/5 text-sage hover:bg-sage/10 rounded transition-colors font-medium">
                  View
                </button>
                <button className="flex-1 px-2 py-1.5 text-xs bg-blue-50 text-blue hover:bg-blue-100 rounded transition-colors font-medium">
                  Contact
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
