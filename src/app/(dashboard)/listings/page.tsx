'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/wren/Badge'
import { PlatformTag } from '@/components/wren/PlatformTag'
import type { ProductMarketplaceData, Platform } from '@/types'

type FilterType = 'all' | 'listed' | 'sold' | 'delisted'

interface ListingWithFind extends ProductMarketplaceData {
  finds: {
    id: string
    name: string
    photos: string[]
    cost_gbp: number | null
    asking_price_gbp: number | null
    category: string | null
    brand: string | null
    condition: string | null
  }
}

export default function ListingsPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState<ListingWithFind[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [showCrosslistModal, setShowCrosslistModal] = useState(false)
  const [crosslistTargets, setCrosslistTargets] = useState<Platform[]>([])
  const [isCrosslisting, setIsCrosslisting] = useState(false)
  const [crosslistError, setCrosslistError] = useState<string | null>(null)
  const [crosslistProgress, setCrosslistProgress] = useState<string | null>(null)

  // Set page title
  useEffect(() => {
    document.title = 'Listings | Wrenlist'
  }, [])

  // Load listings from API
  useEffect(() => {
    const loadListings = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/listings')
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load listings')
        }

        // Handle ApiResponseHelper envelope: result.data || result
        const data = result.data || result
        setListings(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load listings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load listings')
      } finally {
        setIsLoading(false)
      }
    }

    loadListings()
  }, [])

  // Filter listings
  const filtered = listings.filter((listing) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'listed' && listing.status === 'listed') ||
      (filter === 'sold' && listing.status === 'sold') ||
      (filter === 'delisted' && listing.status === 'delisted')

    const matchesSearch =
      !search ||
      listing.finds?.name.toLowerCase().includes(search.toLowerCase()) ||
      (listing.finds?.brand && listing.finds.brand.toLowerCase().includes(search.toLowerCase()))

    return matchesFilter && matchesSearch
  })

  const getStatusBadgeType = (status: string) => {
    if (status === 'listed') return 'listed'
    if (status === 'sold') return 'sold'
    if (status === 'delisted') return 'draft'
    if (status === 'error') return 'on_hold'
    return 'on_hold'
  }

  const toggleItemSelection = (id: string) => {
    const next = new Set(selectedItems)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedItems(next)
  }

  const toggleAllSelection = () => {
    if (selectedItems.size === filtered.length) setSelectedItems(new Set())
    else setSelectedItems(new Set(filtered.map((l) => l.find_id)))
  }

  const handleBulkCrosslist = async () => {
    const findIds = Array.from(selectedItems)
    if (findIds.length === 0 || crosslistTargets.length === 0) return

    setIsCrosslisting(true)
    setCrosslistError(null)
    let succeeded = 0
    let failed = 0

    for (let i = 0; i < findIds.length; i++) {
      setCrosslistProgress(`Publishing ${i + 1} of ${findIds.length}...`)
      try {
        const res = await fetch('/api/crosslist/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ findId: findIds[i], marketplaces: crosslistTargets }),
        })
        const data = await res.json()
        const results = data.data?.results || {}
        const anyOk = (Object.values(results) as Array<{ ok: boolean }>).some((r) => r.ok)
        if (anyOk) succeeded++
        else failed++
      } catch {
        failed++
      }
    }

    setCrosslistProgress(null)
    setIsCrosslisting(false)

    if (failed === 0) {
      setSelectedItems(new Set())
      setShowCrosslistModal(false)
      setCrosslistTargets([])
    } else {
      setCrosslistError(`${succeeded} published, ${failed} failed`)
    }
  }

  const getCategoryEmoji = (category?: string) => {
    const emojiMap: Record<string, string> = {
      ceramics: '🏺',
      glassware: '🥃',
      books: '📚',
      jewellery: '💎',
      clothing: '👕',
      homeware: '🏠',
      furniture: '🪑',
      toys: '🧸',
      other: '📦',
    }
    return emojiMap[category || 'other'] || '📦'
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-sage/14 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-2xl italic text-ink">listings</h1>
            <p className="text-[13px] mt-1" style={{ color: '#8A9E88' }}>
              Where your items are listed — every platform listing across Vinted, eBay, and more. Crosslist items to new platforms from here.
            </p>
          </div>
          <Link
            href="/add-find"
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition"
          >
            + new listing
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'listed', 'sold', 'delisted'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                filter === f
                  ? 'bg-sage-pale border border-sage text-sage'
                  : 'bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream'
              }`}
            >
              {f === 'all' ? 'all listings' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search listings..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-ink-lt outline-none focus:border-sage text-sm w-full max-w-xs"
      />

      {/* Crosslist error */}
      {crosslistError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {crosslistError}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedItems.size > 0 && (
        <div
          className="flex items-center justify-between p-4 rounded sticky bottom-0 z-10"
          style={{ backgroundColor: '#D4E2D2', borderWidth: '1px', borderColor: '#3D5C3A' }}
        >
          <span className="text-sm font-medium" style={{ color: '#1E2E1C' }}>
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCrosslistModal(true)}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2C4428')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3D5C3A')}
            >
              Crosslist
            </button>
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{ backgroundColor: 'transparent', borderWidth: '1px', borderColor: '#3D5C3A', color: '#3D5C3A' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(61,92,58,.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Crosslist modal */}
      {showCrosslistModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => { setShowCrosslistModal(false); setCrosslistTargets([]) }}
        >
          <div
            className="bg-white rounded p-6 max-w-sm"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1E2E1C' }}>
              Crosslist {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}
            </h3>
            <p className="text-sm mb-4" style={{ color: '#6B7D6A' }}>
              Select marketplaces to publish to:
            </p>
            <div className="space-y-2 mb-4">
              {(['ebay', 'vinted', 'shopify'] as Platform[]).map((platform) => (
                <label key={platform} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={crosslistTargets.includes(platform)}
                    onChange={() =>
                      setCrosslistTargets((prev) =>
                        prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
                      )
                    }
                    className="rounded"
                  />
                  <span className="text-sm font-medium capitalize" style={{ color: '#1E2E1C' }}>
                    {platform}
                  </span>
                </label>
              ))}
            </div>
            {crosslistProgress && (
              <p className="text-xs mb-3" style={{ color: '#8A9E88' }}>{crosslistProgress}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowCrosslistModal(false); setCrosslistTargets([]) }}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{ backgroundColor: 'transparent', borderWidth: '1px', borderColor: 'rgba(61,92,58,.22)', color: '#3D5C3A' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(61,92,58,.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkCrosslist}
                disabled={isCrosslisting || crosslistTargets.length === 0}
                className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
                onMouseEnter={(e) => !isCrosslisting && (e.currentTarget.style.backgroundColor = '#2C4428')}
                onMouseLeave={(e) => !isCrosslisting && (e.currentTarget.style.backgroundColor = '#3D5C3A')}
              >
                {isCrosslisting ? 'Publishing...' : `Publish to ${crosslistTargets.length} platform${crosslistTargets.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listings Grid */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-ink-lt">loading listings...</div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red mb-4">{error}</div>
            <Link
              href="/finds"
              className="text-sm font-medium text-sage hover:text-sage-dk"
            >
              add your first listing →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-sage/14 rounded-lg">
            {listings.length === 0 ? (
              <div className="text-center py-12 px-6">
                <p className="text-2xl mb-2">📋</p>
                <p className="text-sage-dim text-sm mb-4">No listings yet</p>
                <p className="text-xs text-ink-lt mb-6">Items you publish to Vinted and eBay appear here</p>
                <Link
                  href="/finds"
                  className="inline-block px-4 py-2 bg-sage text-cream rounded text-sm font-medium hover:bg-sage-lt transition-colors"
                >
                  Create your first listing
                </Link>
              </div>
            ) : (
              <div className="text-center py-12 text-sage-dim">
                No listings match your filters
              </div>
            )}
          </div>
        ) : (
          filtered.map((listing) => (
            <div
              key={listing.id}
              className="bg-white border border-sage/14 rounded-md p-4 grid grid-cols-[auto_60px_1fr_auto] gap-4 items-start hover:bg-cream transition-colors"
            >
              {/* Checkbox */}
              <div className="flex items-center pt-4">
                <input
                  type="checkbox"
                  checked={selectedItems.has(listing.find_id)}
                  onChange={() => toggleItemSelection(listing.find_id)}
                  className="cursor-pointer"
                />
              </div>

              {/* Thumbnail + Category Emoji */}
              <div className="w-16 h-16 bg-cream-md rounded-sm flex items-center justify-center text-2xl flex-shrink-0">
                {getCategoryEmoji(listing.finds?.category || undefined)}
              </div>

              {/* Details */}
              <div className="flex-1">
                <div className="font-medium text-ink text-sm">
                  {listing.finds?.name}
                </div>
                <div className="text-xs text-ink-lt mt-1">
                  {listing.finds?.category}
                </div>

                {/* Platform Tags */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  <PlatformTag
                    platform={listing.marketplace as any}
                    live={listing.status === 'listed'}
                  />
                </div>
              </div>

              {/* Price (Right side) */}
              <div className="text-right flex flex-col gap-2 items-end">
                <div className="font-serif font-medium text-ink text-xl">
                  £{listing.listing_price?.toFixed(2) || listing.finds?.asking_price_gbp?.toFixed(2) || '—'}
                </div>

                {/* Status Badge */}
                <Badge status={getStatusBadgeType(listing.status) as any} />

                {/* Action Buttons */}
                <div className="flex gap-2 mt-2">
                  {listing.platform_listing_url && (
                    <Link
                      href={listing.platform_listing_url}
                      target="_blank"
                      className="px-2 py-1 text-xs bg-transparent border border-sage/22 text-ink-lt hover:bg-cream-md rounded transition-colors font-medium"
                    >
                      view
                    </Link>
                  )}
                  {listing.status === 'listed' && (
                    <button className="px-2 py-1 text-xs bg-transparent border border-sage/22 text-ink-lt hover:bg-cream-md rounded transition-colors font-medium">
                      edit
                    </button>
                  )}
                  {listing.status === 'sold' ? (
                    <Link
                      href={`/listings/create?findId=${listing.find_id}`}
                      className="px-2 py-1 text-xs bg-transparent border border-sage/22 text-ink-lt hover:bg-cream-md rounded transition-colors font-medium"
                    >
                      relist
                    </Link>
                  ) : listing.status !== 'delisted' ? (
                    <button className="px-2 py-1 text-xs bg-transparent border border-red/22 text-red hover:bg-red-50 rounded transition-colors font-medium">
                      delist
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
