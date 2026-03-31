'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/wren/Badge'
import { PlatformTag } from '@/components/wren/PlatformTag'
import type { Find, Listing } from '@/types'
import { getAllListings } from '@/services/listing.service'

// Mock data for listings
const mockListings: (Listing & { find?: Find })[] = [
  {
    id: 'l1',
    find_id: 'f1',
    user_id: 'user_1',
    platform: 'vinted',
    platform_listing_id: 'v123',
    status: 'live',
    listed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    delisted_at: null,
    views: 87,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    find: {
      id: 'f1',
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
      sku: null,
      platform_fields: {},
      ai_generated_description: null,
      ai_suggested_price_low: null,
      ai_suggested_price_high: null,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'l2',
    find_id: 'f2',
    user_id: 'user_1',
    platform: 'ebay',
    platform_listing_id: 'eb456',
    status: 'live',
    listed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    delisted_at: null,
    views: 156,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    find: {
      id: 'f2',
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
      sku: null,
      platform_fields: {},
      ai_generated_description: null,
      ai_suggested_price_low: null,
      ai_suggested_price_high: null,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'l3',
    find_id: 'f3',
    user_id: 'user_1',
    platform: 'vinted',
    platform_listing_id: 'v789',
    status: 'live',
    listed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    delisted_at: null,
    views: 42,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    find: {
      id: 'f3',
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
      status: 'listed',
      sold_price_gbp: null,
      sold_at: null,
      photos: [],
      sku: null,
      platform_fields: {},
      ai_generated_description: null,
      ai_suggested_price_low: null,
      ai_suggested_price_high: null,
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'l4',
    find_id: 'f4',
    user_id: 'user_1',
    platform: 'etsy',
    platform_listing_id: 'et321',
    status: 'live',
    listed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    delisted_at: null,
    views: 23,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    find: {
      id: 'f4',
      user_id: 'user_1',
      name: 'Vintage Leather Belt',
      category: 'accessories',
      brand: 'Unknown',
      size: '36',
      colour: 'brown',
      condition: 'excellent',
      description: 'High quality leather belt',
      cost_gbp: 5,
      asking_price_gbp: 32,
      source_type: 'house_clearance',
      source_name: 'house clearance',
      sourced_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'listed',
      sold_price_gbp: null,
      sold_at: null,
      photos: [],
      sku: null,
      platform_fields: {},
      ai_generated_description: null,
      ai_suggested_price_low: null,
      ai_suggested_price_high: null,
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'l5',
    find_id: 'f5',
    user_id: 'user_1',
    platform: 'ebay',
    platform_listing_id: 'eb654',
    status: 'sold',
    listed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    delisted_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    views: 234,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    find: {
      id: 'f5',
      user_id: 'user_1',
      name: 'Adidas Tracksuit',
      category: 'workwear',
      brand: 'Adidas',
      size: 'M',
      colour: 'navy',
      condition: 'good',
      description: 'Vintage Adidas tracksuit',
      cost_gbp: 18,
      asking_price_gbp: 75,
      source_type: 'car_boot',
      source_name: 'car boot sale',
      sourced_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'sold',
      sold_price_gbp: 72,
      sold_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      photos: [],
      sku: null,
      platform_fields: {},
      ai_generated_description: null,
      ai_suggested_price_low: null,
      ai_suggested_price_high: null,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'l6',
    find_id: 'f6',
    user_id: 'user_1',
    platform: 'vinted',
    platform_listing_id: 'v555',
    status: 'live',
    listed_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    delisted_at: null,
    views: 67,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    find: {
      id: 'f6',
      user_id: 'user_1',
      name: 'Ralph Lauren Polo',
      category: 'tops',
      brand: 'Ralph Lauren',
      size: 'L',
      colour: 'navy',
      condition: 'excellent',
      description: 'Classic polo shirt',
      cost_gbp: 6,
      asking_price_gbp: 28,
      source_type: 'charity_shop',
      source_name: 'Charity shop',
      sourced_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'listed',
      sold_price_gbp: null,
      sold_at: null,
      photos: [],
      sku: null,
      platform_fields: {},
      ai_generated_description: null,
      ai_suggested_price_low: null,
      ai_suggested_price_high: null,
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'l7',
    find_id: 'f7',
    user_id: 'user_1',
    platform: 'etsy',
    platform_listing_id: 'et987',
    status: 'live',
    listed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    delisted_at: null,
    views: 112,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    find: {
      id: 'f7',
      user_id: 'user_1',
      name: 'Vintage Watch',
      category: 'accessories',
      brand: 'Seiko',
      size: 'One size',
      colour: 'silver',
      condition: 'good',
      description: 'Vintage Seiko watch',
      cost_gbp: 22,
      asking_price_gbp: 110,
      source_type: 'flea_market',
      source_name: 'flea market',
      sourced_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'listed',
      sold_price_gbp: null,
      sold_at: null,
      photos: [],
      sku: null,
      platform_fields: {},
      ai_generated_description: null,
      ai_suggested_price_low: null,
      ai_suggested_price_high: null,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 'l8',
    find_id: 'f8',
    user_id: 'user_1',
    platform: 'vinted',
    platform_listing_id: 'v999',
    status: 'delisted',
    listed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    delisted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    views: 0,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    find: {
      id: 'f8',
      user_id: 'user_1',
      name: 'Wool Coat',
      category: 'outerwear',
      brand: 'Burberry',
      size: 'M',
      colour: 'camel',
      condition: 'fair',
      description: 'Wool coat',
      cost_gbp: 45,
      asking_price_gbp: 180,
      source_type: 'house_clearance',
      source_name: 'house clearance',
      sourced_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'draft',
      sold_price_gbp: null,
      sold_at: null,
      photos: [],
      sku: null,
      platform_fields: {},
      ai_generated_description: null,
      ai_suggested_price_low: null,
      ai_suggested_price_high: null,
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
]

type FilterType = 'all' | 'live' | 'hold' | 'sold' | 'delisted'

export default function ListingsPage() {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [listings, setListings] = useState(mockListings)
  const [isLoading, setIsLoading] = useState(true)

  // Set page title
  useEffect(() => {
    document.title = 'Listings | Wrenlist'
  }, [])

  // Load listings on mount
  useEffect(() => {
    const loadListings = async () => {
      try {
        // In production, get userId from auth context
        const userId = 'user_1'
        const data = await getAllListings(userId)
        if (data.length > 0) {
          setListings(data as any)
        }
      } catch (error) {
        console.error('Failed to load listings:', error)
        // Keep mock data on error
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
      (filter === 'live' && listing.status === 'live') ||
      (filter === 'sold' && listing.status === 'sold') ||
      (filter === 'delisted' && listing.status === 'delisted') ||
      (filter === 'hold' && listing.status === 'draft')

    const matchesSearch =
      !search ||
      listing.find?.name.toLowerCase().includes(search.toLowerCase()) ||
      listing.find?.brand?.toLowerCase().includes(search.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const getStatusBadgeType = (status: string) => {
    if (status === 'live') return 'listed'
    if (status === 'sold') return 'sold'
    if (status === 'delisted') return 'draft'
    return 'on_hold'
  }

  const getCategoryEmoji = (category?: string) => {
    const emojiMap: Record<string, string> = {
      footwear: '👟',
      denim: '👖',
      workwear: '🧥',
      accessories: '🕶️',
      tops: '👕',
      outerwear: '🧥',
      bags: '👜',
      womenswear: '👗',
      menswear: '🕴️',
      knitwear: '🧶',
      vintage: '⏰',
      other: '📦',
    }
    return emojiMap[category || 'other'] || '📦'
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b border-sage/14 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-serif text-2xl italic text-ink">listings</h1>
          <Link
            href="/listings/create"
            className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition"
          >
            + new listing
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'live', 'hold', 'sold', 'delisted'] as const).map((f) => (
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

      {/* Listings Grid */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-ink-lt">loading listings...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-ink-lt mb-4">
              {listings.length === 0 ? 'No listings yet' : 'No listings match your filters'}
            </div>
            {listings.length === 0 && (
              <Link
                href="/listings/create"
                className="text-sm font-medium text-sage hover:text-sage-dk"
              >
                create your first listing →
              </Link>
            )}
          </div>
        ) : (
          filtered.map((listing) => (
            <div
              key={listing.id}
              className="bg-white border border-sage/14 rounded-md p-4 grid grid-cols-[60px_1fr_auto] gap-4 items-start hover:bg-cream transition-colors"
            >
              {/* Thumbnail + Category Emoji */}
              <div className="w-16 h-16 bg-cream-md rounded-sm flex items-center justify-center text-2xl flex-shrink-0">
                {getCategoryEmoji(listing.find?.category || undefined)}
              </div>

              {/* Details */}
              <div className="flex-1">
                <div className="font-medium text-ink text-sm">
                  {listing.find?.name}
                </div>
                <div className="text-xs text-ink-lt mt-1">
                  {listing.find?.category}
                  {listing.views > 0 && ` · ${listing.views} views`}
                  {listing.views === 0 && listing.status === 'live' && ' · no views yet'}
                </div>

                {/* Platform Tags */}
                <div className="flex gap-2 mt-2 flex-wrap">
                  <PlatformTag
                    platform={listing.platform}
                    live={listing.status === 'live'}
                  />
                </div>
              </div>

              {/* Price (Right side) */}
              <div className="text-right flex flex-col gap-2 items-end">
                <div className="font-serif font-medium text-ink text-xl">
                  £{listing.find?.asking_price_gbp?.toFixed(2) || '—'}
                </div>

                {/* Status Badge */}
                <Badge status={getStatusBadgeType(listing.status) as any} />

                {/* Action Buttons */}
                <div className="flex gap-2 mt-2">
                  <Link
                    href={listing.platform === 'ebay' ? '#' : listing.platform === 'vinted' ? '#' : '#'}
                    target="_blank"
                    className="px-2 py-1 text-xs bg-transparent border border-sage/22 text-ink-lt hover:bg-cream-md rounded transition-colors font-medium"
                  >
                    view
                  </Link>
                  {listing.status === 'live' && (
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
