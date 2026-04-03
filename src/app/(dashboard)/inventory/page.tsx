'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { Badge } from '@/components/wren/Badge'
import { PlatformTag } from '@/components/wren/PlatformTag'
import { PLAN_LIMITS } from '@/config/plans'
import type { Find, Profile, PlanId } from '@/types'
import { unwrapApiResponse } from '@/lib/api-utils'

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
    sku: 'WR-WOR-20260325-001',
    platform_fields: {},
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    shipping_weight_grams: null,
    shipping_length_cm: null,
    shipping_width_cm: null,
    shipping_height_cm: null,
    sourcing_trip_id: null,
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
    sku: 'WR-FOO-20260326-001',
    platform_fields: {},
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    shipping_weight_grams: null,
    shipping_length_cm: null,
    shipping_width_cm: null,
    shipping_height_cm: null,
    sourcing_trip_id: null,
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
    sku: 'WR-DEN-20260327-001',
    platform_fields: {},
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    shipping_weight_grams: null,
    shipping_length_cm: null,
    shipping_width_cm: null,
    shipping_height_cm: null,
    sourcing_trip_id: null,
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
    sku: 'WR-BAG-20260328-001',
    platform_fields: {},
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    shipping_weight_grams: null,
    shipping_length_cm: null,
    shipping_width_cm: null,
    shipping_height_cm: null,
    sourcing_trip_id: null,
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
    sku: 'WR-ACC-20260329-001',
    platform_fields: {},
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    shipping_weight_grams: null,
    shipping_length_cm: null,
    shipping_width_cm: null,
    shipping_height_cm: null,
    sourcing_trip_id: null,
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
    sku: 'WR-TOP-20260323-001',
    platform_fields: {},
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    shipping_weight_grams: null,
    shipping_length_cm: null,
    shipping_width_cm: null,
    shipping_height_cm: null,
    sourcing_trip_id: null,
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
    sku: 'WR-WOM-20260322-001',
    platform_fields: {},
    ai_generated_description: null,
    ai_suggested_price_low: null,
    ai_suggested_price_high: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    shipping_weight_grams: null,
    shipping_length_cm: null,
    shipping_width_cm: null,
    shipping_height_cm: null,
    sourcing_trip_id: null,
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

type StatusFilter = 'all' | 'listed' | 'draft' | 'on_hold' | 'sold' | 'aging'

// Helper function to calculate days listed
const getDaysListed = (find: Find): number => {
  const now = new Date()
  const listedDate = new Date(find.updated_at)
  return Math.floor((now.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24))
}

export default function InventoryPage() {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [finds, setFinds] = useState<Find[]>(mockFinds)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [planLimitError, setPlanLimitError] = useState<string | null>(null)
  const [ebayConnected, setEbayConnected] = useState(false)
  const [publishingFindId, setPublishingFindId] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<Record<string, string>>({})
  const [bulkPublishConfirm, setBulkPublishConfirm] = useState(false)
  const [bulkPublishing, setBulkPublishing] = useState(false)
  const [bulkPublishError, setBulkPublishError] = useState<string | null>(null)
  const [showMarkSoldForm, setShowMarkSoldForm] = useState(false)
  const [markSoldPrice, setMarkSoldPrice] = useState('')
  const [bulkMarkingSold, setBulkMarkingSold] = useState(false)

  /**
   * Set page title on mount
   */
  useEffect(() => {
    document.title = 'Inventory | Wrenlist'
  }, [])

  /**
   * Fetch profile and finds from API on mount
   */
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        setPlanLimitError(null)

        // Fetch profile
        const profileRes = await fetch('/api/profile')
        if (profileRes.ok) {
          const profileData = await profileRes.json()
          setProfile(profileData.data)
        }

        // Check eBay connection status
        const ebayRes = await fetch('/api/ebay/status')
        if (ebayRes.ok) {
          const ebayData = await ebayRes.json()
          setEbayConnected(ebayData.data?.connected || false)
        }

        // Fetch finds
        const findsRes = await fetch('/api/finds')
        if (!findsRes.ok) {
          throw new Error('Failed to fetch finds')
        }
        const result = await findsRes.json()
        setFinds(unwrapApiResponse<Find[]>(result))
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        // Fall back to mock data
        setFinds(mockFinds)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter finds by status and search
  const filteredFinds = finds.filter((find) => {
    let statusMatch = false
    if (selectedStatus === 'all') {
      statusMatch = true
    } else if (selectedStatus === 'aging') {
      statusMatch = find.status === 'listed' && getDaysListed(find) >= 30
    } else {
      statusMatch = find.status === selectedStatus
    }

    const searchMatch =
      searchQuery === '' ||
      find.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (find.category && find.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (find.source_name && find.source_name.toLowerCase().includes(searchQuery.toLowerCase()))
    return statusMatch && searchMatch
  })

  // Count aging items for badge
  const agingCount = finds.filter((find) => find.status === 'listed' && getDaysListed(find) >= 30).length

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

  const handleAddFind = () => {
    if (!profile) {
      router.push('/add-find')
      return
    }

    const planLimit = PLAN_LIMITS[profile.plan as PlanId]?.finds
    if (planLimit !== null && profile.finds_this_month >= planLimit) {
      setPlanLimitError(`You've reached your monthly limit of ${planLimit} finds. Upgrade your plan to add more.`)
      return
    }

    router.push('/add-find')
  }

  const handleListOnEbay = async (findId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setPublishingFindId(findId)
    setPublishError({ ...publishError, [findId]: '' })

    try {
      const response = await fetch('/api/ebay/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findId }),
      })

      if (!response.ok) {
        const data = await response.json()
        const message = data.message || 'Failed to publish to eBay'
        setPublishError({ ...publishError, [findId]: message })
        return
      }

      const data = await response.json()

      // Update find with eBay listing info
      setFinds((prevFinds) =>
        prevFinds.map((find) => {
          if (find.id === findId) {
            return {
              ...find,
              platform_fields: {
                ...find.platform_fields,
                ebay: {
                  listingId: data.data.listingId,
                  offerId: data.data.offerId,
                  status: 'live',
                  url: data.data.listingUrl,
                  publishedAt: new Date().toISOString(),
                },
              },
            }
          }
          return find
        }) as Find[]
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish to eBay'
      setPublishError({ ...publishError, [findId]: message })
    } finally {
      setPublishingFindId(null)
    }
  }

  const handleBulkPublishVinted = async () => {
    const findIds = Array.from(selectedItems)
    setBulkPublishing(true)
    setBulkPublishError(null)

    const EXTENSION_ID = 'adipbheonmknmlhgafhdoaefcjbajhdk'
    const chromeExt = typeof window !== 'undefined' ? (window as any).chrome : null
    const hasExtension = !!(chromeExt?.runtime?.sendMessage)

    try {
      // Validate queue server-side first
      const response = await fetch('/api/bulk/publish-vinted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findIds }),
      })

      if (!response.ok) {
        const data = await response.json()
        setBulkPublishError(data.message || 'Failed to queue items for publishing')
        return
      }

      if (hasExtension) {
        // Fetch each product payload and dispatch to extension one by one
        let failed = 0
        for (const findId of findIds) {
          try {
            const payloadRes = await fetch(`/api/chrome-extension/vinted/product-payload/${findId}`)
            if (!payloadRes.ok) { failed++; continue }
            const payloadData = await payloadRes.json()
            const product = payloadData?.data?.product ?? payloadData?.product
            if (!product) { failed++; continue }

            await new Promise<void>((resolve) => {
              chromeExt.runtime.sendMessage(
                EXTENSION_ID,
                { action: 'publishtomarketplace', marketplace: 'vinted', product },
                (resp: any) => {
                  if (chromeExt.runtime.lastError) {
                    console.warn('Extension publish error:', chromeExt.runtime.lastError.message)
                    failed++
                  } else if (!resp?.success && !resp?.ok) {
                    console.warn('Vinted publish failed for', findId, resp?.error)
                    failed++
                  }
                  resolve()
                }
              )
            })
          } catch (e) {
            console.warn('Payload fetch failed for', findId, e)
            failed++
          }
        }

        if (failed > 0) {
          setBulkPublishError(`${failed} of ${findIds.length} items failed to publish — check the extension is open on Vinted`)
          return
        }
      } else {
        // No extension detected — show install prompt
        setBulkPublishError('Wrenlist extension not detected. Install it and make sure Vinted is open in another tab.')
        return
      }

      // Success — clear selection
      setSelectedItems(new Set())
      setBulkPublishConfirm(false)
    } catch (err) {
      setBulkPublishError(err instanceof Error ? err.message : 'Failed to publish items')
    } finally {
      setBulkPublishing(false)
    }
  }

  const handleBulkMarkSold = async () => {
    const findIds = Array.from(selectedItems)
    const price = markSoldPrice ? parseFloat(markSoldPrice) : undefined

    setBulkMarkingSold(true)

    try {
      const response = await fetch('/api/bulk/mark-sold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findIds, soldPrice: price }),
      })

      if (!response.ok) {
        const data = await response.json()
        const message = data.message || 'Failed to mark items as sold'
        setBulkPublishError(message)
        return
      }

      // Refresh finds
      const findsRes = await fetch('/api/finds')
      if (findsRes.ok) {
        const result = await findsRes.json()
        setFinds(unwrapApiResponse<Find[]>(result))
      }

      // Clear selection and close form
      setSelectedItems(new Set())
      setShowMarkSoldForm(false)
      setMarkSoldPrice('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark items as sold'
      setBulkPublishError(message)
    } finally {
      setBulkMarkingSold(false)
    }
  }

  const planLimit = profile ? PLAN_LIMITS[profile.plan as PlanId]?.finds : null
  const findsUsed = profile?.finds_this_month || 0

  return (
    <div className="space-y-6">
      {/* Page title is in topbar - no need to repeat */}

      {/* Plan limit error state */}
      {planLimitError && (
        <div className="bg-amber/10 border border-amber/30 rounded p-4 text-sm text-amber space-y-2">
          <p className="font-medium">{planLimitError}</p>
          <button
            onClick={() => router.push('/pricing')}
            className="text-xs underline hover:text-amber-900 transition-colors"
          >
            Upgrade plan →
          </button>
        </div>
      )}

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
          {(['all', 'listed', 'draft', 'on_hold', 'sold', 'aging'] as StatusFilter[]).map((status) => {
            const label =
              status === 'on_hold' ? 'on hold' : status === 'aging' ? `aging (${agingCount})` : status
            return (
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
                {label}
              </button>
            )
          })}
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
        <div className="flex gap-2 whitespace-nowrap items-center">
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

          {/* Usage indicator */}
          {profile && planLimit !== null && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] rounded"
              style={{
                backgroundColor: 'rgba(61,92,58,.08)',
                borderWidth: '1px',
                borderColor: 'rgba(61,92,58,.14)',
                color: '#6B7D6A',
              }}
            >
              <span>
                {findsUsed} of {planLimit} finds used
              </span>
              {findsUsed >= planLimit && (
                <span className="text-amber">●</span>
              )}
            </div>
          )}

          <button
            onClick={handleAddFind}
            className="px-[18px] py-[7px] text-[13px] font-medium rounded transition-colors"
            style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2C4428')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3D5C3A')}
          >
            + add find
          </button>
        </div>
      </div>

      {/* Bulk action error */}
      {bulkPublishError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {bulkPublishError}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedItems.size > 0 && (
        <div
          className="flex items-center justify-between p-4 rounded sticky bottom-0 z-10"
          style={{
            backgroundColor: '#D4E2D2',
            borderWidth: '1px',
            borderColor: '#3D5C3A',
          }}
        >
          <span className="text-sm font-medium" style={{ color: '#1E2E1C' }}>
            {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
          </span>

          <div className="flex gap-2">
            {/* Publish to Vinted button */}
            <button
              onClick={() => setBulkPublishConfirm(true)}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: '#3D5C3A',
                color: '#F5F0E8',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2C4428')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3D5C3A')}
            >
              Publish to Vinted
            </button>

            {/* Mark as sold button */}
            <button
              onClick={() => setShowMarkSoldForm(!showMarkSoldForm)}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: '#F5F0E8',
                borderWidth: '1px',
                borderColor: '#3D5C3A',
                color: '#3D5C3A',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE8DE')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F5F0E8')}
            >
              Mark as sold
            </button>

            {/* Clear selection button */}
            <button
              onClick={() => setSelectedItems(new Set())}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: 'transparent',
                borderWidth: '1px',
                borderColor: '#3D5C3A',
                color: '#3D5C3A',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(61,92,58,.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Mark as sold form */}
      {showMarkSoldForm && selectedItems.size > 0 && (
        <div
          className="p-4 rounded"
          style={{
            backgroundColor: '#F5F0E8',
            borderWidth: '1px',
            borderColor: 'rgba(61,92,58,.22)',
          }}
        >
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium uppercase tracking-widest" style={{ color: '#6B7D6A' }}>
                Sold price (£) — applies to all {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''}
              </label>
              <input
                type="number"
                value={markSoldPrice}
                onChange={(e) => setMarkSoldPrice(e.target.value)}
                placeholder="optional"
                className="w-full mt-2 px-3 py-2 text-sm rounded"
                style={{
                  backgroundColor: '#FFF',
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  color: '#1E2E1C',
                }}
              />
            </div>
            <button
              onClick={handleBulkMarkSold}
              disabled={bulkMarkingSold}
              className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
              style={{
                backgroundColor: '#3D5C3A',
                color: '#F5F0E8',
              }}
              onMouseEnter={(e) => !bulkMarkingSold && (e.currentTarget.style.backgroundColor = '#2C4428')}
              onMouseLeave={(e) => !bulkMarkingSold && (e.currentTarget.style.backgroundColor = '#3D5C3A')}
            >
              {bulkMarkingSold ? 'Marking...' : 'Mark as sold'}
            </button>
            <button
              onClick={() => {
                setShowMarkSoldForm(false)
                setMarkSoldPrice('')
              }}
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: 'transparent',
                borderWidth: '1px',
                borderColor: '#3D5C3A',
                color: '#3D5C3A',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(61,92,58,.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk publish confirmation modal */}
      {bulkPublishConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={() => setBulkPublishConfirm(false)}
        >
          <div
            className="bg-white rounded p-6 max-w-sm"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#1E2E1C' }}>
              Publish {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} to Vinted?
            </h3>
            <p className="text-sm mb-6" style={{ color: '#6B7D6A' }}>
              The extension will publish these items to Vinted one by one. This may take a few moments.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBulkPublishConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  color: '#3D5C3A',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(61,92,58,.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkPublishVinted}
                disabled={bulkPublishing}
                className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: '#3D5C3A',
                  color: '#F5F0E8',
                }}
                onMouseEnter={(e) => !bulkPublishing && (e.currentTarget.style.backgroundColor = '#2C4428')}
                onMouseLeave={(e) => !bulkPublishing && (e.currentTarget.style.backgroundColor = '#3D5C3A')}
              >
                {bulkPublishing ? 'Publishing...' : 'Publish to Vinted'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <th className="text-left py-[10px] px-[18px] min-w-[180px] text-[10px] uppercase tracking-[.08em] font-medium">item</th>
                <th className="text-left py-[10px] px-[18px] min-w-[90px] text-[10px] uppercase tracking-[.08em] font-medium hidden md:table-cell">source</th>
                <th className="text-right py-[10px] px-[10px] w-12 text-[10px] uppercase tracking-[.08em] font-medium">cost</th>
                <th className="text-right py-[10px] px-[12px] w-14 text-[10px] uppercase tracking-[.08em] font-medium">asking</th>
                <th className="text-right py-[10px] px-[12px] w-16 text-[10px] uppercase tracking-[.08em] font-medium">margin</th>
                <th className="text-left py-[10px] px-[12px] min-w-[160px] text-[10px] uppercase tracking-[.08em] font-medium">status</th>
              </tr>
            </thead>
            <tbody>
            {filteredFinds.map((find) => {
              const margin = calculateMargin(find.cost_gbp, find.asking_price_gbp)
              const daysListed = getDaysListed(find)
              const isAged30 = find.status === 'listed' && daysListed >= 30
              const isAged60 = find.status === 'listed' && daysListed >= 60
              return (
                <tr
                  key={find.id}
                  onClick={() => router.push(`/inventory/${find.id}`)}
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
                          {find.name || 'Untitled'}
                        </div>
                        <div className="text-[11px] capitalize" style={{ color: '#6B7D6A' }}>
                          {find.category}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-[12px] px-[18px] text-[11px]" style={{ color: '#6B7D6A' }}>
                    {find.source_name || ''}
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
                  <td className="py-[12px] px-[12px]">
                    {(find.platform_fields as any)?.ebay?.status === 'live' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge status="listed" />
                        {isAged60 && (
                          <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-red-100 text-red-700">
                            60d+ no sale
                          </span>
                        )}
                        {isAged30 && !isAged60 && (
                          <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
                            30d+ no sale
                          </span>
                        )}
                        <a
                          href={(find.platform_fields as any).ebay.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] underline underline-offset-2 transition-colors"
                          style={{ color: '#5A7A57' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Live on eBay →
                        </a>
                      </div>
                    ) : find.status === 'draft' ? (
                      <div className="flex flex-col gap-2">
                        <Badge status="draft" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push('/add-find')
                          }}
                          className="text-[11px] underline underline-offset-2 transition-colors text-left"
                          style={{ color: '#5A7A57' }}
                        >
                          complete & list →
                        </button>
                        {ebayConnected && (
                          <button
                            onClick={(e) => handleListOnEbay(find.id, e)}
                            disabled={publishingFindId === find.id}
                            className="text-[11px] underline underline-offset-2 transition-colors disabled:opacity-50 text-left whitespace-nowrap"
                            style={{ color: '#B5813A' }}
                          >
                            {publishingFindId === find.id ? 'Listing...' : 'List on eBay →'}
                          </button>
                        )}
                        {publishError[find.id] && (
                          <div className="text-[10px] text-red-600 mt-1">{publishError[find.id]}</div>
                        )}
                      </div>
                    ) : (find.platform_fields as any)?.ebay?.status === 'live_dup' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge status="listed" />
                        {isAged60 && (
                          <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-red-100 text-red-700">
                            60d+ no sale
                          </span>
                        )}
                        {isAged30 && !isAged60 && (
                          <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
                            30d+ no sale
                          </span>
                        )}
                        <a
                          href={(find.platform_fields as any).ebay.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] underline underline-offset-2 transition-colors"
                          style={{ color: '#5A7A57' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Live on eBay →
                        </a>
                      </div>
                    ) : ebayConnected && find.status !== 'sold' ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge status={find.status as 'listed' | 'on_hold' | 'sold'} />
                          {isAged60 && (
                            <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-red-100 text-red-700">
                              60d+ no sale
                            </span>
                          )}
                          {isAged30 && !isAged60 && (
                            <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
                              30d+ no sale
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleListOnEbay(find.id, e)}
                          disabled={publishingFindId === find.id}
                          className="text-[11px] underline underline-offset-2 transition-colors disabled:opacity-50"
                          style={{ color: '#5A7A57' }}
                        >
                          {publishingFindId === find.id ? 'Listing...' : 'List on eBay →'}
                        </button>
                        {publishError[find.id] && (
                          <div className="text-[10px] text-red-600 mt-1">{publishError[find.id]}</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge status={find.status as 'listed' | 'on_hold' | 'sold'} />
                        {isAged60 && (
                          <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-red-100 text-red-700">
                            60d+ no sale
                          </span>
                        )}
                        {isAged30 && !isAged60 && (
                          <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-amber-100 text-amber-700">
                            30d+ no sale
                          </span>
                        )}
                      </div>
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
            onClick={() => router.push('/add-find')}
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
