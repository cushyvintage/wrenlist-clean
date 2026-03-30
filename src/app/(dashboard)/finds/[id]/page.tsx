'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { Badge } from '@/components/wren/Badge'
import { InsightCard } from '@/components/wren/InsightCard'
import type { Find, Listing } from '@/types'

export default function FindDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [find, setFind] = useState<(Find & { listings: Listing[] }) | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSoldPriceInput, setShowSoldPriceInput] = useState(false)
  const [soldPrice, setSoldPrice] = useState<string>('')

  // Set page title
  useEffect(() => {
    document.title = 'Find Details | Wrenlist'
  }, [])

  // Fetch find on mount
  useEffect(() => {
    const fetchFind = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/finds/${id}`)
        if (!response.ok) throw new Error('Failed to fetch find')
        const result = await response.json()
        setFind(result.data)
      } catch (err) {
        console.error('Error fetching find:', err)
        setError(err instanceof Error ? err.message : 'Failed to load find')
      } finally {
        setIsLoading(false)
      }
    }

    fetchFind()
  }, [id])

  const calculateMargin = (cost: number | null, price: number | null) => {
    if (!cost || !price || price === 0) return null
    return Math.round(((price - cost) / price) * 100)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!find) return

    if (newStatus === 'sold' && find.status !== 'sold') {
      setShowSoldPriceInput(true)
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch(`/api/finds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === 'sold' && soldPrice && { sold_price_gbp: parseFloat(soldPrice) }),
          ...(newStatus === 'sold' && { sold_at: new Date().toISOString() }),
        }),
      })

      if (!response.ok) throw new Error('Failed to update find')
      const result = await response.json()
      setFind(result.data)
      setShowSoldPriceInput(false)
      setSoldPrice('')
    } catch (err) {
      console.error('Error updating find:', err)
      setError(err instanceof Error ? err.message : 'Failed to update find')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-lt">Loading...</p>
      </div>
    )
  }

  if (error || !find) {
    return (
      <div className="space-y-4">
        <div className="bg-red-lt border border-red-dk/20 rounded p-3 text-sm text-red-dk">
          {error || 'Find not found'}
        </div>
        <button
          onClick={() => router.back()}
          className="text-sm text-ink-lt hover:text-ink transition"
        >
          ← go back
        </button>
      </div>
    )
  }

  const margin = calculateMargin(find.cost_gbp, find.asking_price_gbp)

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <a href="/inventory" className="text-sm text-ink-lt hover:text-ink transition">
            ← inventory
          </a>
          <span className="text-border-md">/</span>
          <h1 className="text-lg font-serif text-ink">{find.name}</h1>
          <Badge status={find.status as 'listed' | 'draft' | 'sold' | 'on_hold'} />
        </div>
        <div className="flex gap-3">
          <select
            value={find.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium border border-border rounded hover:bg-cream transition disabled:opacity-50"
          >
            <option value="draft">draft</option>
            <option value="listed">listed</option>
            <option value="on_hold">on hold</option>
            <option value="sold">sold</option>
          </select>
        </div>
      </div>

      {/* Sold price input */}
      {showSoldPriceInput && (
        <div className="bg-amber-lt/30 border border-amber rounded p-4 space-y-3">
          <p className="text-sm text-amber-dk font-medium">Enter sold price to complete sale:</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="0.00"
              value={soldPrice}
              onChange={(e) => setSoldPrice(e.target.value)}
              step="0.01"
              className="flex-1 px-3 py-2 border border-amber rounded text-sm"
            />
            <button
              onClick={() => handleStatusChange('sold')}
              disabled={!soldPrice || isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-amber rounded hover:bg-amber-dk transition disabled:opacity-50"
            >
              confirm
            </button>
            <button
              onClick={() => {
                setShowSoldPriceInput(false)
                setSoldPrice('')
              }}
              className="px-4 py-2 text-sm font-medium text-ink border border-border rounded hover:bg-cream transition"
            >
              cancel
            </button>
          </div>
        </div>
      )}

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
              {find.listings && find.listings.length > 0 ? (
                <>
                  {find.listings.map((listing) => (
                    <div key={listing.id} className="flex justify-between items-center p-3 bg-cream-md rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {listing.platform === 'ebay' ? '🛒' : listing.platform === 'vinted' ? '👚' : '🎨'}
                        </span>
                        <span className="text-sm font-medium text-ink capitalize">{listing.platform}</span>
                      </div>
                      <Badge status={listing.status as 'listed' | 'on_hold'} />
                    </div>
                  ))}
                  <button className="w-full p-3 border border-dashed border-border rounded text-sm text-ink-lt hover:bg-cream-md transition">
                    + list on another platform
                  </button>
                </>
              ) : (
                <p className="text-sm text-ink-lt italic py-4">Not listed on any platforms yet</p>
              )}
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
                <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink">
                  {find.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    category
                  </label>
                  <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink capitalize">
                    {find.category || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    brand
                  </label>
                  <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink">
                    {find.brand || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    size
                  </label>
                  <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink">
                    {find.size || '—'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    condition
                  </label>
                  <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink capitalize">
                    {find.condition || '—'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  description
                </label>
                <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink">
                  {find.description || '—'}
                </div>
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
                  £{find.cost_gbp?.toFixed(2) || '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  {find.status === 'sold' ? 'sold price' : 'asking price'}
                </label>
                <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm font-mono text-ink">
                  £{(find.status === 'sold' ? find.sold_price_gbp : find.asking_price_gbp)?.toFixed(2) || '—'}
                </div>
              </div>
              <div className="p-3 bg-sage-pale rounded text-center">
                <div className="text-xs font-medium text-sage-dim mb-1 uppercase tracking-wide">margin</div>
                <div className="text-2xl font-mono font-semibold text-sage-dk">
                  {margin !== null ? `${margin}%` : '—'}
                </div>
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
                <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink capitalize">
                  {find.source_type?.replace(/_/g, ' ') || '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  source name / location
                </label>
                <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink">
                  {find.source_name || '—'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                  sourced date
                </label>
                <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink">
                  {find.sourced_at ? new Date(find.sourced_at).toLocaleDateString('en-GB') : '—'}
                </div>
              </div>
              {find.status === 'sold' && find.sold_at && (
                <div>
                  <label className="block text-xs font-medium text-ink-lt mb-2 uppercase tracking-wide">
                    sold date
                  </label>
                  <div className="px-4 py-2 bg-cream-md border border-border rounded text-sm text-ink">
                    {new Date(find.sold_at).toLocaleDateString('en-GB')}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* Insight */}
          <InsightCard
            text="Carhartt Detroit jackets in brown are moving fast on eBay right now — average sell time 8 days, avg price £138. Your asking price of £145 is positioned well. Consider crosslisting to Depop for the younger buyer segment."
          />
        </div>
      </div>
    </div>
  )
}
