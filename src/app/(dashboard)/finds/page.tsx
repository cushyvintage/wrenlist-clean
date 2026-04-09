'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Panel } from '@/components/wren/Panel'
import { Badge } from '@/components/wren/Badge'
import { PLAN_LIMITS } from '@/config/plans'
import type { Find, Profile, PlanId, Platform } from '@/types'
import { unwrapApiResponse } from '@/lib/api-utils'
import { formatCategory } from '@/lib/format-category'
import { useConnectedPlatforms } from '@/hooks/useConnectedPlatforms'
import { crosslistFind, formatPlatformName } from '@/lib/crosslist'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'

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

const LIMIT = 50

export default function InventoryPage() {
  const router = useRouter()
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [currentOffset, setCurrentOffset] = useState(0)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [finds, setFinds] = useState<Find[]>([])
  const [totalCount, setTotalCount] = useState(0)
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
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [statusCounts, setStatusCounts] = useState({ all: 0, draft: 0, listed: 0, on_hold: 0, sold: 0 })
  const [showBulkCrosslist, setShowBulkCrosslist] = useState(false)
  const [bulkCrosslistTargets, setBulkCrosslistTargets] = useState<Platform[]>([])
  const [bulkCrosslisting, setBulkCrosslisting] = useState(false)
  const [bulkCrosslistResult, setBulkCrosslistResult] = useState<{ ok: boolean; message: string } | null>(null)
  const { connected: allConnectedPlatforms, recheckPlatforms } = useConnectedPlatforms()

  /**
   * Debounce search input (300ms)
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentOffset(0) // Reset to first page when search changes
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  /**
   * Fetch profile and finds from API
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
          setProfile(unwrapApiResponse<Profile>(profileData))
        }

        // Check eBay connection status
        const ebayRes = await fetch('/api/ebay/status')
        if (ebayRes.ok) {
          const ebayData = await ebayRes.json()
          setEbayConnected(ebayData.data?.connected || false)
        }

        // Build query params
        const params = new URLSearchParams()
        params.set('limit', String(LIMIT))
        params.set('offset', String(currentOffset))
        if (debouncedSearch) {
          params.set('search', debouncedSearch)
        }
        if (selectedStatus && selectedStatus !== 'all' && selectedStatus !== 'aging') {
          params.set('status', selectedStatus)
        }

        // Fetch finds
        const findsRes = await fetch(`/api/finds?${params.toString()}`)
        if (!findsRes.ok) {
          throw new Error('Failed to fetch finds')
        }
        const result = await findsRes.json()
        const response = unwrapApiResponse<{ items: Find[]; pagination: { total: number }; counts?: Record<string, number> }>(result)
        setFinds(response?.items || [])
        setTotalCount(response?.pagination?.total || 0)
        if (response?.counts) {
          const c = response.counts
          setStatusCounts({
            all: c.all ?? 0,
            draft: c.draft ?? 0,
            listed: c.listed ?? 0,
            on_hold: c.on_hold ?? 0,
            sold: c.sold ?? 0,
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        setFinds([])
        setTotalCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedStatus, debouncedSearch, currentOffset, refreshTrigger])

  // Filter finds by aging status (client-side for aging filter since it needs calculation)
  const filteredFinds = selectedStatus === 'aging'
    ? finds.filter((find) => find.status === 'listed' && getDaysListed(find) >= 30)
    : finds

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

  const handlePrevPage = () => {
    if (currentOffset >= LIMIT) {
      setCurrentOffset(currentOffset - LIMIT)
    }
  }

  const handleNextPage = () => {
    if (currentOffset + LIMIT < totalCount) {
      setCurrentOffset(currentOffset + LIMIT)
    }
  }

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

  const handleUpgradeToNester = () => {
    router.push('/billing')
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

    const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
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

      // Refresh finds (re-runs fetchData with current pagination/filter state)
      setRefreshTrigger((n) => n + 1)

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

  const handleBulkCrosslist = async () => {
    if (bulkCrosslistTargets.length === 0) return
    setBulkCrosslisting(true)
    setBulkCrosslistResult(null)

    const findIds = Array.from(selectedItems)
    let succeeded = 0
    let failed = 0
    const errors: string[] = []

    for (const findId of findIds) {
      try {
        const outcome = await crosslistFind(findId, bulkCrosslistTargets, recheckPlatforms)
        if (outcome.ok) {
          succeeded++
        } else {
          failed++
          errors.push(`${findId.slice(0, 8)}: ${outcome.message}`)
        }
      } catch (err) {
        failed++
        errors.push(`${findId.slice(0, 8)}: ${err instanceof Error ? err.message : 'unknown error'}`)
      }
    }

    const parts: string[] = []
    if (succeeded > 0) parts.push(`${succeeded} item${succeeded !== 1 ? 's' : ''} queued`)
    if (failed > 0) parts.push(`${failed} failed`)
    setBulkCrosslistResult({ ok: failed === 0, message: parts.join(', ') + (errors.length > 0 ? ` — ${errors[0]}` : '') })
    setShowBulkCrosslist(false)
    setBulkCrosslistTargets([])
    setSelectedItems(new Set())
    setRefreshTrigger((n) => n + 1)
    setBulkCrosslisting(false)
  }

  const planLimit = profile ? PLAN_LIMITS[profile.plan as PlanId]?.finds : null
  const findsUsed = totalCount
  const totalPages = Math.ceil(totalCount / LIMIT)
  const currentPage = Math.floor(currentOffset / LIMIT) + 1

  // Computed stats
  const totalStockValue = finds.reduce((sum, f) => sum + (f.asking_price_gbp || 0), 0)
  const totalCostBasis = finds.reduce((sum, f) => sum + (f.cost_gbp || 0), 0)
  const avgMargin = totalCostBasis > 0 && totalStockValue > 0
    ? Math.round(((totalStockValue - totalCostBasis) / totalStockValue) * 100)
    : null
  const needsActionCount = finds.filter((f) =>
    f.status === 'draft' && (!f.asking_price_gbp || !f.photos || f.photos.length === 0 || !f.description)
  ).length

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="border-b border-sage/14 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="font-serif text-2xl italic text-ink">finds</h1>
            <p className="text-[13px] mt-1 hidden sm:block" style={{ color: '#8A9E88' }}>
              Your items — everything you&apos;ve sourced, whether it&apos;s listed somewhere or still sitting in a box.
            </p>
          </div>
          <div className="flex gap-2 items-center self-start">
            {/* Usage indicator */}
            {profile && planLimit !== null && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-full"
                style={{
                  backgroundColor: 'rgba(61,92,58,.08)',
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.14)',
                  color: '#6B7D6A',
                }}
              >
                <span>
                  {Math.min(findsUsed, planLimit)}/{planLimit}
                </span>
                {findsUsed >= planLimit && (
                  <>
                    <span className="text-amber-500">●</span>
                    <button
                      onClick={handleUpgradeToNester}
                      className="text-amber-600 underline hover:text-amber-900 transition-colors"
                    >
                      upgrade
                    </button>
                  </>
                )}
              </div>
            )}
            <button
              onClick={handleAddFind}
              className="px-4 py-2 text-sm font-medium text-white bg-sage rounded hover:bg-sage-dk transition whitespace-nowrap"
            >
              + add find
            </button>
          </div>
        </div>

        {/* Summary stats */}
        {!isLoading && statusCounts.all > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Total items', value: String(statusCounts.all) },
              { label: 'Stock value', value: `£${totalStockValue.toLocaleString()}` },
              { label: 'Avg margin', value: avgMargin !== null ? `${avgMargin}%` : '—' },
              { label: 'Needs action', value: String(needsActionCount), highlight: needsActionCount > 0 },
            ].map((stat) => (
              <div
                key={stat.label}
                className="px-4 py-3 rounded"
                style={{
                  backgroundColor: stat.highlight ? 'rgba(181,129,58,.08)' : 'rgba(61,92,58,.05)',
                  borderWidth: '1px',
                  borderColor: stat.highlight ? 'rgba(181,129,58,.2)' : 'rgba(61,92,58,.1)',
                }}
              >
                <div className="text-[10px] uppercase tracking-[.08em] font-medium" style={{ color: '#8A9E88' }}>
                  {stat.label}
                </div>
                <div
                  className="text-lg font-semibold mt-0.5"
                  style={{ color: stat.highlight ? '#B5813A' : '#1E2E1C' }}
                >
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filter pills with counts */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'listed', 'draft', 'on_hold', 'sold', 'aging'] as StatusFilter[]).map((s) => {
            const pillLabel = s === 'on_hold' ? 'on hold' : s
            const pillCount = s === 'aging' ? agingCount : (statusCounts[s as keyof typeof statusCounts] ?? 0)
            return (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors capitalize whitespace-nowrap ${
                  selectedStatus === s
                    ? 'bg-sage-pale border border-sage text-sage'
                    : 'bg-cream-md border border-sage/22 text-ink-lt hover:bg-cream'
                }`}
              >
                {pillLabel} ({pillCount})
              </button>
            )
          })}
        </div>
      </div>

      {/* Plan limit error state */}
      {planLimitError && (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-700 space-y-2">
          <p className="font-medium">{planLimitError}</p>
          <button
            onClick={handleUpgradeToNester}
            className="text-xs underline hover:text-amber-900 transition-colors"
          >
            Upgrade plan →
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => { setError(null); setCurrentOffset(0) }}
            className="ml-4 px-3 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Needs action banner */}
      {!isLoading && needsActionCount > 0 && selectedStatus !== 'draft' && (
        <button
          onClick={() => setSelectedStatus('draft')}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs w-full text-left hover:bg-amber-100 transition-colors"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
          {needsActionCount} draft{needsActionCount !== 1 ? 's' : ''} missing price, photos, or description — click to review
        </button>
      )}

      {/* Search + Sort */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="text"
          placeholder="Search finds..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 bg-cream-md border border-sage/22 rounded-sm text-ink-lt outline-none focus:border-sage text-sm w-full max-w-xs"
        />
      </div>

      {/* Bulk action error */}
      {bulkPublishError && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {bulkPublishError}
        </div>
      )}

      {/* Bulk crosslist result */}
      {bulkCrosslistResult && (
        <div className={`rounded p-3 text-sm ${bulkCrosslistResult.ok ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {bulkCrosslistResult.message}
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

          <div className="flex gap-2 relative">
            {/* Crosslist button */}
            {allConnectedPlatforms.length > 0 && (
              <button
                onClick={() => setShowBulkCrosslist(!showBulkCrosslist)}
                disabled={bulkCrosslisting}
                className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: '#3D5C3A',
                  color: '#F5F0E8',
                }}
                onMouseEnter={(e) => !bulkCrosslisting && (e.currentTarget.style.backgroundColor = '#2C4428')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3D5C3A')}
              >
                {bulkCrosslisting ? 'Publishing...' : '↗ Crosslist'}
              </button>
            )}

            {/* Bulk crosslist picker */}
            {showBulkCrosslist && (
              <div
                className="absolute bottom-full right-0 mb-2 p-3 rounded shadow-lg z-50 min-w-[220px]"
                style={{ backgroundColor: '#F5F0E8', borderWidth: '1px', borderColor: 'rgba(61,92,58,.22)' }}
              >
                <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: '#8A9E88' }}>
                  Publish {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} to
                </p>
                {allConnectedPlatforms.map(({ platform, username }) => (
                  <label key={platform} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bulkCrosslistTargets.includes(platform)}
                      onChange={() => setBulkCrosslistTargets((prev) =>
                        prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
                      )}
                      className="rounded"
                    />
                    <MarketplaceIcon platform={platform} size="sm" />
                    <span className="text-sm font-medium" style={{ color: '#1E2E1C' }}>
                      {formatPlatformName(platform)}
                      {username && <span className="font-normal ml-1" style={{ color: '#8A9E88' }}>· {username}</span>}
                    </span>
                  </label>
                ))}
                <p className="text-[11px] mt-2 leading-snug" style={{ color: '#92700C' }}>
                  Platforms other than eBay require the Wrenlist Chrome extension
                </p>
                <div className="flex gap-2 mt-2 pt-2" style={{ borderTopWidth: '1px', borderTopColor: 'rgba(61,92,58,.14)' }}>
                  <button
                    onClick={handleBulkCrosslist}
                    disabled={bulkCrosslistTargets.length === 0 || bulkCrosslisting}
                    className="flex-1 px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-40"
                    style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
                  >
                    Publish now
                  </button>
                  <button
                    onClick={() => { setShowBulkCrosslist(false); setBulkCrosslistTargets([]) }}
                    className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
                    style={{ borderWidth: '1px', borderColor: 'rgba(61,92,58,.22)', backgroundColor: 'transparent', color: '#3D5C3A' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

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


      {/* Loading state */}
      {isLoading && (
        <Panel className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
            <thead className="text-sage-dim">
              <tr className="border-b border-sage/14">
                <th className="text-left py-[10px] px-[18px] w-8"><div className="w-4 h-4 rounded bg-sage/10 animate-pulse" /></th>
                <th className="text-left py-[10px] px-[18px] min-w-[180px] text-[10px] uppercase tracking-[.08em] font-medium">item</th>
                <th className="text-left py-[10px] px-[18px] min-w-[90px] text-[10px] uppercase tracking-[.08em] font-medium hidden md:table-cell">source</th>
                <th className="text-right py-[10px] px-[10px] w-12 text-[10px] uppercase tracking-[.08em] font-medium">cost</th>
                <th className="text-right py-[10px] px-[12px] w-14 text-[10px] uppercase tracking-[.08em] font-medium">asking</th>
                <th className="text-right py-[10px] px-[12px] w-16 text-[10px] uppercase tracking-[.08em] font-medium">margin</th>
                <th className="text-left py-[10px] px-[12px] min-w-[160px] text-[10px] uppercase tracking-[.08em] font-medium">status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-sage/14">
                  <td className="py-[12px] px-[18px]"><div className="w-4 h-4 rounded bg-sage/10 animate-pulse" /></td>
                  <td className="py-[12px] px-[18px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-sage/10 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 rounded bg-sage/10 animate-pulse" style={{ width: `${120 + (i % 3) * 40}px` }} />
                        <div className="h-2.5 rounded bg-sage/10 animate-pulse w-16" />
                      </div>
                    </div>
                  </td>
                  <td className="py-[12px] px-[18px] hidden md:table-cell"><div className="h-3 rounded bg-sage/10 animate-pulse w-14" /></td>
                  <td className="py-[12px] px-[18px]"><div className="h-3 rounded bg-sage/10 animate-pulse w-10 ml-auto" /></td>
                  <td className="py-[12px] px-[18px]"><div className="h-3 rounded bg-sage/10 animate-pulse w-10 ml-auto" /></td>
                  <td className="py-[12px] px-[18px]"><div className="h-3 rounded bg-sage/10 animate-pulse w-8 ml-auto" /></td>
                  <td className="py-[12px] px-[12px]"><div className="h-5 rounded-full bg-sage/10 animate-pulse w-16" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {/* Inventory table */}
      {!isLoading && (
        <>
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
                    onClick={() => router.push(`/finds/${find.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F5F0E8')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td className="py-[12px] px-[18px]" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(find.id)}
                        onChange={() => toggleItemSelection(find.id)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="py-[12px] px-[18px]">
                      <div className="flex items-center gap-3">
                        {find.photos && find.photos.length > 0 ? (
                          <img
                            src={find.photos[0]}
                            alt={find.name || 'item'}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null
                              if (fallback) fallback.style.display = 'block'
                            }}
                          />
                        ) : null}
                        <span className="text-lg flex-shrink-0" style={{ display: !find.photos || find.photos.length === 0 ? 'block' : 'none' }}>
                          {getEmoji(find.category)}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-[13px]" style={{ color: '#1E2E1C' }}>
                            {find.name && !/^[0-9a-f-]{36}$/.test(find.name) ? find.name : 'Untitled item'}
                          </div>
                          <div className="text-[11px]" style={{ color: '#6B7D6A' }}>
                            {formatCategory(find.category)}
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

          {/* Pagination controls */}
          {totalCount > 0 && (
            <div className="flex items-center justify-between py-4 px-6 bg-[#F5F0E8] rounded border" style={{ borderColor: 'rgba(61,92,58,.22)' }}>
              <div className="text-sm" style={{ color: '#6B7D6A' }}>
                {totalCount === 1 ? '1 find' : `${totalCount} finds`}
                {planLimit !== null && totalCount > planLimit && (
                  <span style={{ color: '#B5813A' }}> (unlimited on Nester)</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentOffset === 0}
                  className="px-3 py-1.5 text-sm rounded transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'transparent',
                    borderWidth: '1px',
                    borderColor: 'rgba(61,92,58,.22)',
                    color: '#6B7D6A',
                  }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#EDE8DE')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  ← Prev
                </button>
                <span className="text-sm font-medium" style={{ color: '#6B7D6A' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={currentOffset + LIMIT >= totalCount}
                  className="px-3 py-1.5 text-sm rounded transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'transparent',
                    borderWidth: '1px',
                    borderColor: 'rgba(61,92,58,.22)',
                    color: '#6B7D6A',
                  }}
                  onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#EDE8DE')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!isLoading && filteredFinds.length === 0 && finds.length === 0 && !debouncedSearch && (
        <Panel>
          <div className="text-center py-16 px-6">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-ink font-medium mb-1">No finds yet</p>
            <p className="text-ink-lt text-sm mb-6 max-w-sm mx-auto">
              Add your first sourced item to start tracking inventory, costs, and margins.
            </p>
            <button
              onClick={() => router.push('/add-find')}
              className="px-6 py-2.5 bg-sage text-cream rounded text-sm font-medium hover:bg-sage-dk transition-colors"
            >
              + Add your first find
            </button>
          </div>
        </Panel>
      )}

      {/* No search/filter results */}
      {!isLoading && filteredFinds.length === 0 && (finds.length > 0 || debouncedSearch) && (
        <div className="py-12 text-center">
          <p className="text-ink-lt text-sm">
            {debouncedSearch ? `No items matching "${debouncedSearch}"` : 'No items in this status'}
          </p>
        </div>
      )}
    </div>
  )
}
