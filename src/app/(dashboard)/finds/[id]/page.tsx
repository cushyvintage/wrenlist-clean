'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import MarkAsSoldModal from '@/components/inventory/MarkAsSoldModal'
import InventoryItemHeader from '@/components/inventory/InventoryItemHeader'
import DeleteConfirmModal from '@/components/inventory/DeleteConfirmModal'
import { applyTemplate } from '@/lib/templates/apply-template'
import type { Find, FindCondition, Platform, ListingTemplate } from '@/types'
import type { ListingFormData, PlatformFieldsData } from '@/types/listing-form'
import { useExtensionInfo } from '@/hooks/useExtensionInfo'
import { parseApiError, unwrapApiResponse } from '@/lib/api-utils'
import { useExtensionHeartbeat } from '@/hooks/useExtensionHeartbeat'
import { useConnectedPlatforms } from '@/hooks/useConnectedPlatforms'
import { SessionExpiryBanner } from '@/components/layout/SessionExpiryBanner'
import { crosslistFind, CROSSLIST_BLOCKED_STATUSES } from '@/lib/crosslist'
import { useFindMarketplaceActions } from '@/hooks/useFindMarketplaceActions'
import { FindNotificationBanners } from '@/components/finds/FindNotificationBanners'
import { FindViewMode } from '@/components/finds/FindViewMode'
import { FindEditMode } from '@/components/finds/FindEditMode'

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
  stashId: string | null
  platformPrices: Partial<Record<Platform, number | null>>
}

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
    stashId: null,
    platformPrices: { vinted: null, ebay: null, etsy: null, shopify: null },
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [markSoldConfirm, setMarkSoldConfirm] = useState(false)
  const [markSoldData, setMarkSoldData] = useState({ price: '', date: '' })
  const [isSyncing, setIsSyncing] = useState(false)
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)
  const [templateAppliedBanner, setTemplateAppliedBanner] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [incompleteFields, setIncompleteFields] = useState<string[]>([])
  const [marketplaceData, setMarketplaceData] = useState<Array<{ marketplace: string; status: string; platform_listing_url: string | null; platform_listing_id: string | null; error_message: string | null }>>([])
  const [isCrosslisting, setIsCrosslisting] = useState(false)
  const [crosslistResult, setCrosslistResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showCrosslistPicker, setShowCrosslistPicker] = useState(false)
  const [crosslistTargets, setCrosslistTargets] = useState<Platform[]>([])
  const extensionInfo = useExtensionInfo()
  const heartbeat = useExtensionHeartbeat()
  const { connected: allConnectedPlatforms, disconnected: disconnectedPlatforms, recheckPlatforms } = useConnectedPlatforms({ pollInterval: 60_000 })

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

  const marketplaceActions = useFindMarketplaceActions({
    find,
    id,
    marketplaceData,
    refreshMarketplaceData,
    setFind,
    setMarketplaceData,
  })

  // Fetch find details
  useEffect(() => {
    async function fetchFind() {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch(`/api/finds/${id}`)
        if (!res.ok) throw new Error('Failed to load find')
        const result = await res.json()
        const data = unwrapApiResponse<Find>(result)

        setFind(data)

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
          platformFields: (data.platform_fields as PlatformFieldsData) || {},
          shippingWeight: data.shipping_weight_grams ?? null,
          shippingDimensions: {
            length: data.shipping_length_cm ?? null,
            width: data.shipping_width_cm ?? null,
            height: data.shipping_height_cm ?? null,
          },
          sku: data.sku || '',
          costPrice: data.cost_gbp,
          internalNote: '',
          stashId: data.stash_id ?? null,
          platformPrices: { vinted: null, ebay: null, etsy: null, shopify: null },
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

  const handleCrosslist = async (scheduledFor?: string, stalePolicy?: 'run_if_late' | 'skip_if_late') => {
    if (!find || crosslistTargets.length === 0) return
    setIsCrosslisting(true)
    setCrosslistResult(null)

    try {
      const options = scheduledFor ? { scheduled_for: scheduledFor, stale_policy: stalePolicy } : undefined
      const outcome = await crosslistFind(find.id, crosslistTargets, recheckPlatforms, options)
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

  const handleInputChange = useCallback((field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

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

  const handleApplyTemplate = useCallback((template: ListingTemplate) => {
    const listingFormData = formDataToListingFormData()
    const { merged, incompleteRequiredFields } = applyTemplate(template, listingFormData)
    setFormData({
      title: merged.title, description: merged.description, category: merged.category,
      price: merged.price, brand: merged.brand, condition: merged.condition, quantity: merged.quantity,
      photos: merged.photos, photoPreviews: merged.photoPreviews, selectedPlatforms: merged.selectedPlatforms,
      platformFields: merged.platformFields, shippingWeight: merged.shippingWeight,
      shippingDimensions: merged.shippingDimensions, sku: merged.sku, costPrice: merged.costPrice,
      internalNote: merged.internalNote, stashId: formData.stashId, platformPrices: merged.platformPrices,
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
      return { ...prev, selectedPlatforms: platforms }
    })
  }, [])

  const handleAddPhotos = useCallback((files: File[]) => {
    setFormData((prev) => ({
      ...prev,
      photos: [...prev.photos, ...files],
      photoPreviews: [...prev.photoPreviews, ...files.map((f) => URL.createObjectURL(f))],
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
      if (id) {
        fetch(`/api/finds/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: newPreviews }),
        }).catch(() => {
          setPhotoError('Failed to save photo order. Please try again.')
          setTimeout(() => setPhotoError(null), 4000)
        })
      }
      return { ...prev, photos: arrayMove(prev.photos, index, 0), photoPreviews: newPreviews }
    })
  }, [id])

  const handleBulkRemovePhotos = useCallback((indices: number[]) => {
    const indexSet = new Set(indices)
    setFormData((prev) => {
      const newPhotos = prev.photos.filter((_, i) => !indexSet.has(i))
      const newPreviews = prev.photoPreviews.filter((_, i) => !indexSet.has(i))
      if (id) {
        fetch(`/api/finds/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: newPreviews }),
        }).catch(() => {
          setPhotoError('Failed to save photo changes. Please try again.')
          setTimeout(() => setPhotoError(null), 4000)
        })
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
          shipping_weight_grams: formData.shippingWeight,
          shipping_length_cm: formData.shippingDimensions.length,
          shipping_width_cm: formData.shippingDimensions.width,
          shipping_height_cm: formData.shippingDimensions.height,
          platform_fields: formData.platformFields,
          stash_id: formData.stashId,
        }),
      })
      if (!res.ok) await parseApiError(res, 'Failed to save')
      const result = await res.json()
      setFind(unwrapApiResponse<Find>(result))
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)

      // Queue update jobs for all listed marketplaces (non-blocking)
      // Extension drains these whenever it's active — works from mobile too
      const listedPlatforms = marketplaceData
        .filter((m) => m.status === 'listed')
        .map((m) => m.marketplace)
      if (listedPlatforms.length > 0) {
        listedPlatforms.forEach((platform) => {
          fetch('/api/jobs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ find_id: id, platform, action: 'update' }),
          }).catch(() => { /* non-fatal */ })
        })
      }

      // If Vinted listing exists, also try live update via extension (non-blocking)
      const vintedData = find.platform_fields?.vinted as Record<string, unknown> | undefined
      const vintedListingId = vintedData?.listingId
      if (vintedListingId && typeof window !== 'undefined') {
        try {
          const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
          const chrome = (window as unknown as { chrome?: { runtime?: { sendMessage?: (id: string, msg: unknown, cb: (resp: unknown) => void) => void; lastError?: { message: string } } } }).chrome
          if (chrome?.runtime) {
            chrome.runtime.sendMessage?.(EXTENSION_ID, {
              action: 'update_vinted', find: result.data, findId: id, listingId: vintedListingId,
            }, (resp: unknown) => {
              const r = resp as { ok?: boolean; error?: string } | null
              if (chrome.runtime?.lastError) console.warn('Vinted update failed:', chrome.runtime.lastError.message)
              else if (!r?.ok) console.warn('Vinted update error:', r?.error)
            })
          }
        } catch { /* non-fatal */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!find) return
    try {
      setIsSaving(true)
      setError(null)
      const res = await fetch(`/api/finds/${id}`, { method: 'DELETE' })
      if (!res.ok) await parseApiError(res, 'Failed to delete')
      router.push('/finds')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
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

      const res = await fetch(`/api/finds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'sold', sold_at: soldDate, ...(soldPrice && { sold_price_gbp: soldPrice }) }),
      })
      if (!res.ok) throw new Error('Failed to mark as sold')

      const marketplaceRes = await fetch(`/api/finds/${id}/marketplace`)
      if (marketplaceRes.ok) {
        const mpData = await marketplaceRes.json()
        const ebayListing = mpData.data?.find((m: { marketplace: string; status: string }) => m.marketplace === 'ebay')
        if (ebayListing?.status === 'listed') {
          try {
            await fetch('/api/ebay/delist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ find_id: id }) })
          } catch (e) { console.error('Failed to delist from eBay:', e) }
        }
        if (mpData.data) {
          for (const mp of mpData.data as Array<{ marketplace: string; status: string }>) {
            if (mp.marketplace !== 'ebay' && mp.status === 'listed') {
              try {
                await fetch(`/api/finds/${id}/marketplace?marketplace=${mp.marketplace}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: 'needs_delist' }),
                })
              } catch (e) { console.error(`Failed to mark ${mp.marketplace} for delist:`, e) }

              if (mp.marketplace === 'vinted' && typeof window !== 'undefined') {
                try {
                  const vintedListingId = find.platform_fields?.vinted?.['listingId']
                  if (vintedListingId) {
                    const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'
                    const chromeExt = (window as unknown as { chrome?: { runtime?: { sendMessage?: (id: string, msg: unknown, cb: (resp: unknown) => void) => void; lastError?: { message: string } } } }).chrome
                    if (chromeExt?.runtime?.sendMessage) {
                      chromeExt.runtime.sendMessage(EXTENSION_ID, { action: 'delistlistingfrommarketplace', marketplace: 'vinted', listingId: vintedListingId }, (resp: unknown) => {
                        if (chromeExt.runtime?.lastError) console.warn('Vinted delist dispatch failed:', chromeExt.runtime.lastError.message)
                        void resp
                      })
                    }
                  }
                } catch (e) { console.warn('Failed to dispatch Vinted delist:', e instanceof Error ? e.message : String(e)) }
              }
            }
          }
        }
      }

      const findRes = await fetch(`/api/finds/${id}`)
      if (findRes.ok) {
        const findData = await findRes.json()
        if (findData.data) setFind(findData.data)
      }
      refreshMarketplaceData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sold')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSyncOrders = async () => {
    try {
      setIsSyncing(true)
      setError(null)
      const res = await fetch('/api/ebay/sync-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      if (!res.ok) await parseApiError(res, 'Failed to sync orders')
      const result = await res.json()
      setError(null)
      alert(`Synced ${result.data?.ordersChecked || 0} orders, found ${result.data?.itemsSold || 0} sold items`)
      const findRes = await fetch(`/api/finds/${id}`)
      if (findRes.ok) {
        const findData = await findRes.json()
        if (findData.data) setFind(findData.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync orders')
    } finally {
      setIsSyncing(false)
    }
  }

  // Merge marketplace action errors into main error state
  useEffect(() => {
    if (marketplaceActions.actionError) {
      setError(marketplaceActions.actionError)
      marketplaceActions.setActionError(null)
    }
  }, [marketplaceActions, marketplaceActions.actionError])

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
        <button onClick={() => router.push('/finds')} className="text-sm text-sage underline underline-offset-2 hover:text-sage-dk transition">
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
        onCancel={() => { setMarkSoldConfirm(false); setMarkSoldData({ price: '', date: '' }) }}
        isLoading={isSaving}
      />
    )
  }

  if (deleteConfirm) {
    return (
      <DeleteConfirmModal
        itemName={find.name}
        isLoading={isSaving}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Link href="/finds" className="text-xs text-sage hover:text-ink mb-4 inline-flex items-center gap-1">&larr; Back to Finds</Link>

      <SessionExpiryBanner disconnected={disconnectedPlatforms} />

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
        extensionOutdated={extensionInfo.isOutdated}
        extensionOnline={heartbeat.online}
        marketplaceData={marketplaceData}
        onMarkAsSoldClick={() => setMarkSoldConfirm(true)}
        onEditClick={() => setIsEditing(true)}
        onSyncClick={handleSyncOrders}
        onListOnVintedClick={marketplaceActions.handleListOnVinted}
        onListOnEbayClick={marketplaceActions.handleListOnEbay}
        onDelistVintedClick={marketplaceActions.handleDelistFromVinted}
        onRelistVintedClick={marketplaceActions.handleRelistOnVinted}
        onCrosslistClick={() => setShowCrosslistPicker(true)}
        onCrosslistTargetToggle={(p) => setCrosslistTargets((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p])}
        onCrosslistConfirm={handleCrosslist}
        onCrosslistCancel={() => { setShowCrosslistPicker(false); setCrosslistTargets([]) }}
      />

      <FindNotificationBanners
        vintedListResult={marketplaceActions.vintedListResult}
        ebayListResult={marketplaceActions.ebayListResult}
        crosslistResult={crosslistResult}
        error={error}
        saveSuccess={saveSuccess}
        photoError={photoError}
        extensionDetected={extensionInfo.detected}
        extensionOutdated={extensionInfo.isOutdated}
        findStatus={find.status}
        onDismissVinted={() => marketplaceActions.setVintedListResult(null)}
        onDismissEbay={() => marketplaceActions.setEbayListResult(null)}
        onDismissCrosslist={() => setCrosslistResult(null)}
        onDismissPhotoError={() => setPhotoError(null)}
      />

      {!isEditing && (
        <FindViewMode
          find={find}
          photoPreviews={formData.photoPreviews}
          marketplaceData={marketplaceData}
          delistConfirm={marketplaceActions.delistConfirm}
          delistingPlatform={marketplaceActions.delistingPlatform}
          retryingPlatform={marketplaceActions.retryingPlatform}
          onDelistConfirm={marketplaceActions.setDelistConfirm}
          onDelistCancel={() => marketplaceActions.setDelistConfirm(null)}
          onDelistPlatform={marketplaceActions.handleDelistFromPlatform}
          onRetryPublish={marketplaceActions.handleRetryPublish}
          onDeleteClick={() => setDeleteConfirm(true)}
        />
      )}

      {isEditing && (
        <FindEditMode
          formData={formData}
          isSaving={isSaving}
          availablePlatforms={allConnectedPlatforms.map((cp) => cp.platform)}
          templateAppliedBanner={templateAppliedBanner}
          incompleteFields={incompleteFields}
          showSaveAsTemplate={showSaveAsTemplate}
          margin={margin}
          onInputChange={handleInputChange}
          onPlatformToggle={handlePlatformToggle}
          onAddPhotos={handleAddPhotos}
          onReplacePhotos={handleReplacePhotos}
          onRemovePhoto={handleRemovePhoto}
          onReorderPhotos={handleReorderPhotos}
          onSetMainPhoto={handleSetMainPhoto}
          onBulkRemovePhotos={handleBulkRemovePhotos}
          onUpdatePhoto={handleUpdatePhoto}
          onApplyTemplate={handleApplyTemplate}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          onShowSaveAsTemplate={setShowSaveAsTemplate}
          formDataToListingFormData={formDataToListingFormData}
        />
      )}
    </div>
  )
}
