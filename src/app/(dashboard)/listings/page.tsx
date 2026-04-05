'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
/* eslint-disable @next/next/no-img-element */
import { Badge } from '@/components/wren/Badge'
import { PlatformTag } from '@/components/wren/PlatformTag'
import type { ProductMarketplaceData, Platform } from '@/types'

type FilterType = 'all' | 'listed' | 'sold' | 'delisted'
type SortOption = 'newest' | 'oldest' | 'price_high' | 'price_low' | 'days_listed'

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

/** A find grouped with all its marketplace listings */
interface GroupedListing {
  find_id: string
  find: ListingWithFind['finds']
  created_at: string
  marketplaces: {
    marketplace: Platform
    status: string
    listing_price: number | null
    platform_listing_url: string | null
    fields: Record<string, string> | null
    id: string
  }[]
}

function daysAgo(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function ListingsPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [marketplaceFilter, setMarketplaceFilter] = useState<Platform | 'all'>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
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

  // Group listings by find_id
  const grouped: GroupedListing[] = (() => {
    const map = new Map<string, GroupedListing>()
    for (const listing of listings) {
      const existing = map.get(listing.find_id)
      const mp = {
        marketplace: listing.marketplace as Platform,
        status: listing.status,
        listing_price: listing.listing_price,
        platform_listing_url: listing.platform_listing_url,
        fields: (listing.fields as Record<string, string> | null) ?? null,
        id: listing.id,
      }
      if (existing) {
        existing.marketplaces.push(mp)
      } else {
        map.set(listing.find_id, {
          find_id: listing.find_id,
          find: listing.finds,
          created_at: listing.created_at,
          marketplaces: [mp],
        })
      }
    }
    return Array.from(map.values())
  })()

  // Filter grouped listings
  const filtered = grouped.filter((group) => {
    const matchesFilter =
      filter === 'all' ||
      group.marketplaces.some((mp) => mp.status === filter)

    const matchesMarketplace =
      marketplaceFilter === 'all' ||
      group.marketplaces.some((mp) => mp.marketplace === marketplaceFilter)

    const matchesSearch =
      !search ||
      group.find?.name.toLowerCase().includes(search.toLowerCase()) ||
      (group.find?.brand && group.find.brand.toLowerCase().includes(search.toLowerCase()))

    return matchesFilter && matchesMarketplace && matchesSearch
  }).sort((a, b) => {
    const priceA = a.marketplaces[0]?.listing_price ?? a.find?.asking_price_gbp ?? 0
    const priceB = b.marketplaces[0]?.listing_price ?? b.find?.asking_price_gbp ?? 0
    switch (sortBy) {
      case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'price_high': return priceB - priceA
      case 'price_low': return priceA - priceB
      case 'days_listed': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  // Counts for filter pills
  const counts = {
    all: grouped.length,
    listed: grouped.filter((g) => g.marketplaces.some((mp) => mp.status === 'listed')).length,
    sold: grouped.filter((g) => g.marketplaces.some((mp) => mp.status === 'sold')).length,
    delisted: grouped.filter((g) => g.marketplaces.some((mp) => mp.status === 'delisted')).length,
  }

  // Active marketplaces for filter
  const activeMarketplaces = Array.from(new Set(listings.map((l) => l.marketplace as Platform)))

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
    else setSelectedItems(new Set(filtered.map((g) => g.find_id)))
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

  const getCategoryLabel = (category?: string) => {
    const labelMap: Record<string, string> = {
      ceramics: 'CR', glassware: 'GL', books: 'BK', jewellery: 'JW',
      clothing: 'CL', homeware: 'HW', furniture: 'FR', toys: 'TY',
      workwear: 'WK', footwear: 'FT', denim: 'DN', bags: 'BG',
      accessories: 'AC', other: '—',
    }
    return labelMap[category || 'other'] || '—'
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
              {f === 'all' ? 'all' : f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* Search + Marketplace Filter + Sort */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search listings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-ink-lt outline-none focus:border-sage text-sm w-full max-w-xs"
        />

        {activeMarketplaces.length > 1 && (
          <select
            value={marketplaceFilter}
            onChange={(e) => setMarketplaceFilter(e.target.value as Platform | 'all')}
            className="px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-ink-lt outline-none focus:border-sage text-sm"
          >
            <option value="all">all platforms</option>
            {activeMarketplaces.map((mp) => (
              <option key={mp} value={mp}>
                {mp === 'ebay' ? 'eBay' : mp.charAt(0).toUpperCase() + mp.slice(1)}
              </option>
            ))}
          </select>
        )}

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-ink-lt outline-none focus:border-sage text-sm"
        >
          <option value="newest">newest first</option>
          <option value="oldest">oldest first</option>
          <option value="price_high">price: high → low</option>
          <option value="price_low">price: low → high</option>
          <option value="days_listed">longest listed</option>
        </select>
      </div>

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
              {(['ebay', 'vinted', 'etsy', 'shopify'] as Platform[]).map((platform) => (
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
          filtered.map((group) => {
            // Determine best status for badge (listed > sold > delisted > draft)
            const hasListed = group.marketplaces.some((mp) => mp.status === 'listed')
            const hasSold = group.marketplaces.some((mp) => mp.status === 'sold')
            const overallStatus = hasListed ? 'listed' : hasSold ? 'sold' : group.marketplaces[0]?.status || 'draft'

            // Check if prices differ across marketplaces
            const prices = group.marketplaces
              .map((mp) => mp.listing_price)
              .filter((p): p is number => p !== null)
            const allSamePrice = prices.length <= 1 || prices.every((p) => p === prices[0])
            const displayPrice = prices[0] ?? group.find?.asking_price_gbp

            return (
              <div
                key={group.find_id}
                className="bg-white border border-sage/14 rounded-md p-4 grid grid-cols-[auto_60px_1fr_auto] gap-4 items-start hover:bg-cream transition-colors"
              >
                {/* Checkbox */}
                <div className="flex items-center pt-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(group.find_id)}
                    onChange={() => toggleItemSelection(group.find_id)}
                    className="cursor-pointer"
                  />
                </div>

                {/* Thumbnail */}
                <div className="w-16 h-16 bg-cream-md rounded-sm flex items-center justify-center text-xs font-medium tracking-wide flex-shrink-0 overflow-hidden" style={{ color: '#6B7D6A' }}>
                  {group.find?.photos?.[0] ? (
                    <img
                      src={group.find.photos[0]}
                      alt={group.find.name || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getCategoryLabel(group.find?.category || undefined)
                  )}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="font-medium text-ink text-sm">
                    {group.find?.name}
                  </div>
                  <div className="text-xs text-ink-lt mt-1">
                    {group.find?.category}
                  </div>

                  {/* Platform Tags — one per marketplace */}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {group.marketplaces.map((mp) => (
                      <PlatformTag
                        key={mp.id}
                        platform={mp.marketplace}
                        live={mp.status === 'listed'}
                        href={mp.platform_listing_url}
                        collection={mp.fields?.collection_name}
                      />
                    ))}
                  </div>

                  {/* Per-platform prices when they differ */}
                  {!allSamePrice && (
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {group.marketplaces
                        .filter((mp) => mp.listing_price !== null)
                        .map((mp) => (
                          <span key={mp.id} className="text-[11px] text-ink-lt">
                            {mp.marketplace === 'ebay' ? 'eBay' : mp.marketplace.charAt(0).toUpperCase() + mp.marketplace.slice(1)}: £{mp.listing_price!.toFixed(2)}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                {/* Price + Meta (Right side) */}
                <div className="text-right flex flex-col gap-1.5 items-end">
                  <div className="font-serif font-medium text-ink text-xl">
                    {displayPrice != null ? `£${displayPrice.toFixed(2)}` : '—'}
                  </div>

                  {/* Profit margin */}
                  {displayPrice != null && group.find?.cost_gbp != null && group.find.cost_gbp > 0 && (
                    <span className="text-[11px] text-sage font-medium">
                      +£{(displayPrice - group.find.cost_gbp).toFixed(2)} profit
                    </span>
                  )}

                  {/* Status Badge */}
                  <Badge status={getStatusBadgeType(overallStatus) as any} />

                  {/* Days listed */}
                  {hasListed && (
                    <span className={`text-[11px] ${daysAgo(group.created_at) > 30 ? 'text-red' : 'text-ink-lt'}`}>
                      {daysAgo(group.created_at)}d listed
                    </span>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-1 flex-wrap justify-end">
                    {hasListed && (
                      <Link
                        href={`/finds/${group.find_id}`}
                        className="px-2 py-1 text-xs bg-transparent border border-sage/22 text-ink-lt hover:bg-cream-md rounded transition-colors font-medium"
                      >
                        edit
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
