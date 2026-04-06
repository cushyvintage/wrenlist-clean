'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Platform } from '@/types'
import { fetchApi } from '@/lib/api-utils'
import { useMarketplaceImport } from '@/hooks/useMarketplaceImport'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'
import { ImportProgressBar } from '@/components/wren/ImportProgressBar'
import { InsightCard } from '@/components/wren/InsightCard'
import { PlatformGrid } from '@/components/import/PlatformGrid'
import { ImportHeader } from '@/components/import/ImportHeader'
import { ImportItemList } from '@/components/import/ImportItemList'
import type { ImportableItem, PlatformStatuses } from '@/components/import/types'
import type { StatusFilter } from '@/components/import/ImportHeader'

// No hard cap — fetch all listings from the marketplace
const IMPORT_LIMIT = Infinity

export default function ImportPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedPlatform = searchParams.get('platform') as Platform | null

  // Platform statuses
  const [platforms, setPlatforms] = useState<PlatformStatuses | null>(null)
  const [platformsLoading, setPlatformsLoading] = useState(true)

  // Import items state
  const [items, setItems] = useState<ImportableItem[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchedCount, setFetchedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Filters
  const [showOnlyNew, setShowOnlyNew] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Import state
  const vintedImport = useMarketplaceImport()

  // Load platform statuses on mount
  useEffect(() => {
    async function loadPlatforms() {
      try {
        const data = await fetchApi<{ platforms: PlatformStatuses }>('/api/platforms/status')
        setPlatforms(data.platforms)
      } catch {
        setPlatforms({
          ebay: { connected: false, username: null },
          vinted: { connected: false, username: null },
          shopify: { connected: false, username: null },
          etsy: { connected: false, username: null },
        })
      } finally {
        setPlatformsLoading(false)
      }
    }
    loadPlatforms()
  }, [])

  // Load items when platform is selected
  useEffect(() => {
    if (!selectedPlatform || !platforms) return
    setItems([])
    setFetchError(null)
    setSearchQuery('')
    setStatusFilter('all')

    if (selectedPlatform === 'ebay') {
      loadEbayInventory()
    } else if (selectedPlatform === 'vinted') {
      loadVintedListings()
    } else if (selectedPlatform === 'shopify') {
      loadShopifyListings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform, platforms])

  // --- eBay ---
  async function loadEbayInventory() {
    setIsFetching(true)
    setFetchedCount(0)
    try {
      const data = await fetchApi<{
        listings: Array<{
          sku: string
          title: string
          price: number | null
          photos: string[]
          listingId: string | null
          listingUrl: string | null
          alreadyImported: boolean
        }>
        totalCount: number
      }>('/api/ebay/inventory')

      const mapped: ImportableItem[] = data.listings.map((l) => ({
        id: l.sku,
        platform: 'ebay' as Platform,
        title: l.title,
        price: l.price,
        photo: l.photos[0] || null,
        listingId: l.listingId,
        listingUrl: l.listingUrl,
        alreadyImported: l.alreadyImported,
        checked: !l.alreadyImported,
        listingStatus: l.listingId ? 'active' as const : 'draft' as const,
      }))

      setItems(mapped)
      setTotalCount(data.totalCount)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch eBay inventory')
    } finally {
      setIsFetching(false)
    }
  }

  // --- Vinted (progressive fetch via extension) ---
  async function loadVintedListings() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setFetchError('Wrenlist extension required for Vinted import. Install it from the Chrome Web Store.')
      return
    }

    setIsFetching(true)
    setFetchedCount(0)

    try {
      // First get already-imported IDs
      const importedData = await fetchApi<{ importedIds: string[] }>('/api/import/vinted-imported')
      const importedSet = new Set(importedData.importedIds)

      // Progressive page fetch
      let page = 1
      let totalPages = 1
      const allItems: ImportableItem[] = []

      while (page <= totalPages && allItems.length < IMPORT_LIMIT) {
        const response = await new Promise<{
          success: boolean
          listings?: Array<{
            id: string
            title: string
            price: number
            photo: string | null
            url: string | null
            isSold: boolean
          }>
          total?: number
          totalPages?: number
          message?: string
        }>((resolve) => {
          const timeout = setTimeout(
            () => resolve({ success: false, message: 'Timed out fetching Vinted listings' }),
            30000
          )
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { action: 'get_vinted_listings', page, perPage: 96, status: 'all' },
            (resp) => {
              clearTimeout(timeout)
              if (chrome.runtime.lastError) {
                resolve({ success: false, message: chrome.runtime.lastError.message })
              } else {
                resolve(resp || { success: false, message: 'No response' })
              }
            }
          )
        })

        if (!response.success) {
          if (page === 1) {
            setFetchError(response.message || 'Failed to fetch Vinted listings')
            setIsFetching(false)
            return
          }
          break
        }

        const listings = response.listings || []
        totalPages = response.totalPages || 1

        for (const l of listings) {
          if (allItems.length >= IMPORT_LIMIT) break
          allItems.push({
            id: l.id,
            platform: 'vinted',
            title: l.title,
            price: l.price,
            photo: l.photo,
            listingId: l.id,
            listingUrl: l.url,
            alreadyImported: importedSet.has(l.id),
            checked: !importedSet.has(l.id),
            listingStatus: 'active',
          })
        }

        setFetchedCount(allItems.length)
        setItems([...allItems])
        setTotalCount(response.total || allItems.length)
        page++
      }

      setItems(allItems)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch Vinted listings')
    } finally {
      setIsFetching(false)
    }
  }

  // --- Shopify (fetch via extension) ---
  async function loadShopifyListings() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setFetchError('Wrenlist extension required for Shopify import. Install it from the Chrome Web Store.')
      return
    }

    const shopifyStatus = platforms?.shopify
    const storeDomain = shopifyStatus?.storeDomain
    if (!storeDomain) {
      setFetchError('Shopify store domain not configured. Connect Shopify in Platform Connect first.')
      return
    }

    setIsFetching(true)
    setFetchedCount(0)

    try {
      // Get already-imported Shopify IDs
      const importedData = await fetchApi<{ importedIds: string[] }>(
        '/api/import/marketplace-imported?marketplace=shopify'
      )
      const importedSet = new Set(importedData.importedIds)

      // Progressive cursor-based fetch
      let cursor: string | undefined
      const allItems: ImportableItem[] = []

      while (allItems.length < IMPORT_LIMIT) {
        const response = await new Promise<{
          success: boolean
          products?: Array<{
            marketplaceId: string
            title: string
            price: string | number | null
            coverImage: string | null
            marketplaceUrl: string | null
            status: string
          }>
          nextPage?: string | null
          username?: string
          message?: string
        }>((resolve) => {
          const timeout = setTimeout(
            () => resolve({ success: false, message: 'Timed out fetching Shopify listings' }),
            30000
          )
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            {
              action: 'get_marketplace_listings',
              marketplace: 'shopify',
              params: {
                page: cursor,
                perPage: 50,
                userSettings: { shopifyShopUrl: storeDomain },
              },
            },
            (resp) => {
              clearTimeout(timeout)
              if (chrome.runtime.lastError) {
                resolve({ success: false, message: chrome.runtime.lastError.message })
              } else {
                resolve(resp || { success: false, message: 'No response' })
              }
            }
          )
        })

        if (!response.success) {
          if (allItems.length === 0) {
            setFetchError(response.message || 'Failed to fetch Shopify listings')
            setIsFetching(false)
            return
          }
          break
        }

        const products = response.products || []
        if (products.length === 0) break

        for (const p of products) {
          if (allItems.length >= IMPORT_LIMIT) break
          const id = String(p.marketplaceId)
          const price = typeof p.price === 'string' ? parseFloat(p.price) : (p.price ?? null)
          allItems.push({
            id,
            platform: 'shopify',
            title: p.title || 'Untitled',
            price,
            photo: p.coverImage,
            listingId: id,
            listingUrl: p.marketplaceUrl,
            alreadyImported: importedSet.has(id),
            checked: !importedSet.has(id),
            listingStatus: p.status === 'draft' ? 'draft' : 'active',
          })
        }

        setFetchedCount(allItems.length)
        setItems([...allItems])
        setTotalCount(allItems.length)

        cursor = response.nextPage ?? undefined
        if (!cursor) break
      }

      setItems(allItems)
      setTotalCount(allItems.length)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch Shopify listings')
    } finally {
      setIsFetching(false)
    }
  }

  // --- Item selection ---
  const toggleItem = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id && !item.alreadyImported
          ? { ...item, checked: !item.checked }
          : item
      )
    )
  }, [])

  const toggleAll = useCallback(() => {
    setItems((prev) => {
      const selectableItems = prev.filter((i) => !i.alreadyImported)
      const allChecked = selectableItems.every((i) => i.checked)
      return prev.map((item) =>
        item.alreadyImported ? item : { ...item, checked: !allChecked }
      )
    })
  }, [])

  // --- Filtered items ---
  const filteredItems = items.filter((item) => {
    if (showOnlyNew && item.alreadyImported) return false
    if (statusFilter !== 'all' && item.listingStatus !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!item.title.toLowerCase().includes(q)) return false
    }
    return true
  })

  const selectableItems = filteredItems.filter((i) => !i.alreadyImported)
  const allSelected = selectableItems.length > 0 && selectableItems.every((i) => i.checked)
  const selectedCount = items.filter((i) => i.checked && !i.alreadyImported).length

  // --- Import actions ---
  const isImporting = vintedImport.state.phase === 'importing' || vintedImport.state.phase === 'fetching'

  async function handleImport() {
    if (!selectedPlatform || selectedCount === 0) return

    if (selectedPlatform === 'ebay') {
      await handleEbayImport()
    } else if (selectedPlatform === 'vinted') {
      await handleVintedImport()
    } else if (selectedPlatform === 'shopify') {
      await handleShopifyImport()
    }
  }

  async function handleEbayImport() {
    const skus = items
      .filter((i) => i.checked && !i.alreadyImported)
      .map((i) => i.id)

    vintedImport.setFetching('Importing eBay listings...')

    try {
      const response = await fetch('/api/ebay/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus }),
      })

      if (!response.ok) throw new Error('eBay import failed')

      const data = await response.json()
      const result = data.data || data
      vintedImport.setDone(
        result.imported || 0,
        result.skipped || 0,
        result.errors || 0,
        skus.length
      )

      // Refresh list
      await loadEbayInventory()
    } catch (err) {
      vintedImport.setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  async function handleVintedImport() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      vintedImport.setError('Extension not available')
      return
    }

    const selectedIds = items
      .filter((i) => i.checked && !i.alreadyImported)
      .map((i) => i.id)

    vintedImport.setFetching('Importing Vinted listings...')

    const since = new Date().toISOString()
    let stopPolling: (() => void) | undefined

    const pollingTimer = setTimeout(() => {
      stopPolling = vintedImport.startPolling(since, selectedIds.length)
    }, 10000)

    try {
      const response = await new Promise<{
        success: boolean
        message?: string
        results?: { success: number; skipped: number; errors: number; total: number }
      }>((resolve) => {
        const timeout = setTimeout(
          () => resolve({ success: false, message: 'Timed out' }),
          360000
        )
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          {
            action: 'batch_import_vinted',
            listingIds: selectedIds,
            limit: selectedIds.length,
            wrenlistBaseUrl: window.location.origin,
          },
          (resp) => {
            clearTimeout(timeout)
            if (chrome.runtime.lastError) {
              resolve({ success: false, message: chrome.runtime.lastError.message })
            } else {
              resolve(resp || { success: false, message: 'No response' })
            }
          }
        )
      })

      clearTimeout(pollingTimer)
      if (stopPolling) stopPolling()

      if (!response.success) {
        throw new Error(response.message || 'Vinted import failed')
      }

      const r = response.results || { success: 0, skipped: 0, errors: 0, total: 0 }
      vintedImport.setDone(r.success, r.skipped, r.errors, r.total)

      // Refresh list
      await loadVintedListings()
    } catch (err) {
      clearTimeout(pollingTimer)
      if (stopPolling) stopPolling()
      vintedImport.setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  async function handleShopifyImport() {
    const selected = items.filter((i) => i.checked && !i.alreadyImported)
    if (selected.length === 0) return

    vintedImport.setFetching('Importing Shopify listings...')

    let imported = 0
    let skipped = 0
    let errors = 0

    try {
      for (const item of selected) {
        try {
          const result = await fetchApi<{ success?: boolean; skipped?: boolean; findId?: string }>(
            '/api/import/marketplace-item',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                marketplace: 'shopify',
                marketplaceProductId: item.id,
                productData: {
                  title: item.title,
                  price: item.price,
                  coverImage: item.photo,
                  marketplaceUrl: item.listingUrl,
                },
                url: item.listingUrl,
              }),
            }
          )

          if (result.skipped) {
            skipped++
          } else {
            imported++
          }
        } catch {
          errors++
        }

        vintedImport.runImportProgress(imported, skipped, errors, selected.length)
      }

      vintedImport.setDone(imported, skipped, errors, selected.length)

      // Refresh list
      await loadShopifyListings()
    } catch (err) {
      vintedImport.setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  // --- Navigation ---
  function selectPlatform(platform: Platform) {
    vintedImport.reset()
    router.push(`/import?platform=${platform}`)
  }

  function goBack() {
    vintedImport.reset()
    router.push('/import')
  }

  // --- Render ---
  if (platformsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-serif italic text-ink">import</h1>
        <div className="text-sm text-ink-lt animate-pulse">Loading platforms...</div>
      </div>
    )
  }

  // Platform selection view (no platform selected)
  if (!selectedPlatform) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-serif italic text-ink">import</h1>
        {platforms && <PlatformGrid platforms={platforms} onSelectPlatform={selectPlatform} />}
      </div>
    )
  }

  // Not connected — prompt to connect
  const platformStatus = platforms?.[selectedPlatform as keyof PlatformStatuses]
  if (platformStatus && !platformStatus.connected) {
    // For Vinted, check extension too — the DB might not have a record yet
    if (selectedPlatform !== 'vinted') {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-sm text-ink-lt hover:text-ink transition">
              ← back
            </button>
            <h1 className="text-lg font-serif italic text-ink">import</h1>
          </div>
          <div className="bg-white border border-sage/14 rounded-md p-8 text-center">
            <p className="text-sm text-ink-lt mb-4">
              Connect {selectedPlatform} to import your listings
            </p>
            <a
              href="/platform-connect"
              className="inline-block px-4 py-2 text-sm font-medium bg-sage text-white rounded hover:bg-sage-dk transition"
            >
              Connect {selectedPlatform} →
            </a>
          </div>
        </div>
      )
    }
  }

  // Per-platform import view
  return (
    <div className="space-y-4">
      <ImportHeader
        platform={selectedPlatform}
        selectedCount={selectedCount}
        isImporting={isImporting}
        isFetching={isFetching}
        fetchedCount={fetchedCount}
        onImport={handleImport}
        onBack={goBack}
        showOnlyNew={showOnlyNew}
        onToggleShowOnlyNew={() => setShowOnlyNew((v) => !v)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Import progress */}
      {vintedImport.state.phase !== 'idle' && (
        <ImportProgressBar state={vintedImport.state} />
      )}

      {/* Error */}
      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Loading skeleton */}
      {isFetching && items.length === 0 && (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-cream-md rounded animate-pulse" />
          ))}
        </div>
      )}

      {/* Items list */}
      {(!isFetching || items.length > 0) && !fetchError && (
        <ImportItemList
          items={filteredItems}
          onToggleItem={toggleItem}
          onToggleAll={toggleAll}
          allSelected={allSelected}
          totalCount={totalCount}
        />
      )}

      {/* Cost price warning */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          <span className="text-amber-800">
            ⚠ Cost price not set — add after import for accurate margins
          </span>
        </div>
      )}

      {/* Insight */}
      {items.length > 0 && !isFetching && (
        <InsightCard text="Import your listings to start tracking margins and see analytics across all your platforms." />
      )}
    </div>
  )
}
