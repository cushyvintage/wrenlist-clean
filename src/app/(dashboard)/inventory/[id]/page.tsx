'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import PhotoUpload from '@/components/listing/PhotoUpload'
import { Badge } from '@/components/wren/Badge'
import { VINTED_COLORS } from '@/data/vinted-colors'
import { CATEGORY_MAP } from '@/data/marketplace-category-map'
import type { Find, FindCondition, Platform } from '@/types'

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
  platformPrices: Record<Platform, number | null>
}

const CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'excellent', label: 'Excellent / Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair / Worn' },
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
  const [showPriceOverrides, setShowPriceOverrides] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

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

  const handleInputChange = useCallback((field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

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

  const handleRemovePhoto = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoPreviews: prev.photoPreviews.filter((_, i) => i !== index),
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

      router.push('/inventory')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleMarkSold = async () => {
    if (!find) return

    try {
      setIsSaving(true)
      setError(null)

      // Update find status to "sold"
      const res = await fetch(`/api/finds/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sold',
          sold_at: new Date().toISOString(),
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
          onClick={() => router.push('/inventory')}
          className="text-sm text-sage underline underline-offset-2 hover:text-sage-dk transition"
        >
          Back to inventory →
        </button>
      </div>
    )
  }

  if (markSoldConfirm) {
    return (
      <div className="max-w-2xl mx-auto">
        <div
          className="p-8 rounded text-center"
          style={{
            backgroundColor: '#FFF9F3',
            borderWidth: '1px',
            borderColor: 'rgba(196,138,58,.2)',
          }}
        >
          <h2 className="text-lg font-medium mb-2" style={{ color: '#1E2E1C' }}>
            Mark "{find.name}" as sold?
          </h2>
          <p className="text-sm mb-2" style={{ color: '#6B7D6A' }}>
            This will delist the item from all active marketplaces.
          </p>
          <p className="text-sm mb-6" style={{ color: '#6B7D6A' }}>
            Extension will handle Vinted delisting in the background.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setMarkSoldConfirm(false)}
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
              onClick={handleMarkSold}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#C4883A', color: '#FFF9F3' }}
              onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#A5723A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C4883A')}
            >
              {isSaving ? 'Processing...' : 'Mark as Sold'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (deleteConfirm) {
    return (
      <div className="max-w-2xl mx-auto">
        <div
          className="p-8 rounded text-center"
          style={{
            backgroundColor: '#FFF9F3',
            borderWidth: '1px',
            borderColor: 'rgba(196,138,58,.2)',
          }}
        >
          <h2 className="text-lg font-medium mb-2" style={{ color: '#1E2E1C' }}>
            Delete "{find.name}"?
          </h2>
          <p className="text-sm mb-6" style={{ color: '#6B7D6A' }}>
            This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setDeleteConfirm(false)}
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
              onClick={handleDelete}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium rounded transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#C4883A', color: '#FFF9F3' }}
              onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#A5723A')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#C4883A')}
            >
              {isSaving ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="flex items-center justify-between pb-4"
        style={{ borderBottomWidth: '1px', borderBottomColor: 'rgba(61,92,58,.14)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/inventory')}
            className="text-sm text-sage hover:text-sage-dk transition"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-medium" style={{ color: '#1E2E1C' }}>
            {find.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge status={find.status as 'draft' | 'listed' | 'on_hold' | 'sold'} />
          {!isEditing && (
            <button
              onClick={handleSyncOrders}
              disabled={isSyncing}
              className="px-3 py-1.5 text-sm font-medium rounded transition-colors disabled:opacity-50"
              title="Sync eBay orders"
              style={{
                borderWidth: '1px',
                borderColor: 'rgba(61,92,58,.22)',
                backgroundColor: 'transparent',
                color: '#3D5C3A',
              }}
              onMouseEnter={(e) => !isSyncing && (e.currentTarget.style.backgroundColor = '#EDE8DE')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {isSyncing ? '↻ Syncing...' : '↻ Sync'}
            </button>
          )}
          {!isEditing && find.status === 'listed' && (
            <button
              onClick={() => setMarkSoldConfirm(true)}
              className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
              style={{
                borderWidth: '1px',
                borderColor: 'rgba(61,92,58,.22)',
                backgroundColor: 'transparent',
                color: '#3D5C3A',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FED8B1')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Mark as Sold
            </button>
          )}
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
              style={{
                borderWidth: '1px',
                borderColor: 'rgba(61,92,58,.22)',
                backgroundColor: 'transparent',
                color: '#3D5C3A',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE8DE')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Edit
            </button>
          )}
        </div>
      </div>

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

            {/* Marketplaces */}
            {Object.keys(find.platform_fields || {}).length > 0 && (
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
                <div className="space-y-2">
                  {Object.entries(find.platform_fields || {}).map(([platform, data]: [string, any]) => (
                    <div key={platform}>
                      <p className="text-sm font-medium capitalize" style={{ color: '#1E2E1C' }}>
                        {platform}
                      </p>
                      {data?.url && (
                        <a
                          href={data.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-sage underline underline-offset-1 hover:text-sage-dk transition"
                        >
                          View listing →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
        <div className="grid grid-cols-12 gap-6">
          {/* Left: Marketplace selector */}
          <div
            className="col-span-2 space-y-3 p-4 rounded sticky top-24 h-fit"
            style={{
              backgroundColor: '#F5F0E8',
              borderWidth: '1px',
              borderColor: 'rgba(61,92,58,.14)',
            }}
          >
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
                onRemovePhoto={handleRemovePhoto}
                maxPhotos={10}
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
      )}
    </div>
  )
}
