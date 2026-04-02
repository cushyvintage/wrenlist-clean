'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import PhotoUpload from '@/components/listing/PhotoUpload'
import { VINTED_COLORS } from '@/data/vinted-colors'
import { CATEGORY_MAP } from '@/data/marketplace-category-map'
import { FindCondition, Platform } from '@/types'

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
  // Canonical fields
  title: string
  description: string
  category: string
  price: number | null
  brand: string
  condition: FindCondition
  quantity: number

  // Photos
  photos: File[]
  photoPreviews: string[]

  // Platform selection
  selectedPlatforms: Platform[]

  // Platform-specific fields
  platformFields: PlatformFieldsData

  // Shipping
  shippingWeight: number | null
  shippingDimensions: {
    length: number | null
    width: number | null
    height: number | null
  }

  // Internal fields
  sku: string
  costPrice: number | null
  internalNote: string

  // Pricing overrides
  platformPrices: Record<Platform, number | null>
}

const CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'excellent', label: 'Excellent / Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair / Worn' },
]

const CANONICAL_CATEGORIES = Object.keys(CATEGORY_MAP).sort()

export default function AddFindPage() {
  const router = useRouter()
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
    selectedPlatforms: ['vinted'],
    platformFields: {},
    shippingWeight: null,
    shippingDimensions: { length: null, width: null, height: null },
    sku: '',
    costPrice: null,
    internalNote: '',
    platformPrices: { vinted: null, ebay: null, etsy: null, shopify: null },
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPriceOverrides, setShowPriceOverrides] = useState(false)

  // Handle form field changes
  const handleInputChange = useCallback(
    (field: keyof FormData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    },
    []
  )

  // Handle platform selection
  const handlePlatformToggle = useCallback((platform: Platform) => {
    setFormData((prev) => {
      const isSelected = prev.selectedPlatforms.includes(platform)
      return {
        ...prev,
        selectedPlatforms: isSelected
          ? prev.selectedPlatforms.filter((p) => p !== platform)
          : [...prev.selectedPlatforms, platform],
      }
    })
  }, [])

  // Handle photos
  const handleAddPhotos = useCallback((files: File[]) => {
    setFormData((prev) => {
      const newPhotos = [...prev.photos, ...files].slice(0, 10)
      const newPreviews = newPhotos.map((file) => URL.createObjectURL(file))
      return {
        ...prev,
        photos: newPhotos,
        photoPreviews: newPreviews,
      }
    })
  }, [])

  const handleRemovePhoto = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoPreviews: prev.photoPreviews.filter((_, i) => i !== index),
    }))
  }, [])

  // Handle platform-specific fields
  const handlePlatformFieldChange = useCallback(
    (platform: Platform, field: string, value: any) => {
      setFormData((prev) => ({
        ...prev,
        platformFields: {
          ...prev.platformFields,
          [platform]: {
            ...((prev.platformFields as any)[platform] || {}),
            [field]: value,
          },
        },
      }))
    },
    []
  )

  // Calculate title char limit based on platforms
  const titleCharLimit = useMemo(() => {
    if (formData.selectedPlatforms.includes('ebay')) {
      return 80
    }
    return 255
  }, [formData.selectedPlatforms])

  // Get category info for selected platforms
  const categoryInfo = useMemo(() => {
    if (!formData.category) return null
    return CATEGORY_MAP[formData.category] || null
  }, [formData.category])

  // Handle save (draft)
  const handleSaveDraft = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/finds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.title,
          description: formData.description,
          category: formData.category,
          asking_price_gbp: formData.price,
          brand: formData.brand,
          condition: formData.condition,
          sku: formData.sku || null,
          cost_gbp: formData.costPrice,
          platform_fields: {
            ...formData.platformFields,
            selectedPlatforms: formData.selectedPlatforms,
            shippingWeight: formData.shippingWeight,
            shippingDimensions: formData.shippingDimensions,
            platformPrices: formData.platformPrices,
          },
          status: 'draft',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error((errorData as any).error || 'Failed to save draft')
      }

      const data = await response.json()
      router.push(`/inventory`)
    } catch (err) {
      setError((err as any).message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle publish
  const handlePublish = async () => {
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }
    if (!formData.category) {
      setError('Category is required')
      return
    }
    if (formData.selectedPlatforms.length === 0) {
      setError('Select at least one marketplace')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/finds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.title,
          description: formData.description,
          category: formData.category,
          asking_price_gbp: formData.price,
          brand: formData.brand,
          condition: formData.condition,
          sku: formData.sku || null,
          cost_gbp: formData.costPrice,
          platform_fields: {
            ...formData.platformFields,
            selectedPlatforms: formData.selectedPlatforms,
            shippingWeight: formData.shippingWeight,
            shippingDimensions: formData.shippingDimensions,
            platformPrices: formData.platformPrices,
          },
          status: 'listed',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error((errorData as any).error || 'Failed to publish')
      }

      const data = await response.json()
      router.push(`/inventory`)
    } catch (err) {
      setError((err as any).message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-sage/14 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-sage-lt hover:text-sage transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-xl font-semibold text-ink">Add a find</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-4 mt-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* LEFT PANEL - Marketplace Selector */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg border border-sage/14 p-6 sticky top-24">
              <h2 className="text-sm font-semibold text-ink mb-4">Where to list</h2>
              <div className="space-y-3">
                {(['vinted', 'ebay'] as Platform[]).map((platform) => (
                  <label key={platform} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={formData.selectedPlatforms.includes(platform)}
                      onChange={() => handlePlatformToggle(platform)}
                      className="w-4 h-4 border border-sage/30 rounded cursor-pointer"
                    />
                    <span className="text-sm text-ink group-hover:text-sage transition-colors">
                      {platform === 'vinted' ? 'Vinted' : 'eBay UK'}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* CENTRE PANEL - Main Form */}
          <div className="col-span-7 space-y-6">
            {/* Photos */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <h3 className="text-sm font-semibold text-ink mb-4">Photos</h3>
              <PhotoUpload
                photos={formData.photos}
                photoPreviews={formData.photoPreviews}
                onAddPhotos={handleAddPhotos}
                onRemovePhoto={handleRemovePhoto}
                maxPhotos={10}
              />
            </div>

            {/* Title */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <label className="block text-sm font-semibold text-ink mb-2">Title</label>
              <textarea
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value.slice(0, titleCharLimit))}
                className="w-full px-3 py-2 border border-sage/14 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
                rows={2}
                placeholder="Item title"
              />
              <div className="text-xs text-sage-dim mt-1">
                {formData.title.length}/{titleCharLimit}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <label className="block text-sm font-semibold text-ink mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value.slice(0, 2000))}
                className="w-full px-3 py-2 border border-sage/14 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
                rows={4}
                placeholder="Describe the item..."
              />
              <div className="text-xs text-sage-dim mt-1">
                {formData.description.length}/2000
              </div>
            </div>

            {/* Category */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <label className="block text-sm font-semibold text-ink mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              >
                <option value="">Select a category</option>
                {CANONICAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
              {categoryInfo && (
                <div className="mt-3 p-3 bg-cream-md rounded text-xs text-sage-dim">
                  <p>
                    {formData.selectedPlatforms.includes('ebay') && (
                      <span className="block">eBay: {categoryInfo.ebayName}</span>
                    )}
                  </p>
                  <p>
                    {formData.selectedPlatforms.includes('vinted') && categoryInfo.vintedName && (
                      <span className="block">Vinted: {categoryInfo.vintedName}</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Price & Platform Pricing */}
            <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Price</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-sage-dim">£</span>
                  <input
                    type="number"
                    value={formData.price ?? ''}
                    onChange={(e) =>
                      handleInputChange('price', e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="flex-1 px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowPriceOverrides(!showPriceOverrides)}
                className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
              >
                {showPriceOverrides ? 'Hide' : 'Adjust prices per marketplace'} →
              </button>

              {showPriceOverrides && (
                <div className="space-y-3 pt-3 border-t border-sage/14">
                  {formData.selectedPlatforms.map((platform) => (
                    <div key={platform} className="flex items-center gap-2">
                      <label className="text-xs text-sage-dim w-16">
                        {platform === 'vinted' ? 'Vinted' : 'eBay'}
                      </label>
                      <span className="text-xs text-sage-dim">£</span>
                      <input
                        type="number"
                        value={formData.platformPrices[platform] ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            platformPrices: {
                              ...prev.platformPrices,
                              [platform]: e.target.value ? parseFloat(e.target.value) : null,
                            },
                          }))
                        }
                        className="flex-1 px-2 py-1 border border-sage/14 rounded text-xs focus:outline-none focus:ring-2 focus:ring-sage/30"
                        placeholder={formData.price?.toString() || '0.00'}
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* eBay-only fields */}
              {formData.selectedPlatforms.includes('ebay') && (
                <div className="pt-3 border-t border-sage/14 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.platformFields.ebay?.acceptOffers) ?? false}
                      onChange={(e) =>
                        handlePlatformFieldChange('ebay', 'acceptOffers', e.target.checked)
                      }
                      className="w-4 h-4 border border-sage/30 rounded"
                    />
                    <span className="text-xs text-ink">Accept offers</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(formData.platformFields.ebay?.isAuction) ?? false}
                      onChange={(e) =>
                        handlePlatformFieldChange('ebay', 'isAuction', e.target.checked)
                      }
                      className="w-4 h-4 border border-sage/30 rounded"
                    />
                    <span className="text-xs text-ink">Is auction</span>
                  </label>
                </div>
              )}
            </div>

            {/* Brand */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <label className="block text-sm font-semibold text-ink mb-2">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => handleInputChange('brand', e.target.value)}
                className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                placeholder="Leave blank if unsure"
              />
            </div>

            {/* Condition */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <label className="block text-sm font-semibold text-ink mb-2">Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => handleInputChange('condition', e.target.value as FindCondition)}
                className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
              >
                {CONDITIONS.map((cond) => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <label className="block text-sm font-semibold text-ink mb-2">Quantity</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange('quantity', Math.max(1, parseInt(e.target.value) || 1))
                  }
                  min="1"
                  className="w-20 px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
                <span className="text-xs text-sage-dim">pcs</span>
              </div>
            </div>

            {/* Vinted-specific fields */}
            {formData.selectedPlatforms.includes('vinted') && (
              <>
                {/* Primary Colour */}
                <div className="bg-white rounded-lg border border-sage/14 p-6">
                  <label className="block text-sm font-semibold text-ink mb-2">Primary colour</label>
                  <select
                    value={(formData.platformFields.vinted?.primaryColor) ?? ''}
                    onChange={(e) =>
                      handlePlatformFieldChange('vinted', 'primaryColor', e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                  >
                    <option value="">Select a colour</option>
                    {VINTED_COLORS.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Secondary Colour */}
                <div className="bg-white rounded-lg border border-sage/14 p-6">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Secondary colour <span className="text-xs text-sage-dim font-normal">(optional)</span>
                  </label>
                  <select
                    value={(formData.platformFields.vinted?.secondaryColor) ?? ''}
                    onChange={(e) =>
                      handlePlatformFieldChange('vinted', 'secondaryColor', e.target.value ? parseInt(e.target.value) : undefined)
                    }
                    className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                  >
                    <option value="">None</option>
                    {VINTED_COLORS.map((color) => (
                      <option key={color.id} value={color.id}>
                        {color.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Condition Description */}
                <div className="bg-white rounded-lg border border-sage/14 p-6">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Condition description <span className="text-xs text-sage-dim font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={(formData.platformFields.vinted?.conditionDescription) ?? ''}
                    onChange={(e) =>
                      handlePlatformFieldChange('vinted', 'conditionDescription', e.target.value)
                    }
                    className="w-full px-3 py-2 border border-sage/14 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
                    rows={3}
                    placeholder="e.g. Small stain on cuff..."
                  />
                </div>

                {/* Material (placeholder) */}
                <div className="bg-white rounded-lg border border-sage/14 p-6">
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Material <span className="text-xs text-sage-dim font-normal">(optional, up to 3)</span>
                  </label>
                  <p className="text-xs text-sage-dim mb-3">Material selection coming soon</p>
                </div>
              </>
            )}

            {/* Shipping */}
            <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-ink">Shipping</h3>

              <div>
                <label className="block text-xs text-sage-dim mb-2">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.shippingWeight ?? ''}
                  onChange={(e) =>
                    handleInputChange('shippingWeight', e.target.value ? parseFloat(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                  placeholder="0.00"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-xs text-sage-dim mb-2">Dimensions (L × W × H, cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={formData.shippingDimensions.length ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shippingDimensions: {
                          ...prev.shippingDimensions,
                          length: e.target.value ? parseFloat(e.target.value) : null,
                        },
                      }))
                    }
                    className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                    placeholder="Length"
                    step="0.1"
                  />
                  <input
                    type="number"
                    value={formData.shippingDimensions.width ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shippingDimensions: {
                          ...prev.shippingDimensions,
                          width: e.target.value ? parseFloat(e.target.value) : null,
                        },
                      }))
                    }
                    className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                    placeholder="Width"
                    step="0.1"
                  />
                  <input
                    type="number"
                    value={formData.shippingDimensions.height ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shippingDimensions: {
                          ...prev.shippingDimensions,
                          height: e.target.value ? parseFloat(e.target.value) : null,
                        },
                      }))
                    }
                    className="px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                    placeholder="Height"
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Internal Fields */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg border border-sage/14 p-6 sticky top-24 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Cost price</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-sage-dim">£</span>
                  <input
                    type="number"
                    value={formData.costPrice ?? ''}
                    onChange={(e) =>
                      handleInputChange('costPrice', e.target.value ? parseFloat(e.target.value) : null)
                    }
                    className="flex-1 px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                {formData.price && formData.costPrice && (
                  <div className="text-xs text-sage-dim mt-1">
                    Margin: {Math.round(((formData.price - formData.costPrice) / formData.price) * 100)}%
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Internal note</label>
                <textarea
                  value={formData.internalNote}
                  onChange={(e) => handleInputChange('internalNote', e.target.value)}
                  className="w-full px-3 py-2 border border-sage/14 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
                  rows={4}
                  placeholder="For your reference only"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="sticky bottom-0 bg-white border-t border-sage/14 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-sage-lt hover:text-sage transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isLoading}
              className="px-4 py-2 text-sm border border-sage/14 rounded hover:bg-cream-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save draft'}
            </button>
            <button
              onClick={handlePublish}
              disabled={isLoading}
              className="px-4 py-2 text-sm bg-sage text-white rounded hover:bg-sage-lt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
