'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { Badge } from '@/components/wren/Badge'
import { PlatformTag } from '@/components/wren/PlatformTag'
import type { Find } from '@/types'

// Fallback mock data for when API is unavailable
const mockFinds: Find[] = [
  {
    id: '1',
    user_id: 'user_1',
    name: 'Carhartt Detroit jacket',
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
    name: 'New Balance 990v3',
    category: 'footwear',
    brand: 'New Balance',
    size: '10.5',
    colour: 'grey',
    condition: 'excellent',
    description: 'Vintage running shoes',
    cost_gbp: 8,
    asking_price_gbp: 210,
    source_type: 'charity_shop',
    source_name: 'Salvation Army',
    sourced_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'on_hold',
    sold_price_gbp: null,
    sold_at: null,
    photos: [],
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    user_id: 'user_1',
    name: "Levi's 501",
    category: 'denim',
    brand: "Levi's",
    size: '32x30',
    colour: 'black',
    condition: 'good',
    description: 'Classic 501 jeans',
    cost_gbp: 4,
    asking_price_gbp: 68,
    source_type: 'charity_shop',
    source_name: 'charity shop',
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
    id: '4',
    user_id: 'user_1',
    name: 'Coach legacy duffle',
    category: 'bags',
    brand: 'Coach',
    size: 'one size',
    colour: 'tan',
    condition: 'excellent',
    description: 'Vintage leather duffle bag',
    cost_gbp: 22,
    asking_price_gbp: null,
    source_type: 'other',
    source_name: 'haul #34',
    sourced_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'draft',
    sold_price_gbp: null,
    sold_at: null,
    photos: [],
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    user_id: 'user_1',
    name: 'Ray-Ban Clubmaster',
    category: 'accessories',
    brand: 'Ray-Ban',
    size: 'one size',
    colour: 'tortoise',
    condition: 'excellent',
    description: 'Classic Clubmaster style sunglasses',
    cost_gbp: 3,
    asking_price_gbp: 55,
    source_type: 'online_haul',
    source_name: 'online haul',
    sourced_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'listed',
    sold_price_gbp: null,
    sold_at: null,
    photos: [],
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    user_id: 'user_1',
    name: 'Pendleton wool shirt',
    category: 'tops',
    brand: 'Pendleton',
    size: 'L',
    colour: 'plaid',
    condition: 'excellent',
    description: 'Vintage wool shirt in plaid pattern',
    cost_gbp: 6,
    asking_price_gbp: 89,
    source_type: 'flea_market',
    source_name: 'flea market',
    sourced_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'sold',
    sold_price_gbp: 85,
    sold_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    photos: [],
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '7',
    user_id: 'user_1',
    name: 'Laura Ashley floral dress',
    category: 'womenswear',
    brand: 'Laura Ashley',
    size: '12',
    colour: 'floral',
    condition: 'excellent',
    description: 'Vintage floral dress',
    cost_gbp: 2,
    asking_price_gbp: 38,
    source_type: 'car_boot',
    source_name: 'car boot',
    sourced_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'listed',
    sold_price_gbp: null,
    sold_at: null,
    photos: [],
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// Emoji mapping for categories
const categoryEmojis: Record<string, string> = {
  workwear: '🧥',
  footwear: '👟',
  denim: '👖',
  bags: '👜',
  accessories: '🕶',
  tops: '🪮',
  womenswear: '👗',
  default: '📦',
}

type StatusFilter = 'all' | 'listed' | 'draft' | 'on_hold' | 'sold'

export default function InventoryPage() {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [finds, setFinds] = useState<Find[]>(mockFinds)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Set page title on mount
   */
  useEffect(() => {
    document.title = 'Inventory | Wrenlist'
  }, [])

  /**
   * Fetch finds from API on mount
   */
  useEffect(() => {
    async function fetchFinds() {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/finds')
        if (!response.ok) {
          throw new Error('Failed to fetch finds')
        }
        const result = await response.json()
        setFinds((result.data?.data || result.data || []) as Find[])
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        console.error('Error fetching finds:', err)
        // Fall back to mock data
        setFinds(mockFinds)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFinds()
  }, [])

  // Filter finds by status and search
  const filteredFinds = finds.filter((find) => {
    const statusMatch = selectedStatus === 'all' || find.status === selectedStatus
    const searchMatch =
      searchQuery === '' ||
      find.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (find.category && find.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (find.source_name && find.source_name.toLowerCase().includes(searchQuery.toLowerCase()))
    return statusMatch && searchMatch
  })

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  const toggleAllSelection = () => {
    if (selectedItems.size === filteredFinds.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filteredFinds.map((f) => f.id)))
    }
  }

  const calculateMargin = (cost: number | null, asking: number | null) => {
    if (!cost || !asking || asking === 0) return null
    return Math.round(((asking - cost) / asking) * 100)
  }

  const getEmoji = (category: string | null) => (category && categoryEmojis[category]) || categoryEmojis.default

  return (
    <div className="space-y-6">
      {/* Page title is in topbar - no need to repeat */}

      {/* Error state */}
      {error && (
        <div className="bg-amber/10 border border-amber/30 rounded p-3 text-sm text-amber">
          {error}
        </div>
      )}

      {/* Controls row */}
      <div
        className="flex flex-wrap items-center gap-3 pb-4"
        style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}
      >
        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'listed', 'draft', 'on_hold', 'sold'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className="px-[10px] py-[3px] text-[11px] font-medium transition-colors capitalize whitespace-nowrap rounded-[20px]"
              style={
                selectedStatus === status
                  ? { backgroundColor: '#D4E2D2', borderColor: '#3D5C3A', borderWidth: '1px', color: '#3D5C3A' }
                  : {
                      backgroundColor: 'transparent',
                      borderColor: 'rgba(61,92,58,.22)',
                      borderWidth: '1px',
                      color: '#6B7D6A',
                    }
              }
            >
              {status === 'on_hold' ? 'on hold' : status}
            </button>
          ))}
        </div>

        {/* Search input */}
        <input
          type="text"
          placeholder="search inventory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-[14px] py-[7px] text-[13px] rounded bg-[#EDE8DE] text-[#1E2E1C]"
          style={{
            borderWidth: '1px',
            borderColor: 'rgba(61,92,58,.22)',
            outline: 'none',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
        />

        {/* Action buttons */}
        <div className="flex gap-2 whitespace-nowrap">
          <button
            className="px-[18px] py-[7px] text-[13px] font-medium rounded transition-colors"
            style={{
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.22)',
              backgroundColor: 'transparent',
              color: '#6B7D6A',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE8DE')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            select
          </button>
          <button
            onClick={() => router.push('/app/add-find')}
            className="px-[18px] py-[7px] text-[13px] font-medium rounded transition-colors"
            style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2C4428')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3D5C3A')}
          >
            + add find
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center text-ink-lt py-8">
          Loading inventory...
        </div>
      )}

      {/* Inventory table */}
      {!isLoading && (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead style={{ color: '#8A9E88' }}>
              <tr style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}>
                <th className="text-left py-[10px] px-[18px] w-8">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === filteredFinds.length && filteredFinds.length > 0}
                    onChange={toggleAllSelection}
                    className="cursor-pointer"
                  />
                </th>
                <th className="text-left py-[10px] px-[18px] min-w-[240px] text-[10px] uppercase tracking-[.08em] font-medium">item</th>
                <th className="text-left py-[10px] px-[18px] min-w-[140px] text-[10px] uppercase tracking-[.08em] font-medium">source</th>
                <th className="text-right py-[10px] px-[18px] w-16 text-[10px] uppercase tracking-[.08em] font-medium">cost</th>
                <th className="text-right py-[10px] px-[18px] w-16 text-[10px] uppercase tracking-[.08em] font-medium">asking</th>
                <th className="text-right py-[10px] px-[18px] w-20 text-[10px] uppercase tracking-[.08em] font-medium">margin</th>
                <th className="text-left py-[10px] px-[18px] min-w-[140px] text-[10px] uppercase tracking-[.08em] font-medium">platform</th>
                <th className="text-left py-[10px] px-[18px] min-w-[120px] text-[10px] uppercase tracking-[.08em] font-medium">status</th>
              </tr>
            </thead>
            <tbody>
            {filteredFinds.map((find) => {
              const margin = calculateMargin(find.cost_gbp, find.asking_price_gbp)
              return (
                <tr
                  key={find.id}
                  onClick={() => router.push(`/app/inventory/${find.id}`)}
                  className="cursor-pointer transition-colors"
                  style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F0E8')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="py-[12px] px-[18px]">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(find.id)}
                      onChange={() => toggleItemSelection(find.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="py-[12px] px-[18px]">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getEmoji(find.category)}</span>
                      <div className="flex-1">
                        <div className="font-medium text-[13px]" style={{ color: '#1E2E1C' }}>
                          {find.name}
                        </div>
                        <div className="text-[11px] capitalize" style={{ color: '#6B7D6A' }}>
                          {find.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-[12px] px-[18px] text-[11px]" style={{ color: '#6B7D6A' }}>
                    {find.source_name}
                  </td>
                  <td className="py-[12px] px-[18px] font-mono text-[12px]" style={{ color: '#4A5E48' }}>
                    £{find.cost_gbp}
                  </td>
                  <td className="py-[12px] px-[18px] font-mono text-[12px] text-right" style={{ color: '#1E2E1C' }}>
                    {find.asking_price_gbp ? `£${find.asking_price_gbp}` : '—'}
                  </td>
                  <td className="py-[12px] px-[18px] font-mono text-[12px] text-right" style={{ color: '#1E2E1C' }}>
                    {margin !== null ? `${margin}%` : '—'}
                  </td>
                  <td className="py-[12px] px-[18px]">
                    {find.status === 'draft' ? (
                      <span className="text-[11px] italic" style={{ color: '#6B7D6A' }}>
                        none yet
                      </span>
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        <PlatformTag platform="vinted" live={true} />
                        {find.id !== '2' && find.id !== '5' && (
                          <PlatformTag platform="ebay" live={true} />
                        )}
                      </div>
                    )}
                  </td>
                  <td className="py-[12px] px-[18px]">
                    {find.status === 'draft' ? (
                      <div className="flex flex-col gap-2">
                        <Badge status="draft" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push('/app/add-find')
                          }}
                          className="text-[11px] underline underline-offset-2 transition-colors text-left"
                          style={{ color: '#5A7A57' }}
                        >
                          complete & list →
                        </button>
                      </div>
                    ) : (
                      <Badge status={find.status as 'listed' | 'on_hold' | 'sold'} />
                    )}
                  </td>
                </tr>
              )
            })}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Empty state */}
      {!isLoading && filteredFinds.length === 0 && finds.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-ink-lt mb-4">No items in your inventory yet</p>
          <button
            onClick={() => router.push('/app/add-find')}
            className="text-sm text-sage underline underline-offset-2 hover:text-sage-dk transition"
          >
            Add your first find →
          </button>
        </div>
      )}

      {/* No search results state */}
      {!isLoading && filteredFinds.length === 0 && finds.length > 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-ink-lt">No items found matching your search</p>
        </div>
      )}
    </div>
  )
}
