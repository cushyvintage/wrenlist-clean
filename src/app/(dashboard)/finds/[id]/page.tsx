'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { useRouter, useParams } from 'next/navigation'
import PhotoUpload from '@/components/listing/PhotoUpload'
import TemplatePickerPopover from '@/components/templates/TemplatePickerPopover'
import SaveAsTemplateInput from '@/components/templates/SaveAsTemplateInput'
import MarkAsSoldModal from '@/components/inventory/MarkAsSoldModal'
import InventoryItemHeader from '@/components/inventory/InventoryItemHeader'
import DeleteConfirmModal from '@/components/inventory/DeleteConfirmModal'
import VintedMetadataPanel from '@/components/inventory/VintedMetadataPanel'
import { VINTED_COLORS } from '@/data/vinted-colors'
import type { VintedStoredMetadata } from '@/types/vinted-metadata'
import { CATEGORY_MAP } from '@/data/marketplace-category-map'
import { applyTemplate } from '@/lib/templates/apply-template'
import type { Find, FindCondition, Platform, ListingTemplate } from '@/types'
import type { ListingFormData } from '@/types/listing-form'
import { useExtensionInfo } from '@/hooks/useExtensionInfo'
import { useConnectedPlatforms, type ConnectedPlatform } from '@/hooks/useConnectedPlatforms'
import { crosslistFind, CROSSLIST_BLOCKED_STATUSES } from '@/lib/crosslist'

interface PlatformFieldsData {
  vinted?: {
    primaryColor?: number
    secondaryColor?: number
    conditionDescription?: string
    material?: number[]
  }
  ebay?: {
    acceptOffers?: boolean
    isAuction?: boolean
  }
}

interface FormData {
  title: string
  description: string
  category: string
  price: number | null
  brand: string
  condition: FindCondition
  quantity: number
  photos: File[]
  photoPreviews: string[]
  selectedPlatforms: Platform[]
  platformFields: PlatformFieldsData
  shippingWeight: number | null
  shippingDimensions: {
    length: number | null
    width: number | null
    height: number | null
  }
  sku: string
  costPrice: number | null
  internalNote: string
  platformPrices: Partial<Record<Platform, number | null>>
}

const CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'new_with_tags', label: 'New with tags' },
  { value: 'new_without_tags', label: 'New without tags / Like new' },
  { value: 'very_good', label: 'Very good' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
]

const CANONICAL_CATEGORIES = Object.keys(CATEGORY_MAP)
  .sort()
  .map((key) => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) }))

export default function InventoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [find, setFind] = useState<Find | null>(null)
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    price: null,
    brand: '',
    condition: 'good',
    quantity: 1,
    photos: [],
    photoPreviews: [],
    selectedPlatforms: [],
    platformFields: {},
    shippingWeight: null,
    shippingDimensions: { length: null, width: null, height: null },
    sku: '',
    costPrice: null,
    internalNote: '',
    platformPrices: { vinted: null, ebay: null, etsy: null, shopify: null },
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [markSoldConfirm, setMarkSoldConfirm] = useState(false)
  const [markSoldData, setMarkSoldData] = useState({ price: '', date: '' })
  const [showPriceOverrides, setShowPriceOverrides] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)
  const [templateAppliedBanner, setTemplateAppliedBanner] = useState(false)
  const [incompleteFields, setIncompleteFields] = useState<string[]>([])
  const [isListingOnVinted, setIsListingOnVinted] = useState(false)
  const [vintedListResult, setVintedListResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null)
  const [isListingOnEbay, setIsListingOnEbay] = useState(false)
  const [ebayListResult, setEbayListResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [marketplaceData, setMarketplaceData] = useState<Array<{ marketplace: string; status: string; platform_listing_url: string | null; platform_listing_id: string | null; error_message: string | null }>>([])
  const [delistingPlatform, setDelistingPlatform] = useState<string | null>(null)
  const [delistConfirm, setDelistConfirm] = useState<string | null>(null)
  const [retryingPlatform, setRetryingPlatform] = useState<string | null>(null)
  const [isCrosslisting, setIsCrosslisting] = useState(false)
  const [crosslistResult, setCrosslistResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showCrosslistPicker, setShowCrosslistPicker] = useState(false)
  const [crosslistTargets, setCrosslistTargets] = useState<Platform[]>([])
  const extensionInfo = useExtensionInfo()
  const { connected: allConnectedPlatforms, recheckPlatforms } = useConnectedPlatforms()

  // Fetch find details
  useEffect(() => {
    async function fetchFind() {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch(`/api/finds/${id}`)
        if (!res.ok) throw new Error('Failed to load find')
        const result = await res.json()
        const data = result.data as Find

        setFind(data)

        // Pre-populate form
        const platforms = Object.keys(data.platform_fields || {}).filter(
          (p) => p === 'vinted' || p === 'ebay' || p === 'etsy' || p === 'shopify'
        ) as Platform[]

        setFormData({
          title: data.name || '',
          description: data.description || '',
          category: data.category || '',
          price: data.asking_price_gbp,
          brand: data.brand || '',
          condition: data.condition || 'good',
          quantity: 1,
          photos: [],
          photoPreviews: data.photos || [],
          selectedPlatforms: platforms.length > 0 ? platforms : [],
          platformFields: (data.platform_fields as any) || {},
          shippingWeight: null,
          shippingDimensions: { length: null, width: null, height: null },
          sku: data.sku || '',
          costPrice: data.cost_gbp,
          internalNote: '',
          platformPrices: {
            vinted: null,
            ebay: null,
            etsy: null,
            shopify: null,
          },
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) fetchFind()
  }, [id])

  // Fetch marketplace data from product_marketplace_data
  const refreshMarketplaceData = useCallback(() => {
    if (!id) return
    fetch(`/api/finds/${id}/marketplace`)
      .then((res) => res.ok ? res.json() : null)
      .then((result) => {
        if (result?.data) setMarketplaceData(result.data)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    refreshMarketplaceData()
  }, [refreshMarketplaceData])

  // Auto-refresh marketplace data while items are queued / delisting
  const hasPendingMarketplace = marketplaceData.some(
    (m) => m.status === 'needs_publish' || m.status === 'needs_delist'
  )
  const marketplacePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevMarketplaceDataRef = useRef(marketplaceData)

  useEffect(() => {
    if (hasPendingMarketplace) {
      marketplacePollRef.current = setInterval(refreshMarketplaceData, 5000)
    }
    return () => {
      if (marketplacePollRef.current) clearInterval(marketplacePollRef.current)
    }
  }, [hasPendingMarketplace, refreshMarketplaceData])

  // Detect when a queued item transitions to listed and show success message
  useEffect(() => {
    const prev = prevMarketplaceDataRef.current
    const justPublished: string[] = []
    for (const curr of marketplaceData) {
      const old = prev.find((p) => p.marketplace === curr.marketplace)
      if (old?.status === 'needs_publish' && curr.status === 'listed') {
        justPublished.push(curr.marketplace)
      }
    }
    if (justPublished.length > 0) {
      setCrosslistResult({ ok: true, message: `Published to ${justPublished.join(', ')}` })
    }
    prevMarketplaceDataRef.current = marketplaceData
  }, [marketplaceData])

  const handleCrosslist = async () => {
    if (!find || crosslistTargets.length === 0) return
    setIsCrosslisting(true)
    setCrosslistResult(null)

    try {
      const outcome = await crosslistFind(find.id, crosslistTargets, recheckPlatforms)
      setCrosslistResult({ ok: outcome.ok, message: outcome.message })
      setShowCrosslistPicker(false)
      setCrosslistTargets([])
      refreshMarketplaceData()
    } catch (err) {
      setCrosslistResult({ ok: false, message: err instanceof Error ? err.message : 'Crosslist failed' })
    } finally {
      setIsCrosslisting(false)
    }
  }

  const listedMarketplaces = new Set(marketplaceData.filter((m) => CROSSLIST_BLOCKED_STATUSES.has(m.status)).map((m) => m.marketplace))
  const availableForCrosslist: Platform[] = allConnectedPlatforms.map((cp) => cp.platform).filter((m) => !listedMarketplaces.has(m))
  const connectedPlatformMap = new Map(allConnectedPlatforms.map((cp) => [cp.platform, cp]))

  const handleInputChange = useCallback((field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  // Convert inventory FormData to ListingFormData for template operations
  const formDataToListingFormData = useCallback((): ListingFormData => {
    return {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      price: formData.price,
      brand: formData.brand,
      condition: formData.condition,
      quantity: formData.quantity,
      photos: formData.photos,
      photoPreviews: formData.photoPreviews,
      selectedPlatforms: formData.selectedPlatforms,
      platformFields: formData.platformFields,
      shippingWeight: formData.shippingWeight,
      shippingDimensions: formData.shippingDimensions,
      sku: formData.sku,
      costPrice: formData.costPrice,
      internalNote: formData.internalNote,
      platformPrices: formData.platformPrices,
    }
  }, [formData])

  // Apply template to form data
  const handleApplyTemplate = useCallback((template: ListingTemplate) => {
    const listingFormData = formDataToListingFormData()
    const { merged, incompleteRequiredFields } = applyTemplate(template, listingFormData)

    setFormData({
      title: merged.title,
      description: merged.description,
      category: merged.category,
      price: merged.price,
      brand: merged.brand,
      condition: merged.condition,
      quantity: merged.quantity,
      photos: merged.photos,
      photoPreviews: merged.photoPreviews,
      selectedPlatforms: merged.selectedPlatforms,
      platformFields: merged.platformFields,
      shippingWeight: merged.shippingWeight,
      shippingDimensions: merged.shippingDimensions,
      sku: merged.sku,
      costPrice: merged.costPrice,
      internalNote: merged.internalNote,
      platformPrices: merged.platformPrices,
    })

    setIncompleteFields(incompleteRequiredFields)
    setTemplateAppliedBanner(true)
    setTimeout(() => setTemplateAppliedBanner(false), 3000)
  }, [formDataToListingFormData])

  const handlePlatformToggle = useCallback((platform: Platform) => {
    setFormData((prev) => {
      const platforms = prev.selectedPlatforms.includes(platform)
        ? prev.selectedPlatforms.filter((p) => p !== platform)
        : [...prev.selectedPlatforms, platform]
      return {
        ...prev,
        selectedPlatforms: platforms,
      }
    })
  }, [])

  const handleAddPhotos = useCallback((files: File[]) => {
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...files],
      photoPreviews: [
        ...prev.photoPreviews,
        ...files.map((f) => URL.createObjectURL(f)),
      ],
    }))
  }, [])

  const handleReplacePhotos = useCallback((files: File[], previews: string[]) => {
    setFormData((prev) => ({ ...prev, photos: files, photoPreviews: previews }))
  }, [])

  const handleRemovePhoto = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoPreviews: prev.photoPreviews.filter((_, i) => i !== index),
    }))
  }, [])

  const handleReorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: arrayMove(prev.photos, fromIndex, toIndex),
      photoPreviews: arrayMove(prev.photoPreviews, fromIndex, toIndex),
    }))
  }, [])

  const handleSetMainPhoto = useCallback((index: number) => {
    setFormData((prev) => {
      const newPreviews = arrayMove(prev.photoPreviews, index, 0)
      // Fire-and-forget DB save with updated photo order
      if (id) {
        fetch(`/api/finds/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: newPreviews }),
        }).catch(() => {})
      }
      return {
        ...prev,
        photos: arrayMove(prev.photos, index, 0),
        photoPreviews: newPreviews,
      }
    })
  }, [id])

  const handleBulkRemovePhotos = useCallback((indices: number[]) => {
    const indexSet = new Set(indices)
    setFormData((prev) => {
      const newPhotos = prev.photos.filter((_, i) => !indexSet.has(i))
      const newPreviews = prev.photoPreviews.filter((_, i) => !indexSet.has(i))
      // Fire-and-forget DB save with updated photos
      if (id) {
        fetch(`/api/finds/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: newPreviews }),
        }).catch(() => {})
      }
      return { ...prev, photos: newPhotos, photoPreviews: newPreviews }
    })
  }, [id])

  const handleUpdatePhoto = useCallback((index: number, preview: string) => {
    setFormData((prev) => ({
      ...prev,
      photoPreviews: prev.photoPreviews.map((p, i) => (i === index ? preview : p)),
    }))
  }, [])

  const margin = useMemo(() => {
    if (!formData.costPrice || !formData.price) return null
    return Math.round(((formData.price - formData.costPrice) / formData.price) * 100)
  }, [formData.costPrice, formData.price])

  const titleCharLimit = useMemo(() => {
    if (formData.selectedPlatforms.includes('ebay')) return 80
    return 255
  }, [formData.selectedPlatforms])

  const categoryInfo = useMemo(() => {
    if (!formData.category) return null
    const categoryData = CATEGORY_MAP[formData.category as keyof typeof CATEGORY_MAP]
    if (!categoryData) return null
    const platforms = []
    if (categoryData.vintedId) platforms.push('Vinted')
    if (categoryData.ebayId) platforms.push('eBay')
    return platforms
  }, [formData.category])

  const handleSave = async () => {
    if (!find) return

    try {
      setIsSaving(true)
      setError(null)

      const res = await fetch(`/api/finds/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.title,
          description: formData.description,
          category: formData.category || null,
          asking_price_gbp: formData.price,
          brand: formData.brand || null,
          condition: formData.condition,
          sku: formData.sku || null,
          cost_gbp: formData.costPrice,
          platform_fields: formData.platformFields,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to save')
      }

      const result = await res.json()
      setFind(result.data as Find)
      setIsEditing(false)

      // If Vinted listing exists, update it via extension (non-blocking)
      const vintedData = find.platform_fields?.vinted as any
      const vintedListingId = vintedData?.listingId
      if (vintedListingId && typeof window !== 'undefined') {
        try {
          const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
          const chrome = (window as any).chrome
          if (chrome?.runtime) {
            chrome.runtime.sendMessage(EXTENSION_ID, {
              action: 'update_vinted',
              find: result.data,
              findId: id,
              listingId: vintedListingId,
            }, (resp: any) => {
              if (chrome.runtime.lastError) console.warn('Vinted update failed:', chrome.runtime.lastError.message)
              else if (!resp?.ok) console.warn('Vinted update error:', resp?.error)
            })
          }
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!find) return

    try {
      setIsSaving(true)
      setError(null)

      const res = await fetch(`/api/finds/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete')
      }

      router.push('/finds')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleMarkSold = async (priceInput?: string, dateInput?: string) => {
    if (!find) return

    try {
      setIsSaving(true)
      setError(null)

      const soldPrice = (priceInput || markSoldData.price) ? parseFloat(priceInput || markSoldData.price) : null
      const soldDate = (dateInput || markSoldData.date) ? new Date((dateInput || markSoldData.date)).toISOString() : new Date().toISOString()

      // Update find status to "sold"
      const res = await fetch(`/api/finds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sold',
          sold_at: soldDate,
          ...(soldPrice && { sold_price_gbp: soldPrice }),
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to mark as sold')
      }

      // Delist from eBay if listing exists
      const marketplaceRes = await fetch(`/api/finds/${id}/marketplace`)
      if (marketplaceRes.ok) {
        const marketplaceData = await marketplaceRes.json()
        const ebayListing = marketplaceData.data?.find((m: any) => m.marketplace === 'ebay')

        if (ebayListing && ebayListing.status === 'listed') {
          try {
            await fetch('/api/ebay/delist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ find_id: id }),
            })
          } catch (e) {
            // Delist error is non-fatal — find is already marked as sold
            console.error('Failed to delist from eBay:', e)
          }
        }

        // Mark other marketplaces for delist (Vinted)
        if (marketplaceData.data) {
          for (const mp of marketplaceData.data) {
            if (mp.marketplace !== 'ebay' && mp.status === 'listed') {
              try {
                await fetch(`/api/finds/${id}/marketplace?marketplace=${mp.marketplace}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'needs_delist' }),
                })
              } catch (e) {
                console.error(`Failed to mark ${mp.marketplace} for delist:`, e)
              }

              // Dispatch Vinted delist via extension immediately (non-fatal)
              if (mp.marketplace === 'vinted' && typeof window !== 'undefined') {
                try {
                  const vintedListingId = find.platform_fields?.vinted?.['listingId']
                  if (vintedListingId) {
                    const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
                    const chromeExt = (window as any).chrome
                    if (chromeExt?.runtime?.sendMessage) {
                      chromeExt.runtime.sendMessage(
                        EXTENSION_ID,
                        {
                          action: 'delistlistingfrommarketplace',
                          marketplace: 'vinted',
                          listingId: vintedListingId,
                        },
                        (resp: any) => {
                          if (chromeExt.runtime.lastError) {
                            console.warn('Vinted delist dispatch failed:', chromeExt.runtime.lastError.message)
                          }
                        }
                      )
                    }
                  }
                } catch (e) {
                  console.warn('Failed to dispatch Vinted delist:', e instanceof Error ? e.message : String(e))
                }
              }
            }
          }
        }
      }

      // Reload find to show updated status
      const findRes = await fetch(`/api/finds/${id}`)
      if (findRes.ok) {
        const findData = await findRes.json()
        if (findData.data) {
          setFind(findData.data)
        }
      }

      // Reload marketplace data to show updated status
      refreshMarketplaceData()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as sold'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSyncOrders = async () => {
    try {
      setIsSyncing(true)
      setError(null)

      const res = await fetch('/api/ebay/sync-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Failed to sync orders')
      }

      const result = await res.json()

      // Show success message
      setError(null)
      alert(`Synced ${result.data?.ordersChecked || 0} orders, found ${result.data?.itemsSold || 0} sold items`)

      // Reload find to show updated status if it was marked as sold
      const findRes = await fetch(`/api/finds/${id}`)
      if (findRes.ok) {
        const findData = await findRes.json()
        if (findData.data) {
          setFind(findData.data)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync orders'
      setError(message)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleListOnVinted = async () => {
    if (!find) return
    setIsListingOnVinted(true)
    setVintedListResult(null)

    const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
    const chromeExt = typeof window !== 'undefined' ? (window as any).chrome : null
    const hasExtension = !!(chromeExt?.runtime?.sendMessage)

    if (!hasExtension) {
      setVintedListResult({ ok: false, message: 'Wrenlist extension not detected. Install it and open Vinted in another tab.' })
      setIsListingOnVinted(false)
      return
    }

    try {
      const payloadRes = await fetch(`/api/chrome-extension/vinted/product-payload/${id}`)
      if (!payloadRes.ok) {
        const data = await payloadRes.json()
        throw new Error(data.message || 'Failed to build Vinted payload')
      }
      const payloadData = await payloadRes.json()
      const product = payloadData?.data?.product ?? payloadData?.product
      if (!product) throw new Error('No product payload returned')

      await new Promise<void>((resolve, reject) => {
        chromeExt.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'publishtomarketplace', marketplace: 'vinted', product },
          (resp: any) => {
            if (chromeExt.runtime.lastError) {
              reject(new Error(chromeExt.runtime.lastError.message))
            } else if (!resp?.success && !resp?.ok) {
              reject(new Error(resp?.error || 'Extension returned failure'))
            } else {
              resolve()
            }
          }
        )
      })

      setVintedListResult({ ok: true, message: 'Sent to Vinted — check the extension tab to confirm.' })
    } catch (err) {
      setVintedListResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to list on Vinted' })
    } finally {
      setIsListingOnVinted(false)
    }
  }

  const handleListOnEbay = async () => {
    if (!find) return
    setIsListingOnEbay(true)
    setEbayListResult(null)

    const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
    const chromeExt = typeof window !== 'undefined' ? (window as any).chrome : null
    const hasExtension = !!(chromeExt?.runtime?.sendMessage)

    if (!hasExtension) {
      setEbayListResult({ ok: false, message: 'Wrenlist extension not detected. Install it and open eBay in another tab.' })
      setIsListingOnEbay(false)
      return
    }

    try {
      const payloadRes = await fetch(`/api/chrome-extension/ebay/product-payload/${id}`)
      if (!payloadRes.ok) {
        const data = await payloadRes.json()
        throw new Error(data.message || 'Failed to build eBay payload')
      }
      const payloadData = await payloadRes.json()
      const product = payloadData?.data?.product ?? payloadData?.product
      if (!product) throw new Error('No product payload returned')

      await new Promise<void>((resolve, reject) => {
        chromeExt.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'publishtomarketplace', marketplace: 'ebay', product },
          (resp: any) => {
            if (chromeExt.runtime.lastError) {
              reject(new Error(chromeExt.runtime.lastError.message))
            } else if (!resp?.success && !resp?.ok) {
              reject(new Error(resp?.error || 'Extension returned failure'))
            } else {
              resolve()
            }
          }
        )
      })

      setEbayListResult({ ok: true, message: 'Sent to eBay — check the extension tab to confirm.' })
    } catch (err) {
      setEbayListResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to list on eBay' })
    } finally {
      setIsListingOnEbay(false)
    }
  }

  const handleDelistFromVinted = async () => {
    if (!find) return
    setIsListingOnVinted(true)
    setVintedListResult(null)

    try {
      const vintedPmd = marketplaceData.find((m) => m.marketplace === 'vinted')
      if (!vintedPmd) {
        setVintedListResult({ ok: false, message: 'Vinted listing not found' })
        setIsListingOnVinted(false)
        return
      }

      // Mark PMD as needs_delist
      const pmdRes = await fetch(`/api/finds/${id}/marketplace?marketplace=vinted`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'needs_delist' }),
      })

      if (!pmdRes.ok) {
        throw new Error('Failed to queue delist')
      }

      // Dispatch to extension immediately
      if (typeof window !== 'undefined') {
        const chromeExt = (window as any).chrome
        if (chromeExt?.runtime?.sendMessage) {
          chromeExt.runtime.sendMessage(
            'nblnainobllgbjkdkpeodjpopkgnpfgb',
            {
              action: 'delistlistingfrommarketplace',
              marketplace: 'vinted',
              listingId: vintedPmd.platform_listing_id,
            },
            () => { /* non-fatal */ }
          )
        }
      }

      // Reload marketplace data
      refreshMarketplaceData()
      setVintedListResult({ ok: true, message: 'Delist queued — extension will remove from Vinted shortly.' })
    } catch (err) {
      setVintedListResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to delist from Vinted' })
    } finally {
      setIsListingOnVinted(false)
    }
  }

  const handleDelistFromPlatform = async (marketplace: string) => {
    if (!find) return
    setDelistConfirm(null)
    setDelistingPlatform(marketplace)
    try {
      const res = await fetch('/api/crosslist/delist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findId: find.id, marketplace }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Delist from ${marketplace} failed`)
      }
      refreshMarketplaceData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delist failed')
    } finally {
      setDelistingPlatform(null)
    }
  }

  const handleRetryPublish = async (marketplace: string) => {
    if (!find) return
    setRetryingPlatform(marketplace)
    try {
      const res = await fetch(`/api/finds/${id}/marketplace?marketplace=${marketplace}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'needs_publish' }),
      })
      if (!res.ok) throw new Error('Failed to retry')
      refreshMarketplaceData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetryingPlatform(null)
    }
  }

  const handleRelistOnVinted = async () => {
    if (!find) return
    setIsListingOnVinted(true)
    setVintedListResult(null)
    try {
      // Get stored vintedMetadata from platform_fields
      const vintedMeta = (find.platform_fields as any)?.vinted?.vintedMetadata
      const originalListingId = (find.platform_fields as any)?.vinted?.originalListingId

      if (!vintedMeta && !originalListingId) {
        setVintedListResult({ ok: false, message: 'No Vinted metadata stored — item must be relisted manually on Vinted.' })
        return
      }

      if (typeof window === 'undefined') return
      const chromeExt = (window as any).chrome
      if (!chromeExt?.runtime?.sendMessage) {
        setVintedListResult({ ok: false, message: 'Extension not available.' })
        return
      }

      // Dispatch relist to extension
      const response = await new Promise<{ success: boolean; message?: string; listingId?: string; product?: { id?: string | number; url?: string } }>((resolve) => {
        const timeout = setTimeout(() => resolve({ success: false, message: 'Extension timed out.' }), 30000)
        chromeExt.runtime.sendMessage(
          'nblnainobllgbjkdkpeodjpopkgnpfgb',
          {
            action: 'postlistingtomarketplace',
            marketplace: 'vinted',
            vintedTld: 'co.uk',
            wrenlistBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
            productData: {
              id: find.id,
              title: find.name,
              description: find.description || '',
              price: Number(find.asking_price_gbp) || 0,
              // Extension expects 'images' as string[] of URLs
              // Use vintedMetadata photo full_size_urls if available (stable Vinted CDN refs)
              // Use Supabase-mirrored photos (find.photos) — server-side fetchable, no CORS issues
              // Fall back to vintedMetadata CDN URLs only if find.photos is empty
              images: (find.photos?.length ? find.photos : vintedMeta?.photos?.map((p: any) => p.full_size_url || p.url).filter(Boolean)) || [],
              // Extension expects PascalCase condition enum
              condition: (() => {
                const c = find.condition?.toLowerCase() || ''
                if (c === 'new_with_tags') return 'NewWithTags'
                if (c === 'new_without_tags') return 'NewWithoutTags'
                if (c === 'very_good') return 'VeryGood'
                if (c === 'good') return 'Good'
                if (c === 'fair') return 'Fair'
                if (c === 'poor') return 'Poor'
                // Legacy fallbacks
                if (c === 'excellent') return 'NewWithoutTags'
                return 'Good'
              })(),
              // Pass catalog_id as category[0] — mapper detects numeric IDs and skips resolution
              category: vintedMeta?.catalog_id ? [String(vintedMeta.catalog_id)] : [find.category || 'other'],
              brand: find.brand || '',
              dynamicProperties: {
                // Pass stored Vinted IDs directly so mapper skips lookup
                colorIds: vintedMeta?.color_ids || [],
                packageSizeId: vintedMeta?.shipping?.package_size_id || vintedMeta?.package_size_id || 2,
                // Pass ISBN for books so Vinted doesn't reject with "Please enter an ISBN"
                ...(vintedMeta?.isbn ? { ISBN: vintedMeta.isbn } : {}),
                // Pass pre-stored item_attributes so mapper uses them directly
                vintedItemAttributes: vintedMeta?.item_attributes || [],
                // Pass brand_id directly to skip mapper's brand lookup
                vintedBrandId: vintedMeta?.brand_id || null,
              },
              // Pass catalog_id at top level so mapper uses it directly
              vintedCatalogId: vintedMeta?.catalog_id || null,
              // size must be array — mapper uses size[0] parsed as int for size_id
              size: vintedMeta?.size_id ? [String(vintedMeta.size_id)] : (find.size ? [find.size] : []),
              // Shipping from stored vintedMetadata — always Prepaid for Vinted UK
              shipping: {
                shippingType: 'Prepaid',
                shippingWeight: {
                  value: Math.round(((vintedMeta?.shipping?.weight_grams || 500) / 1000) * 10) / 10,
                  unit: 'kg',
                },
                packageSizeId: vintedMeta?.shipping?.package_size_id || vintedMeta?.package_size_id || 2,
              },
              // Full vintedMetadata passthrough for catalog resolution
              vintedMetadata: vintedMeta,
            },
          },
          (res: any) => {
            clearTimeout(timeout)
            if (chromeExt.runtime.lastError) {
              resolve({ success: false, message: chromeExt.runtime.lastError.message })
            } else {
              resolve(res || { success: false, message: 'No response from extension' })
            }
          }
        )
      })

      if (response.success) {
        const newListingId = response.product?.id ? String(response.product.id) : undefined
        const newListingUrl = response.product?.url ?? undefined
        // Update PMD status back to listed
        await fetch(`/api/finds/${find.id}/marketplace?marketplace=vinted`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'listed', platform_listing_id: newListingId, platform_listing_url: newListingUrl }),
        })
        setVintedListResult({ ok: true, message: 'Relisted on Vinted successfully!', url: newListingUrl })
        await Promise.all([
          fetch(`/api/finds/${id}`).then((res) => res.json()).then((result) => {
            if (result.data) setFind(result.data)
          }),
          fetch(`/api/finds/${id}/marketplace`).then((res) => res.json()).then((result) => {
            if (result?.data) setMarketplaceData(result.data)
          }),
        ])
      } else {
        setVintedListResult({ ok: false, message: response.message || 'Relist failed.' })
      }
    } catch (e) {
      setVintedListResult({ ok: false, message: e instanceof Error ? e.message : 'Relist failed.' })
    } finally {
      setIsListingOnVinted(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-lt">Loading...</p>
      </div>
    )
  }

  if (!find) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-lt mb-4">Item not found</p>
        <button
          onClick={() => router.push('/finds')}
          className="text-sm text-sage underline underline-offset-2 hover:text-sage-dk transition"
        >
          Back to inventory →
        </button>
      </div>
    )
  }

  if (markSoldConfirm) {
    return (
      <MarkAsSoldModal
        find={find}
        onConfirm={async (price, date) => {
          await handleMarkSold(price, date)
          setMarkSoldConfirm(false)
          setMarkSoldData({ price: '', date: '' })
        }}
        onCancel={() => {
          setMarkSoldConfirm(false)
          setMarkSoldData({ price: '', date: '' })
        }}
        isLoading={isSaving}
      />
    )
  }

  if (deleteConfirm) {
    return (
      <DeleteConfirmModal
        find={find}
        isOpen={deleteConfirm}
        isLoading={isSaving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <InventoryItemHeader
        find={find}
        isEditing={isEditing}
        isSyncing={isSyncing}
        isCrosslisting={isCrosslisting}
        showCrosslistPicker={showCrosslistPicker}
        crosslistTargets={crosslistTargets}
        availableForCrosslist={availableForCrosslist}
        platformUsernames={new Map(allConnectedPlatforms.map((cp) => [cp.platform, cp.username]))}
        extensionDetected={extensionInfo.detected}
        marketplaceData={marketplaceData}
        onMarkAsSoldClick={() => setMarkSoldConfirm(true)}
        onEditClick={() => setIsEditing(true)}
        onSyncClick={handleSyncOrders}
        onListOnVintedClick={handleListOnVinted}
        onListOnEbayClick={handleListOnEbay}
        onDelistVintedClick={handleDelistFromVinted}
        onRelistVintedClick={handleRelistOnVinted}
        onCrosslistClick={() => setShowCrosslistPicker(true)}
        onCrosslistTargetToggle={(p) => setCrosslistTargets((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
        onCrosslistConfirm={handleCrosslist}
        onCrosslistCancel={() => { setShowCrosslistPicker(false); setCrosslistTargets([]) }}
      />

      {/* Vinted list result */}
      {vintedListResult && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: vintedListResult.ok ? 'rgba(61,92,58,.08)' : 'rgba(220,38,38,.08)',
            borderWidth: '1px',
            borderColor: vintedListResult.ok ? 'rgba(61,92,58,.2)' : 'rgba(220,38,38,.2)',
            color: vintedListResult.ok ? '#3D5C3A' : '#DC2626',
          }}
        >
          <span>{vintedListResult.ok ? '✓ ' : '✗ '}{vintedListResult.message}</span>
          {vintedListResult.ok && vintedListResult.url && (
            <a href={vintedListResult.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, textDecoration: 'underline', fontWeight: 600 }}>View on Vinted →</a>
          )}
          <button onClick={() => setVintedListResult(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* eBay list result */}
      {ebayListResult && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: ebayListResult.ok ? 'rgba(61,92,58,.08)' : 'rgba(220,38,38,.08)',
            borderWidth: '1px',
            borderColor: ebayListResult.ok ? 'rgba(61,92,58,.2)' : 'rgba(220,38,38,.2)',
            color: ebayListResult.ok ? '#3D5C3A' : '#DC2626',
          }}
        >
          <span>{ebayListResult.ok ? '✓ ' : '✗ '}{ebayListResult.message}</span>
          <button onClick={() => setEbayListResult(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Extension not detected warning */}
      {extensionInfo.detected === false && find?.status !== 'sold' && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(234,179,8,.08)',
            borderWidth: '1px',
            borderColor: 'rgba(234,179,8,.3)',
            color: '#92400E',
          }}
        >
          <span>
            Wrenlist extension not detected — crosslisting requires the Chrome extension.{' '}
            <a
              href="https://chromewebstore.google.com/detail/wrenlist/nblnainobllgbjkdkpeodjpopkgnpfgb"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Install extension
            </a>
          </span>
        </div>
      )}

      {/* Crosslist result */}
      {crosslistResult && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: crosslistResult.ok ? 'rgba(61,92,58,.08)' : 'rgba(220,38,38,.08)',
            borderWidth: '1px',
            borderColor: crosslistResult.ok ? 'rgba(61,92,58,.2)' : 'rgba(220,38,38,.2)',
            color: crosslistResult.ok ? '#3D5C3A' : '#DC2626',
          }}
        >
          <span>{crosslistResult.ok ? '✓ ' : '✗ '}{crosslistResult.message}</span>
          <button onClick={() => setCrosslistResult(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="p-4 rounded text-sm"
          style={{
            backgroundColor: 'rgba(220,38,38,.1)',
            borderWidth: '1px',
            borderColor: 'rgba(220,38,38,.3)',
            color: '#DC2626',
          }}
        >
          {error}
        </div>
      )}

      {/* View mode */}
      {!isEditing && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Photos */}
          <div className="col-span-2">
            <div className="space-y-4">
              <div className="bg-cream-md rounded p-4" style={{ borderWidth: '1px', borderColor: 'rgba(61,92,58,.14)' }}>
                {formData.photoPreviews.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {formData.photoPreviews.map((photo, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded bg-gray-200 overflow-hidden"
                      >
                        <img
                          src={photo}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 rounded flex items-center justify-center">
                    <p className="text-sm text-ink-lt">No photos</p>
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                  Title
                </p>
                <p className="text-sm mt-1" style={{ color: '#1E2E1C' }}>
                  {find.name}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                  Description
                </p>
                <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: '#1E2E1C' }}>
                  {find.description || '—'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                    Category
                  </p>
                  <p className="text-sm mt-1 capitalize" style={{ color: '#1E2E1C' }}>
                    {find.category || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                    Condition
                  </p>
                  <p className="text-sm mt-1 capitalize" style={{ color: '#1E2E1C' }}>
                    {find.condition || '—'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                    Brand
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#1E2E1C' }}>
                    {find.brand || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Pricing & Listings */}
          <div className="space-y-4">
            <div
              className="p-4 rounded"
              style={{
                backgroundColor: '#F5F0E8',
                borderWidth: '1px',
                borderColor: 'rgba(61,92,58,.14)',
              }}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                    Cost Price
                  </p>
                  <p className="text-lg font-mono" style={{ color: '#4A5E48' }}>
                    {find.cost_gbp ? `£${find.cost_gbp.toFixed(2)}` : '—'}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                    Asking Price
                  </p>
                  <p className="text-lg font-mono" style={{ color: '#1E2E1C' }}>
                    {find.asking_price_gbp ? `£${find.asking_price_gbp.toFixed(2)}` : '—'}
                  </p>
                </div>

                <div className="pt-2 border-t" style={{ borderColor: 'rgba(61,92,58,.14)' }}>
                  <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                    Margin
                  </p>
                  <p className="text-lg font-mono" style={{ color: '#3D5C3A' }}>
                    {find.cost_gbp && find.asking_price_gbp
                      ? `${Math.round(((find.asking_price_gbp - find.cost_gbp) / find.asking_price_gbp) * 100)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Marketplaces — reads from product_marketplace_data */}
            {marketplaceData.length > 0 && (
              <div
                className="p-4 rounded"
                style={{
                  backgroundColor: '#EDE8DE',
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.14)',
                }}
              >
                <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: '#8A9E88' }}>
                  Listed On
                </p>
                <div className="space-y-3">
                  {marketplaceData.map((md) => (
                    <div key={md.marketplace}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium capitalize" style={{ color: '#1E2E1C' }}>
                            {md.marketplace}
                          </p>
                          <span
                            className="text-xs capitalize"
                            style={{ color: md.status === 'listed' ? '#3D5C3A' : md.status === 'draft' ? '#B8860B' : md.status === 'error' ? '#DC2626' : '#8A9E88' }}
                          >
                            {md.status === 'error' ? 'Error' : md.status === 'draft' ? 'Draft' : md.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {md.platform_listing_url && (
                            <a
                              href={md.platform_listing_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-sage underline underline-offset-1 hover:text-sage-dk transition"
                            >
                              View →
                            </a>
                          )}
                          {(md.status === 'listed' || md.status === 'draft') && (
                            <>
                              {delistConfirm === md.marketplace ? (
                                <span className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelistFromPlatform(md.marketplace)}
                                    disabled={delistingPlatform === md.marketplace}
                                    className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
                                    style={{ backgroundColor: 'rgba(220,38,38,.12)', color: '#DC2626', borderWidth: '1px', borderColor: 'rgba(220,38,38,.3)' }}
                                  >
                                    {delistingPlatform === md.marketplace ? 'Delisting...' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => setDelistConfirm(null)}
                                    className="text-xs px-1.5 py-0.5 rounded transition-colors"
                                    style={{ color: '#8A9E88' }}
                                  >
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setDelistConfirm(md.marketplace)}
                                  className="text-xs px-2 py-0.5 rounded transition-colors hover:bg-red-50"
                                  style={{ color: '#8A9E88' }}
                                >
                                  Delist
                                </button>
                              )}
                            </>
                          )}
                          {md.status === 'error' && (
                            <button
                              onClick={() => handleRetryPublish(md.marketplace)}
                              disabled={retryingPlatform === md.marketplace}
                              className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
                              style={{ backgroundColor: 'rgba(61,92,58,.1)', color: '#3D5C3A', borderWidth: '1px', borderColor: 'rgba(61,92,58,.3)' }}
                            >
                              {retryingPlatform === md.marketplace ? 'Retrying...' : 'Retry'}
                            </button>
                          )}
                        </div>
                      </div>
                      {md.status === 'error' && md.error_message && (
                        <p className="text-xs mt-1 px-2 py-1 rounded" style={{ color: '#DC2626', backgroundColor: 'rgba(220,38,38,.06)' }}>
                          {md.error_message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vinted Metadata */}
            {(() => {
              const vm = (find.platform_fields as any)?.vinted?.vintedMetadata as VintedStoredMetadata | undefined
              return vm ? <VintedMetadataPanel metadata={vm} /> : null
            })()}

            {/* SKU */}
            {find.sku && (
              <div
                className="p-4 rounded"
                style={{
                  backgroundColor: '#EDE8DE',
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.14)',
                }}
              >
                <p className="text-xs uppercase tracking-wider font-medium mb-1" style={{ color: '#8A9E88' }}>
                  SKU
                </p>
                <p className="text-sm font-mono" style={{ color: '#1E2E1C' }}>
                  {find.sku}
                </p>
              </div>
            )}

            {/* Delete button */}
            <button
              onClick={() => setDeleteConfirm(true)}
              className="w-full px-3 py-2 text-sm font-medium rounded transition-colors"
              style={{
                borderWidth: '1px',
                borderColor: 'rgba(196,138,58,.3)',
                backgroundColor: 'transparent',
                color: '#C4883A',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(196,138,58,.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Delete item
            </button>
          </div>
        </div>
      )}

      {/* Edit mode */}
      {isEditing && (
        <div className="space-y-6">
          {/* Template applied banner */}
          {templateAppliedBanner && (
            <div
              className="p-3 rounded text-sm"
              style={{
                backgroundColor: 'rgba(34, 197, 94, .1)',
                borderWidth: '1px',
                borderColor: 'rgba(34, 197, 94, .3)',
                color: '#22C55E',
              }}
            >
              ✓ Template applied! Review highlighted fields before saving.
            </div>
          )}

          {/* Incomplete fields banner */}
          {incompleteFields.length > 0 && (
            <div
              className="p-3 rounded text-sm space-y-1"
              style={{
                backgroundColor: 'rgba(245, 158, 11, .1)',
                borderWidth: '1px',
                borderColor: 'rgba(245, 158, 11, .3)',
                color: '#F59E0B',
              }}
            >
              <div>⚠ {incompleteFields.length} required field(s) incomplete:</div>
              <ul className="text-xs space-y-0.5 ml-4">
                {incompleteFields.map((field) => (
                  <li key={field}>• {field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Form grid */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left: Marketplace selector */}
          <div
            className="col-span-2 space-y-4 p-4 rounded sticky top-24 h-fit"
            style={{
              backgroundColor: '#F5F0E8',
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.14)',
            }}
          >
            {/* Template picker */}
            <div className="space-y-2">
              <TemplatePickerPopover onSelectTemplate={handleApplyTemplate} />
            </div>

            <div style={{ height: '1px', backgroundColor: 'rgba(61,92,58,.14)' }} />

            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              List On
            </p>
            {(['vinted', 'ebay'] as Platform[]).map((platform) => (
              <label
                key={platform}
                className="flex items-center gap-2 cursor-pointer"
                style={{ color: '#1E2E1C' }}
              >
                <input
                  type="checkbox"
                  checked={formData.selectedPlatforms.includes(platform)}
                  onChange={() => handlePlatformToggle(platform)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium capitalize">{platform}</span>
              </label>
            ))}
          </div>

          {/* Center: Form fields */}
          <div className="col-span-7 space-y-6">
            {/* Photos */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Photos
              </label>
              <PhotoUpload
                photos={formData.photos}
                photoPreviews={formData.photoPreviews}
                onAddPhotos={handleAddPhotos}
                onReplacePhotos={handleReplacePhotos}
                onRemovePhoto={handleRemovePhoto}
                onReorder={handleReorderPhotos}
                onSetMain={handleSetMainPhoto}
                onBulkRemove={handleBulkRemovePhotos}
                onUpdatePhoto={handleUpdatePhoto}
                selectedPlatforms={formData.selectedPlatforms}
              />
            </div>

            {/* Title */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Title ({formData.title.length}/{titleCharLimit})
              </label>
              <textarea
                value={formData.title}
                onChange={(e) =>
                  handleInputChange('title', e.target.value.slice(0, titleCharLimit))
                }
                rows={2}
                className="w-full mt-1 p-3 rounded text-sm resize-none"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Description ({formData.description.length}/2000)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  handleInputChange('description', e.target.value.slice(0, 2000))
                }
                rows={6}
                className="w-full mt-1 p-3 rounded text-sm resize-none"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full mt-1 p-2 rounded text-sm"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              >
                <option value="">Select category</option>
                {CANONICAL_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                    {categoryInfo && categoryInfo.length > 0
                      ? ` (${categoryInfo.join(', ')})`
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Asking Price (£)
              </label>
              <input
                type="number"
                value={formData.price ?? ''}
                onChange={(e) =>
                  handleInputChange(
                    'price',
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
                placeholder="0.00"
                step="0.01"
                className="w-full mt-1 p-2 rounded text-sm"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
            </div>

            {/* Brand */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                className="w-full mt-1 p-2 rounded text-sm"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
            </div>

            {/* Condition */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) =>
                  handleInputChange('condition', e.target.value as FindCondition)
                }
                className="w-full mt-1 p-2 rounded text-sm"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Quantity
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
                min="1"
                className="w-full mt-1 p-2 rounded text-sm"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
            </div>

            {/* Shipping */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Shipping Weight (kg)
              </label>
              <input
                type="number"
                value={formData.shippingWeight ?? ''}
                onChange={(e) =>
                  handleInputChange(
                    'shippingWeight',
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
                step="0.1"
                className="w-full mt-1 p-2 rounded text-sm"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
            </div>

            {/* Shipping dimensions */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Shipping Dimensions (cm)
              </label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {['length', 'width', 'height'].map((dim) => (
                  <input
                    key={dim}
                    type="number"
                    placeholder={dim}
                    value={(formData.shippingDimensions as any)[dim] ?? ''}
                    onChange={(e) =>
                      handleInputChange('shippingDimensions', {
                        ...formData.shippingDimensions,
                        [dim]: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="p-2 rounded text-sm"
                    style={{
                      borderWidth: '1px',
                      borderColor: 'rgba(61,92,58,.22)',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
                  />
                ))}
              </div>
            </div>

            {/* Vinted-specific fields */}
            {formData.selectedPlatforms.includes('vinted') && (
              <div className="p-4 rounded" style={{ backgroundColor: 'rgba(93,199,162,.05)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#1E2E1C' }}>
                  Vinted-specific fields
                </p>

                <div className="space-y-4">
                  {/* Primary colour */}
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                      Primary Colour
                    </label>
                    <select
                      value={formData.platformFields.vinted?.primaryColor ?? ''}
                      onChange={(e) =>
                        handleInputChange('platformFields', {
                          ...formData.platformFields,
                          vinted: {
                            ...formData.platformFields.vinted,
                            primaryColor: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 rounded text-sm"
                      style={{
                        borderWidth: '1px',
                        borderColor: 'rgba(61,92,58,.22)',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
                    >
                      <option value="">Select colour</option>
                      {VINTED_COLORS.map((color) => (
                        <option key={color.id} value={color.id}>
                          {color.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Secondary colour */}
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                      Secondary Colour (optional)
                    </label>
                    <select
                      value={formData.platformFields.vinted?.secondaryColor ?? ''}
                      onChange={(e) =>
                        handleInputChange('platformFields', {
                          ...formData.platformFields,
                          vinted: {
                            ...formData.platformFields.vinted,
                            secondaryColor: e.target.value ? parseInt(e.target.value) : undefined,
                          },
                        })
                      }
                      className="w-full mt-1 p-2 rounded text-sm"
                      style={{
                        borderWidth: '1px',
                        borderColor: 'rgba(61,92,58,.22)',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
                    >
                      <option value="">Select colour (optional)</option>
                      {VINTED_COLORS.map((color) => (
                        <option key={color.id} value={color.id}>
                          {color.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Condition description */}
                  <div>
                    <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                      Condition Description (optional)
                    </label>
                    <textarea
                      value={formData.platformFields.vinted?.conditionDescription ?? ''}
                      onChange={(e) =>
                        handleInputChange('platformFields', {
                          ...formData.platformFields,
                          vinted: {
                            ...formData.platformFields.vinted,
                            conditionDescription: e.target.value || undefined,
                          },
                        })
                      }
                      rows={3}
                      className="w-full mt-1 p-2 rounded text-sm resize-none"
                      style={{
                        borderWidth: '1px',
                        borderColor: 'rgba(61,92,58,.22)',
                        outline: 'none',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* eBay-specific fields */}
            {formData.selectedPlatforms.includes('ebay') && (
              <div className="p-4 rounded" style={{ backgroundColor: 'rgba(196,138,58,.05)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: '#1E2E1C' }}>
                  eBay-specific fields
                </p>

                <div className="space-y-3">
                  {/* Accept offers */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.platformFields.ebay?.acceptOffers ?? false}
                      onChange={(e) =>
                        handleInputChange('platformFields', {
                          ...formData.platformFields,
                          ebay: {
                            ...formData.platformFields.ebay,
                            acceptOffers: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm" style={{ color: '#1E2E1C' }}>
                      Accept offers
                    </span>
                  </label>

                  {/* Is auction */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.platformFields.ebay?.isAuction ?? false}
                      onChange={(e) =>
                        handleInputChange('platformFields', {
                          ...formData.platformFields,
                          ebay: {
                            ...formData.platformFields.ebay,
                            isAuction: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm" style={{ color: '#1E2E1C' }}>
                      Is auction
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Save as template section */}
            {!showSaveAsTemplate && (
              <div className="pt-4 border-t" style={{ borderColor: 'rgba(61,92,58,.14)' }}>
                <button
                  onClick={() => setShowSaveAsTemplate(true)}
                  className="text-sm text-sage hover:text-sage-dk transition underline underline-offset-2"
                >
                  💾 Save as template
                </button>
              </div>
            )}
            {showSaveAsTemplate && (
              <SaveAsTemplateInput
                formData={formDataToListingFormData()}
                onSaveSuccess={() => {
                  setShowSaveAsTemplate(false)
                  // Show success toast
                  const toast = document.createElement('div')
                  toast.textContent = '✓ Template saved!'
                  toast.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    padding: 12px 16px;
                    background-color: rgba(34, 197, 94, .9);
                    color: white;
                    border-radius: 4px;
                    font-size: 14px;
                    z-index: 100;
                  `
                  document.body.appendChild(toast)
                  setTimeout(() => toast.remove(), 3000)
                }}
                onClose={() => setShowSaveAsTemplate(false)}
              />
            )}
          </div>

          {/* Right: Internal fields */}
          <div
            className="col-span-3 space-y-4 p-4 rounded sticky top-24 h-fit"
            style={{
              backgroundColor: '#F5F0E8',
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.14)',
            }}
          >
            {/* SKU */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => handleInputChange('sku', e.target.value)}
                className="w-full mt-1 p-2 rounded text-sm"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
            </div>

            {/* Cost price */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Cost Price (£)
              </label>
              <input
                type="number"
                value={formData.costPrice ?? ''}
                onChange={(e) =>
                  handleInputChange(
                    'costPrice',
                    e.target.value ? parseFloat(e.target.value) : null
                  )
                }
                placeholder="0.00"
                step="0.01"
                className="w-full mt-1 p-2 rounded text-sm"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
              {margin !== null && (
                <p className="text-xs mt-1 font-mono" style={{ color: '#4A5E48' }}>
                  Margin: {margin}%
                </p>
              )}
            </div>

            {/* Internal note */}
            <div>
              <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
                Internal Note
              </label>
              <textarea
                value={formData.internalNote}
                onChange={(e) => handleInputChange('internalNote', e.target.value)}
                rows={4}
                className="w-full mt-1 p-2 rounded text-sm resize-none"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  outline: 'none',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#3D5C3A')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)')}
              />
            </div>
          </div>

            {/* Edit mode action bar */}
            <div
              className="col-span-12 sticky bottom-0 flex items-center justify-between gap-2 p-4 rounded mt-6"
              style={{
                backgroundColor: '#F5F0E8',
                borderWidth: '1px',
                borderColor: 'rgba(61,92,58,.14)',
              }}
            >
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-medium rounded transition-colors"
                style={{
                  borderWidth: '1px',
                  borderColor: 'rgba(61,92,58,.22)',
                  backgroundColor: 'transparent',
                  color: '#3D5C3A',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE8DE')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#3D5C3A', color: '#F5F0E8' }}
                onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#2C4428')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3D5C3A')}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
