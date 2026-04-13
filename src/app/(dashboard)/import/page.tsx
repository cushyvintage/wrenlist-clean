'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { Platform } from '@/types'
import { fetchApi } from '@/lib/api-utils'
import { formatPlatformName } from '@/lib/crosslist'
import { useMarketplaceImport } from '@/hooks/useMarketplaceImport'
import { useConnectedPlatforms } from '@/hooks/useConnectedPlatforms'
import { EXTENSION_ID } from '@/hooks/useExtensionInfo'
import { ImportProgressBar } from '@/components/wren/ImportProgressBar'
import { InsightCard } from '@/components/wren/InsightCard'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { PlatformGrid } from '@/components/import/PlatformGrid'
import { ImportHeader } from '@/components/import/ImportHeader'
import { ImportItemList } from '@/components/import/ImportItemList'
import type { ImportableItem } from '@/components/import/types'
import type { StatusFilter } from '@/components/import/ImportHeader'

// No hard cap — fetch all listings from the marketplace
const IMPORT_LIMIT = Infinity

export default function ImportPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const selectedPlatform = searchParams.get('platform') as Platform | null

  // Platform connection status (checks DB + extension cookies)
  const { connected: connectedPlatforms, loading: platformsLoading } = useConnectedPlatforms()

  // Platforms that have working import handlers
  const IMPORT_SUPPORTED: Platform[] = ['ebay', 'vinted', 'shopify', 'etsy', 'facebook', 'depop']

  // Import items state
  const [items, setItems] = useState<ImportableItem[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const shopifyRetriedRef = useRef(false)
  const [fetchedCount, setFetchedCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Extra metadata from Depop listings (keyed by listing ID)
  const [depopMeta, setDepopMeta] = useState<Map<string, {
    description?: string | null
    brand?: string | null
    condition?: string | null
    colour?: string | null
    photos?: string[]
    gender?: string | null
    group?: string | null
    productType?: string | null
  }>>(new Map())

  // Filters
  const [showOnlyNew, setShowOnlyNew] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Import state
  const vintedImport = useMarketplaceImport()

  // Load items when platform is selected
  useEffect(() => {
    if (!selectedPlatform || platformsLoading) return
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
    } else if (selectedPlatform === 'etsy') {
      loadEtsyListings()
    } else if (selectedPlatform === 'facebook') {
      loadFacebookListings()
    } else if (selectedPlatform === 'depop') {
      loadDepopListings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform, platformsLoading])

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

      // Helper to fetch a single page from the extension
      async function fetchVintedPage(pg: number) {
        return new Promise<{
          success: boolean
          listings?: Array<{
            id: string
            title: string
            price: number
            photo: string | null
            url: string | null
            isSold: boolean
            isHidden: boolean
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
            { action: 'get_vinted_listings', page: pg, perPage: 96, status: 'all' },
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
      }

      // Progressive page fetch
      let page = 1
      let totalPages = 1
      const allItems: ImportableItem[] = []

      while (page <= totalPages && allItems.length < IMPORT_LIMIT) {
        let response = await fetchVintedPage(page)

        // First page failed — retry once after 3s (Vinted session may still be refreshing)
        if (!response.success && page === 1) {
          console.log('[Import] Vinted first page failed, retrying in 3s...')
          setFetchError(null)
          await new Promise(resolve => setTimeout(resolve, 3000))
          response = await fetchVintedPage(page)
        }

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
          const status = l.isSold ? 'sold' as const : l.isHidden ? 'hidden' as const : 'active' as const
          allItems.push({
            id: l.id,
            platform: 'vinted',
            title: l.title,
            price: l.price,
            photo: l.photo,
            listingId: l.id,
            listingUrl: l.url,
            alreadyImported: importedSet.has(l.id),
            checked: !importedSet.has(l.id) && status === 'active',
            listingStatus: status,
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

    // Fetch store domain from API since useConnectedPlatforms doesn't carry it
    let storeDomain: string | undefined
    try {
      const res = await fetch('/api/shopify/connect')
      if (res.ok) {
        const data = await res.json()
        storeDomain = data.data?.storeDomain || undefined
      }
    } catch { /* fall through */ }
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
            created?: string | null
          }>
          nextPage?: string | null
          username?: string
          message?: string
        }>((resolve) => {
          const timeout = setTimeout(
            () => resolve({ success: false, message: 'Timed out fetching Shopify listings' }),
            60000
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
            const msg = response.message || 'Failed to fetch Shopify listings'
            const extensionDown = msg.includes('Could not establish connection') || msg.includes('No response')
            const needsLogin = msg.includes('Tokens not found') || msg.includes('Failed to fetch tokens') || msg.includes('valid Shopify')

            if (extensionDown) {
              setFetchError('Wrenlist extension is not responding. Open the extension popup to wake it up, then try again.')
              setIsFetching(false)
              return
            }

            if (needsLogin && !shopifyRetriedRef.current) {
              // Open Shopify admin in background tab so session cookies get set
              shopifyRetriedRef.current = true
              try {
                chrome.runtime.sendMessage(EXTENSION_ID, {
                  action: 'opentab',
                  url: `https://${storeDomain}/admin`,
                  focusTab: false,
                })
              } catch { /* extension may not support opentab */ }
              setFetchError(`Opening Shopify admin to refresh your session... please wait a moment then try again.`)
              setIsFetching(false)
              return
            }
            setFetchError(needsLogin
              ? `Please log in to your Shopify admin (${storeDomain}) in another tab, then try again.`
              : msg)
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
            platformListedAt: p.created || null,
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

  // --- Etsy (fetch via extension) ---
  async function loadEtsyListings() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setFetchError('Wrenlist extension required for Etsy import. Install it from the Chrome Web Store.')
      return
    }

    setIsFetching(true)
    setFetchedCount(0)

    try {
      // Get already-imported Etsy IDs
      const importedData = await fetchApi<{ importedIds: string[] }>(
        '/api/import/marketplace-imported?marketplace=etsy'
      )
      const importedSet = new Set(importedData.importedIds)

      // Progressive cursor-based fetch
      let cursor: string | undefined
      const allItems: ImportableItem[] = []

      // getAllListings returns everything in one call (no pagination needed)
      const response = await new Promise<{
        products?: Array<{
          marketplaceId: string
          title: string
          price: string | number | null
          coverImage: string | null
          created?: string | null
          marketplaceUrl: string | null
          isSold?: boolean
          isHidden?: boolean
          isExpired?: boolean
        }>
        nextPage?: string | null
        message?: string
        error?: string
      }>((resolve) => {
        const timeout = setTimeout(
          () => resolve({ message: 'Timed out fetching Etsy listings' }),
          60000 // longer timeout — fetches 3 states sequentially
        )
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          {
            action: 'get_marketplace_listings',
            marketplace: 'etsy',
            params: {
              status: 'all',
              perPage: 40,
            },
          },
          (resp) => {
            clearTimeout(timeout)
            if (chrome.runtime.lastError) {
              resolve({ message: chrome.runtime.lastError.message })
            } else {
              resolve(resp || { message: 'No response' })
            }
          }
        )
      })

      if (!response.products) {
        setFetchError(response.message || response.error || 'Failed to fetch Etsy listings')
        setIsFetching(false)
        return
      }

      for (const p of response.products) {
        const id = String(p.marketplaceId)
        const price = typeof p.price === 'string' ? parseFloat(p.price) : (p.price ?? null)
        const status = p.isSold ? 'sold' as const
          : p.isExpired ? 'expired' as const
          : p.isHidden ? 'draft' as const
          : 'active' as const
        allItems.push({
          id,
          platform: 'etsy',
          title: p.title || 'Untitled',
          price,
          photo: p.coverImage,
          listingId: id,
          listingUrl: p.marketplaceUrl,
          alreadyImported: importedSet.has(id),
          // Expired items unchecked by default — user must opt in
          checked: !importedSet.has(id) && status === 'active',
          listingStatus: status,
          platformListedAt: p.created || null,
        })
      }

      setItems(allItems)
      setTotalCount(allItems.length)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch Etsy listings')
    } finally {
      setIsFetching(false)
    }
  }

  // --- Facebook (fetch via extension GraphQL) ---
  async function loadFacebookListings() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setFetchError('Wrenlist extension required for Facebook import. Install it from the Chrome Web Store.')
      return
    }

    setIsFetching(true)
    setFetchedCount(0)

    try {
      // Get already-imported Facebook IDs
      const importedData = await fetchApi<{ importedIds: string[] }>(
        '/api/import/marketplace-imported?marketplace=facebook'
      )
      const importedSet = new Set(importedData.importedIds)

      // Progressive cursor-based fetch
      let cursor: string | undefined
      const allItems: ImportableItem[] = []

      while (allItems.length < IMPORT_LIMIT) {
        const response = await new Promise<{
          success?: boolean
          products?: Array<{
            marketplaceId: string
            title: string
            price: string | number | null
            coverImage: string | null
            marketplaceUrl: string | null
            created?: string | null
          }>
          nextPage?: string | null
          message?: string
        }>((resolve) => {
          const timeout = setTimeout(
            () => resolve({ success: false, message: 'Timed out fetching Facebook listings' }),
            30000
          )
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            {
              action: 'get_marketplace_listings',
              marketplace: 'facebook',
              params: {
                page: cursor,
                perPage: 50,
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

        // get_marketplace_listings returns { products, nextPage } without success flag
        if (!response.products) {
          if (allItems.length === 0) {
            setFetchError(response.message || 'Failed to fetch Facebook listings. Make sure you are logged in to facebook.com.')
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
            platform: 'facebook',
            title: p.title || 'Untitled',
            price,
            photo: p.coverImage,
            listingId: id,
            listingUrl: p.marketplaceUrl,
            alreadyImported: importedSet.has(id),
            checked: !importedSet.has(id),
            listingStatus: 'active',
            platformListedAt: p.created || null,
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
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch Facebook listings')
    } finally {
      setIsFetching(false)
    }
  }

  // --- Depop (fetch via extension API) ---
  async function loadDepopListings() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      setFetchError('Wrenlist extension required for Depop import. Install it from the Chrome Web Store.')
      return
    }

    setIsFetching(true)
    setFetchedCount(0)

    try {
      // Get already-imported Depop IDs
      const importedData = await fetchApi<{ importedIds: string[] }>(
        '/api/import/marketplace-imported?marketplace=depop'
      )
      const importedSet = new Set(importedData.importedIds)

      // Progressive cursor-based fetch
      let cursor: string | undefined
      const allItems: ImportableItem[] = []
      const meta = new Map<string, { description?: string | null; brand?: string | null; condition?: string | null; colour?: string | null; photos?: string[]; gender?: string | null; group?: string | null; productType?: string | null }>()

      while (allItems.length < IMPORT_LIMIT) {
        const response = await new Promise<{
          products?: Array<{
            marketplaceId: string
            title: string
            price: string | number | null
            coverImage: string | null
            photos?: string[]
            description?: string | null
            brand?: string | null
            condition?: string | null
            colour?: string | null
            gender?: string | null
            group?: string | null
            productType?: string | null
            created?: string | null
            marketplaceUrl: string | null
            status?: string
          }>
          nextPage?: string | null
          message?: string
        }>((resolve) => {
          const timeout = setTimeout(
            () => resolve({ message: 'Timed out fetching Depop listings' }),
            60000  // longer timeout — fetches selling + sold
          )
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            {
              action: 'get_marketplace_listings',
              marketplace: 'depop',
              params: {
                page: cursor,
                perPage: 200,
                status: 'all',
              },
            },
            (resp) => {
              clearTimeout(timeout)
              if (chrome.runtime.lastError) {
                resolve({ message: chrome.runtime.lastError.message })
              } else {
                resolve(resp || { message: 'No response' })
              }
            }
          )
        })

        // get_marketplace_listings returns { products, nextPage } without success flag
        if (!response.products) {
          if (allItems.length === 0) {
            setFetchError(response.message || 'Failed to fetch Depop listings. Make sure you are logged in to depop.com.')
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
          const listingStatus = p.status === 'sold' ? 'sold' as const
            : p.status === 'draft' ? 'draft' as const
            : 'active' as const
          allItems.push({
            id,
            platform: 'depop',
            title: p.title || 'Untitled',
            price,
            photo: p.coverImage,
            listingId: id,
            listingUrl: p.marketplaceUrl,
            alreadyImported: importedSet.has(id),
            checked: !importedSet.has(id) && listingStatus === 'active',
            listingStatus,
            platformListedAt: p.created || null,
          })
          // Store enrichment data
          meta.set(id, {
            description: p.description,
            brand: p.brand,
            condition: p.condition,
            colour: p.colour,
            photos: p.photos,
            gender: p.gender,
            group: p.group,
            productType: p.productType,
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
      setDepopMeta(meta)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to fetch Depop listings')
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
      // Build set of currently visible item IDs
      const visibleIds = new Set(
        prev.filter((item) => {
          if (showOnlyNew && item.alreadyImported) return false
          if (statusFilter !== 'all' && item.listingStatus !== statusFilter) return false
          if (searchQuery) {
            if (!item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
          }
          return true
        }).map((i) => i.id)
      )
      // Only toggle items that are both visible and selectable
      const visibleSelectable = prev.filter((i) => visibleIds.has(i.id) && !i.alreadyImported)
      const allChecked = visibleSelectable.every((i) => i.checked)
      return prev.map((item) =>
        visibleIds.has(item.id) && !item.alreadyImported
          ? { ...item, checked: !allChecked }
          : item
      )
    })
  }, [showOnlyNew, statusFilter, searchQuery])

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
  const selectedCount = filteredItems.filter((i) => i.checked && !i.alreadyImported).length

  // --- Import actions ---
  const isImporting = vintedImport.state.phase === 'importing' || vintedImport.state.phase === 'fetching'

  async function handleImport() {
    if (!selectedPlatform || selectedCount === 0) return

    if (selectedPlatform === 'ebay') {
      await handleEbayImport()
    } else if (selectedPlatform === 'vinted') {
      // Check if any selected items are sold — use sales flow for those
      const selectedItems = items.filter((i) => i.checked && !i.alreadyImported)
      const hasSoldItems = selectedItems.some((i) => i.listingStatus === 'sold')
      const hasActiveItems = selectedItems.some((i) => i.listingStatus === 'active' || i.listingStatus === 'hidden')

      if (hasActiveItems && hasSoldItems) {
        // Mixed — import active first, then sold
        await handleVintedImport()
        await handleVintedSoldImport()
      } else if (hasSoldItems) {
        await handleVintedSoldImport()
      } else {
        await handleVintedImport()
      }
    } else if (selectedPlatform === 'shopify') {
      await handleShopifyImport()
    } else if (selectedPlatform === 'etsy') {
      const selectedItems = items.filter((i) => i.checked && !i.alreadyImported)
      const hasSoldItems = selectedItems.some((i) => i.listingStatus === 'sold')
      const hasActiveItems = selectedItems.some((i) => i.listingStatus !== 'sold')

      if (hasActiveItems) await handleEtsyImport()
      if (hasSoldItems) await handleEtsySoldImport()
    } else if (selectedPlatform === 'facebook') {
      await handleFacebookImport()
    } else if (selectedPlatform === 'depop') {
      const selectedItems = items.filter((i) => i.checked && !i.alreadyImported)
      const hasSoldItems = selectedItems.some((i) => i.listingStatus === 'sold')
      const hasActiveItems = selectedItems.some((i) => i.listingStatus !== 'sold')
      if (hasActiveItems) await handleDepopImport()
      if (hasSoldItems) await handleDepopSoldImport()
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

    const CHUNK_SIZE = 50
    const totalItems = selectedIds.length
    let totalImported = 0, totalSkipped = 0, totalErrors = 0
    let consecutiveFailures = 0

    vintedImport.runImportProgress(0, 0, 0, totalItems)

    try {
      for (let i = 0; i < selectedIds.length; i += CHUNK_SIZE) {
        const chunk = selectedIds.slice(i, i + CHUNK_SIZE)
        const chunkNum = Math.floor(i / CHUNK_SIZE) + 1
        const totalChunks = Math.ceil(selectedIds.length / CHUNK_SIZE)

        console.log(`[Import] Chunk ${chunkNum}/${totalChunks} — ${chunk.length} items`)

        const response = await new Promise<{
          success: boolean
          message?: string
          results?: { success: number; skipped: number; errors: number; total: number }
        }>((resolve) => {
          const timeout = setTimeout(
            () => resolve({ success: false, message: `Chunk ${chunkNum} timed out` }),
            360000
          )
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            {
              action: 'batch_import_vinted',
              listingIds: chunk,
              limit: chunk.length,
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

        if (response.success && response.results) {
          totalImported += response.results.success || 0
          totalSkipped += response.results.skipped || 0
          totalErrors += response.results.errors || 0
          consecutiveFailures = 0
        } else {
          // Chunk failed — count all items as errors but continue with next chunk
          console.warn(`[Import] Chunk ${chunkNum} failed: ${response.message}`)
          totalErrors += chunk.length
          consecutiveFailures++

          // Stop early on auth failures — Vinted session expired
          if ((response as { needsLogin?: boolean }).needsLogin) {
            vintedImport.setError('Vinted session expired. Please visit vinted.co.uk, then try again.')
            return
          }

          // Stop after 2 consecutive chunk failures — something systemic is wrong
          if (consecutiveFailures >= 2) {
            vintedImport.setDone(totalImported, totalSkipped, totalErrors, totalItems)
            return
          }
        }

        vintedImport.runImportProgress(totalImported, totalSkipped, totalErrors, totalItems)

        // Refresh imported status so list updates live
        try {
          const importedData = await fetchApi<{ importedIds: string[] }>('/api/import/vinted-imported')
          const importedSet = new Set(importedData.importedIds)
          setItems((prev) => prev.map((item) => ({
            ...item,
            alreadyImported: importedSet.has(item.id),
            checked: importedSet.has(item.id) ? false : item.checked,
          })))
        } catch { /* non-fatal */ }
      }

      vintedImport.setDone(totalImported, totalSkipped, totalErrors, totalItems)
    } catch (err) {
      vintedImport.setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  async function handleVintedSoldImport() {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      vintedImport.setError('Extension not available')
      return
    }

    const soldItems = items.filter((i) => i.checked && !i.alreadyImported && i.listingStatus === 'sold')
    if (soldItems.length === 0) return

    const totalItems = soldItems.length
    let totalSynced = 0, totalSkipped = 0, totalCreated = 0, totalErrors = 0

    vintedImport.runImportProgress(0, 0, 0, totalItems)

    try {
      // Import sold items using wardrobe data we already have (title, price, photo)
      // Rich sale data (buyer, fees, tracking) can be enriched later via getSales cron sync
      const CHUNK_SIZE = 50
      for (let i = 0; i < soldItems.length; i += CHUNK_SIZE) {
        const chunk = soldItems.slice(i, i + CHUNK_SIZE)

        const basicSales = chunk.map((item) => ({
          transactionId: `wardrobe_${item.id}`,
          grossAmount: item.price || 0,
          serviceFee: 0,
          netAmount: item.price || 0,
          currency: 'GBP',
          items: [{
            itemId: item.id,
            title: item.title,
            price: item.price || 0,
            thumbnailUrl: item.photo,
            itemUrl: item.listingUrl,
          }],
          isBundle: false,
          itemCount: 1,
          orderDate: null,
        }))

        try {
          const res = await fetch('/api/vinted/sync-sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sales: basicSales }),
          })

          if (res.ok) {
            const data = await res.json()
            const result = data.data || data
            totalSynced += result.synced || 0
            totalSkipped += result.skipped || 0
            totalCreated += result.created || 0
            totalErrors += result.errors || 0
          } else {
            totalErrors += chunk.length
          }
        } catch {
          totalErrors += chunk.length
        }

        vintedImport.runImportProgress(totalSynced + totalCreated, totalSkipped, totalErrors, totalItems)

        // Refresh imported status so list updates live
        try {
          const importedData = await fetchApi<{ importedIds: string[] }>('/api/import/vinted-imported')
          const importedSet = new Set(importedData.importedIds)
          setItems((prev) => prev.map((item) => ({
            ...item,
            alreadyImported: importedSet.has(item.id),
            checked: importedSet.has(item.id) ? false : item.checked,
          })))
        } catch { /* non-fatal */ }
      }

      vintedImport.setDone(totalSynced + totalCreated, totalSkipped, totalErrors, totalItems)
    } catch (err) {
      vintedImport.setError(err instanceof Error ? err.message : 'Sold import failed')
    }
  }

  async function handleEtsyImport() {
    const selected = items.filter((i) => i.checked && !i.alreadyImported && i.listingStatus !== 'sold')
    if (selected.length === 0) return

    vintedImport.setFetching('Importing Etsy listings...')

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
                marketplace: 'etsy',
                marketplaceProductId: item.id,
                productData: {
                  title: item.title,
                  price: item.price,
                  coverImage: item.photo,
                  marketplaceUrl: item.listingUrl,
                },
                url: item.listingUrl,
                platformListedAt: item.platformListedAt || null,
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
      await loadEtsyListings()
    } catch (err) {
      vintedImport.setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  async function handleEtsySoldImport() {
    const soldItems = items.filter((i) => i.checked && !i.alreadyImported && i.listingStatus === 'sold')
    if (soldItems.length === 0) return

    const totalItems = soldItems.length
    let totalSynced = 0, totalSkipped = 0, totalCreated = 0, totalErrors = 0

    vintedImport.setFetching('Fetching Etsy order details...')

    // Build a set of selected listing IDs for matching
    const selectedIds = new Set(soldItems.map((i) => i.id))

    // Fetch receipts from Etsy orders page (paginate until we've matched all selected items)
    type EtsyReceipt = {
      orderId: number; orderDate: string | null; buyer: {
        id: string; name: string | null; email: string | null; username: string | null
      } | null;
      grossAmount: number | null; shippingCost: number | null; netAmount: number | null;
      taxAmount: number | null; discount: number | null; refundAmount: number | null;
      buyerPaid: number | null;
      currency: string; paymentMethod: string | null; shippingMethod: string | null;
      trackingNumber: string | null; carrier: string | null; deliveryStatus: string | null;
      isGift: boolean; giftMessage: string | null;
      shippingAddress: {
        name: string | null; firstLine: string | null; secondLine: string | null;
        city: string | null; state: string | null; country: string | null; zip: string | null;
      } | null;
      items: Array<{
        transactionId: string; listingId: string; title: string | null;
        imageUrl: string | null; cost: number | null; quantity: number;
        isCancelled: boolean;
        review: { rating: number; text: string | null; date: string | null; url: string | null } | null;
      }>;
      isCanceled: boolean; listingIds: string[]; transactionIds: number[]
    }
    const matchedReceipts = new Map<string, EtsyReceipt>() // listingId → receipt

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      let pg = 1
      const maxPages = 20
      while (pg <= maxPages) {
        const receiptResp = await new Promise<{
          orders?: EtsyReceipt[]; totalPages?: number
        }>((resolve) => {
          const t = setTimeout(() => resolve({}), 30000)
          chrome.runtime.sendMessage(
            EXTENSION_ID,
            { action: 'get_etsy_receipts', params: { page: pg } },
            (resp) => {
              clearTimeout(t)
              if (chrome.runtime.lastError) resolve({})
              else resolve(resp || {})
            }
          )
        })

        const orders = receiptResp.orders || []
        if (orders.length === 0) break

        for (const order of orders) {
          for (const lid of order.listingIds || []) {
            if (selectedIds.has(lid) && !matchedReceipts.has(lid)) {
              matchedReceipts.set(lid, order)
            }
          }
        }

        // Stop if we've matched all selected items or no more pages
        if (matchedReceipts.size >= selectedIds.size) break
        if (orders.length < 20) break // last page
        pg++
      }
    }

    vintedImport.runImportProgress(0, 0, 0, totalItems)

    try {
      const CHUNK_SIZE = 50
      for (let i = 0; i < soldItems.length; i += CHUNK_SIZE) {
        const chunk = soldItems.slice(i, i + CHUNK_SIZE)

        const enrichedSales = chunk.map((item) => {
          const receipt = matchedReceipts.get(item.id)
          return {
            receiptId: receipt ? String(receipt.orderId) : `import_${item.id}`,
            grossAmount: receipt?.grossAmount ?? item.price ?? 0,
            shippingCost: receipt?.shippingCost ?? null,
            taxAmount: receipt?.taxAmount ?? null,
            discount: receipt?.discount ?? null,
            refundAmount: receipt?.refundAmount ?? null,
            buyerPaid: receipt?.buyerPaid ?? null,
            netAmount: receipt?.netAmount ?? item.price ?? 0,
            currency: receipt?.currency || 'GBP',
            buyer: receipt?.buyer || null,
            orderDate: receipt?.orderDate || null,
            isGift: receipt?.isGift || false,
            giftMessage: receipt?.giftMessage || null,
            items: [{
              itemId: item.id,
              title: item.title,
              price: receipt?.grossAmount ?? item.price ?? 0,
              thumbnailUrl: item.photo,
              itemUrl: item.listingUrl,
            }],
            // Rich per-item data from receipt (reviews, per-item costs)
            receiptItems: receipt?.items || [],
            trackingNumber: receipt?.trackingNumber || null,
            carrier: receipt?.carrier || null,
            deliveryStatus: receipt?.deliveryStatus || null,
            shippingAddress: receipt?.shippingAddress || null,
            isBundle: (receipt?.listingIds?.length || 1) > 1,
            itemCount: receipt?.listingIds?.length || 1,
          }
        })

        try {
          const res = await fetch('/api/etsy/sync-sales', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sales: enrichedSales }),
          })

          if (res.ok) {
            const data = await res.json()
            const result = data.data || data
            totalSynced += result.synced || 0
            totalSkipped += result.skipped || 0
            totalCreated += result.created || 0
            totalErrors += result.errors || 0
          } else {
            totalErrors += chunk.length
          }
        } catch {
          totalErrors += chunk.length
        }

        vintedImport.runImportProgress(totalSynced + totalCreated, totalSkipped, totalErrors, totalItems)

        // Refresh imported status
        try {
          const importedData = await fetchApi<{ importedIds: string[] }>('/api/import/marketplace-imported?marketplace=etsy')
          const importedSet = new Set(importedData.importedIds)
          setItems((prev) => prev.map((item) => ({
            ...item,
            alreadyImported: importedSet.has(item.id),
            checked: importedSet.has(item.id) ? false : item.checked,
          })))
        } catch { /* non-fatal */ }
      }

      vintedImport.setDone(totalSynced + totalCreated, totalSkipped, totalErrors, totalItems)
    } catch (err) {
      vintedImport.setError(err instanceof Error ? err.message : 'Sold import failed')
    }
  }

  /** Fetch rich listing detail from extension (photos, description, brand, condition, etc.) */
  function fetchFacebookListingDetail(listingId: string): Promise<{
    title?: string
    description?: string
    cover?: string
    images?: string[]
    brand?: string
    condition?: string
    color?: string
    size?: string[]
    price?: number
    category?: string[]
  } | null> {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
        resolve(null)
        return
      }
      const timeout = setTimeout(() => resolve(null), 15000)
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          action: 'get_marketplace_listing',
          marketplace: 'facebook',
          params: { id: listingId, marketplace: 'facebook' },
        },
        (resp) => {
          clearTimeout(timeout)
          if (chrome.runtime.lastError || !resp) {
            resolve(null)
          } else {
            resolve(resp)
          }
        }
      )
    })
  }

  async function handleFacebookImport() {
    const selected = items.filter((i) => i.checked && !i.alreadyImported)
    if (selected.length === 0) return

    vintedImport.setFetching('Enriching Facebook listings...')

    let imported = 0
    let skipped = 0
    let errors = 0

    try {
      for (const item of selected) {
        try {
          // Enrich with detail call to get all photos, description, brand, condition
          const detail = await fetchFacebookListingDetail(item.id)

          // Build photo list: cover + additional images from detail
          const allPhotos: string[] = []
          if (detail?.cover) allPhotos.push(detail.cover)
          if (detail?.images?.length) {
            for (const img of detail.images) {
              if (img && !allPhotos.includes(img)) allPhotos.push(img)
            }
          }
          // Fallback to feed thumbnail if detail fetch failed
          if (allPhotos.length === 0 && item.photo) allPhotos.push(item.photo)

          const result = await fetchApi<{ success?: boolean; skipped?: boolean; findId?: string }>(
            '/api/import/marketplace-item',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                marketplace: 'facebook',
                marketplaceProductId: item.id,
                productData: {
                  title: detail?.title || item.title,
                  description: detail?.description || null,
                  price: detail?.price ?? item.price,
                  coverImage: allPhotos[0] || null,
                  photos: allPhotos.slice(1),
                  marketplaceUrl: item.listingUrl,
                  brand: detail?.brand || null,
                  condition: detail?.condition || null,
                  colour: detail?.color || null,
                  size: detail?.size?.[0] || null,
                  category: detail?.category?.[0] || null,
                },
                url: item.listingUrl,
                platformListedAt: item.platformListedAt || null,
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
      await loadFacebookListings()
    } catch (err) {
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
                platformListedAt: item.platformListedAt || null,
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

  async function handleDepopImport() {
    const selected = items.filter((i) => i.checked && !i.alreadyImported)
    if (selected.length === 0) return

    vintedImport.setFetching('Importing Depop listings...')

    let imported = 0
    let skipped = 0
    let errors = 0

    try {
      for (let idx = 0; idx < selected.length; idx++) {
        const item = selected[idx]!
        try {
          // Use enrichment data captured during loadDepopListings
          const meta = depopMeta.get(item.id)

          // Build category from Depop's gender/group/productType
          let category: string | null = null
          if (meta?.group && meta?.productType) {
            const gender = meta.gender === 'female' ? 'womenswear'
              : meta.gender === 'male' ? 'menswear' : 'everything-else'
            category = `${gender}|${meta.group}|${meta.productType}`
          }

          const result = await fetchApi<{ success?: boolean; skipped?: boolean; findId?: string }>(
            '/api/import/marketplace-item',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                marketplace: 'depop',
                marketplaceProductId: item.id,
                productData: {
                  title: item.title,
                  description: meta?.description || null,
                  price: item.price,
                  coverImage: item.photo,
                  photos: meta?.photos?.length ? meta.photos : undefined,
                  brand: meta?.brand || null,
                  condition: meta?.condition || null,
                  category,
                  colour: meta?.colour || null,
                  marketplaceUrl: item.listingUrl,
                },
                url: item.listingUrl,
                platformListedAt: item.platformListedAt || null,
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

        // Polite delay every 3 items to avoid Depop rate limiting
        if (idx > 0 && idx % 3 === 0) {
          await new Promise(r => setTimeout(r, 500))
        }
      }

      vintedImport.setDone(imported, skipped, errors, selected.length)

      // Refresh list
      await loadDepopListings()
    } catch (err) {
      vintedImport.setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  async function handleDepopSoldImport() {
    const soldItems = items.filter((i) => i.checked && !i.alreadyImported && i.listingStatus === 'sold')
    if (soldItems.length === 0) return

    vintedImport.setFetching('Importing sold Depop listings...')

    let imported = 0
    let skipped = 0
    let errors = 0

    try {
      for (const item of soldItems) {
        try {
          const meta = depopMeta.get(item.id)
          let category: string | null = null
          if (meta?.group && meta?.productType) {
            const gender = meta.gender === 'female' ? 'womenswear'
              : meta.gender === 'male' ? 'menswear' : 'everything-else'
            category = `${gender}|${meta.group}|${meta.productType}`
          }

          const result = await fetchApi<{ success?: boolean; skipped?: boolean }>(
            '/api/import/marketplace-item',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                marketplace: 'depop',
                marketplaceProductId: item.id,
                productData: {
                  title: item.title,
                  description: meta?.description || null,
                  price: item.price,
                  coverImage: item.photo,
                  photos: meta?.photos?.length ? meta.photos : undefined,
                  brand: meta?.brand || null,
                  condition: meta?.condition || null,
                  category,
                  colour: meta?.colour || null,
                  marketplaceUrl: item.listingUrl,
                  status: 'sold',
                },
                url: item.listingUrl,
                platformListedAt: item.platformListedAt || null,
              }),
            }
          )

          if (result.skipped) skipped++
          else imported++
        } catch {
          errors++
        }

        vintedImport.runImportProgress(imported, skipped, errors, soldItems.length)
      }

      vintedImport.setDone(imported, skipped, errors, soldItems.length)
      await loadDepopListings()
    } catch (err) {
      vintedImport.setError(err instanceof Error ? err.message : 'Sold import failed')
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
    // Show platform-specific connecting state if user navigated directly with ?platform=
    const connectingPlatform = selectedPlatform ? formatPlatformName(selectedPlatform) : null
    return (
      <div className="space-y-6">
        {connectingPlatform ? (
          <div className="bg-white border border-sage/14 rounded-md p-6 flex items-center gap-3">
            <div className="h-4 w-4 border-2 border-sage border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-ink-lt">Connecting to {connectingPlatform}...</span>
          </div>
        ) : (
          <div className="text-sm text-ink-lt animate-pulse">Loading platforms...</div>
        )}
      </div>
    )
  }

  // Platform selection view (no platform selected)
  if (!selectedPlatform) {
    return (
      <div className="space-y-6">
        <PlatformGrid connected={connectedPlatforms} loading={platformsLoading} onSelectPlatform={selectPlatform} />
      </div>
    )
  }

  const isConnected = connectedPlatforms.some((c) => c.platform === selectedPlatform)
  const hasImportHandler = IMPORT_SUPPORTED.includes(selectedPlatform)

  // Not connected — prompt to connect
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="text-sm text-ink-lt hover:text-ink transition">
            ← back
          </button>
        </div>
        <div className="bg-white border border-sage/14 rounded-md p-8 text-center">
          <p className="text-sm text-ink-lt mb-4">
            Connect {formatPlatformName(selectedPlatform)} to import your listings
          </p>
          <a
            href="/platform-connect"
            className="inline-block px-4 py-2 text-sm font-medium bg-sage text-white rounded hover:bg-sage-dk transition"
          >
            Connect {formatPlatformName(selectedPlatform)} →
          </a>
        </div>
      </div>
    )
  }

  // Connected but no import handler yet — coming soon
  if (!hasImportHandler) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="text-sm text-ink-lt hover:text-ink transition">
            ← back
          </button>
        </div>
        <div className="bg-white border border-sage/14 rounded-md p-8 text-center">
          <p className="text-sm font-medium text-ink mb-2">
            {formatPlatformName(selectedPlatform)} import coming soon
          </p>
          <p className="text-sm text-ink-lt">
            We&apos;re working on importing from {formatPlatformName(selectedPlatform)}. In the meantime, you can import from eBay, Vinted, or Shopify.
          </p>
        </div>
      </div>
    )
  }

  // --- Post-import completion view ---
  if (vintedImport.state.phase === 'done') {
    const { imported, skipped, errors } = vintedImport.state
    const allSkipped = imported === 0 && skipped > 0 && errors === 0
    return (
      <div className="space-y-4">
        {/* Minimal header */}
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="text-sm text-ink-lt hover:text-ink transition">
            ← back
          </button>
          <MarketplaceIcon platform={selectedPlatform} size="lg" />
          <h1 className="text-lg font-serif italic text-ink">
            import from {formatPlatformName(selectedPlatform)}
          </h1>
        </div>

        {/* Success card */}
        <div className="bg-white border border-sage/14 rounded-md p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50">
            <span className="text-2xl text-green-600">✓</span>
          </div>
          <div>
            <h2 className="text-lg font-medium text-ink">
              {allSkipped
                ? 'All listings already in Wrenlist'
                : `${imported} find${imported !== 1 ? 's' : ''} imported`}
            </h2>
            <div className="flex items-center justify-center gap-3 mt-1 text-sm text-ink-lt">
              {!allSkipped && skipped > 0 && <span>{skipped} already in Wren</span>}
              {errors > 0 && <span className="text-amber-600">{errors} error{errors !== 1 ? 's' : ''}</span>}
            </div>
          </div>
          <p className="text-sm text-ink-lt max-w-md mx-auto">
            {allSkipped
              ? 'Nothing new to import — your inventory is up to date.'
              : 'Your listings are now in Wrenlist. Add cost prices for accurate margin tracking.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <a
              href="/finds"
              className="px-5 py-2.5 text-sm font-medium bg-sage text-white rounded hover:bg-sage-dk transition"
            >
              View your finds →
            </a>
            <button
              onClick={() => {
                vintedImport.reset()
                // Re-fetch to show updated imported status
                if (selectedPlatform === 'ebay') loadEbayInventory()
                else if (selectedPlatform === 'vinted') loadVintedListings()
                else if (selectedPlatform === 'shopify') loadShopifyListings()
                else if (selectedPlatform === 'etsy') loadEtsyListings()
                else if (selectedPlatform === 'facebook') loadFacebookListings()
                else if (selectedPlatform === 'depop') loadDepopListings()
              }}
              className="px-5 py-2.5 text-sm font-medium bg-cream-md text-ink rounded hover:bg-cream-dk transition"
            >
              Import more
            </button>
          </div>
        </div>
      </div>
    )
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
