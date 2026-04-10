'use client'

import PhotoUpload from '@/components/listing/PhotoUpload'
import TemplatePickerPopover from '@/components/templates/TemplatePickerPopover'
import SaveAsTemplateInput from '@/components/templates/SaveAsTemplateInput'
import { UNIFIED_COLOURS } from '@/data/unified-colours'
import { CATEGORY_MAP, getCategoryNode } from '@/data/marketplace-category-map'
import type { FindCondition, Platform, ListingTemplate } from '@/types'
import type { ListingFormData, PlatformFieldsData } from '@/types/listing-form'
import { useMemo } from 'react'
import StashTypeahead from '@/components/stash/StashTypeahead'

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
  .map((key) => ({ value: key, label: key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') }))

const inputStyle = {
  borderWidth: '1px',
  borderColor: 'rgba(61,92,58,.22)',
  outline: 'none',
} as const

const onFocusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = '#3D5C3A'
}

const onBlurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'rgba(61,92,58,.22)'
}

interface FindEditModeProps {
  formData: FormData
  isSaving: boolean
  templateAppliedBanner: boolean
  incompleteFields: string[]
  showSaveAsTemplate: boolean
  margin: number | null
  availablePlatforms?: Platform[]
  onInputChange: (field: keyof FormData, value: unknown) => void
  onPlatformToggle: (platform: Platform) => void
  onAddPhotos: (files: File[]) => void
  onReplacePhotos: (files: File[], previews: string[]) => void
  onRemovePhoto: (index: number) => void
  onReorderPhotos: (from: number, to: number) => void
  onSetMainPhoto: (index: number) => void
  onBulkRemovePhotos: (indices: number[]) => void
  onUpdatePhoto: (index: number, preview: string) => void
  onApplyTemplate: (template: ListingTemplate) => void
  onSave: () => void
  onCancel: () => void
  onShowSaveAsTemplate: (show: boolean) => void
  formDataToListingFormData: () => ListingFormData
}

export function FindEditMode({
  formData,
  isSaving,
  templateAppliedBanner,
  incompleteFields,
  showSaveAsTemplate,
  margin,
  availablePlatforms = ['vinted', 'ebay', 'etsy', 'shopify'] as Platform[],
  onInputChange,
  onPlatformToggle,
  onAddPhotos,
  onReplacePhotos,
  onRemovePhoto,
  onReorderPhotos,
  onSetMainPhoto,
  onBulkRemovePhotos,
  onUpdatePhoto,
  onApplyTemplate,
  onSave,
  onCancel,
  onShowSaveAsTemplate,
  formDataToListingFormData,
}: FindEditModeProps) {
  const titleCharLimit = useMemo(() => {
    if (formData.selectedPlatforms.includes('ebay')) return 80
    return 255
  }, [formData.selectedPlatforms])

  const categoryInfo = useMemo(() => {
    if (!formData.category) return null
    const node = getCategoryNode(formData.category)
    if (!node) return null
    const platforms = []
    if (node.platforms.vinted) platforms.push('Vinted')
    if (node.platforms.ebay) platforms.push('eBay')
    return platforms
  }, [formData.category])

  return (
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Marketplace selector */}
        <div
          className="col-span-1 lg:col-span-2 space-y-4 p-4 rounded lg:sticky lg:top-24 h-fit"
          style={{
            backgroundColor: '#F5F0E8',
            borderWidth: '1px',
            borderColor: 'rgba(61,92,58,.14)',
          }}
        >
          {/* Template picker */}
          <div className="space-y-2">
            <TemplatePickerPopover onSelectTemplate={onApplyTemplate} />
          </div>

          <div style={{ height: '1px', backgroundColor: 'rgba(61,92,58,.14)' }} />

          <p className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
            List On
          </p>
          {availablePlatforms.map((platform) => (
            <label
              key={platform}
              className="flex items-center gap-2 cursor-pointer"
              style={{ color: '#1E2E1C' }}
            >
              <input
                type="checkbox"
                checked={formData.selectedPlatforms.includes(platform)}
                onChange={() => onPlatformToggle(platform)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium capitalize">{platform}</span>
            </label>
          ))}
        </div>

        {/* Center: Form fields */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          {/* Photos */}
          <div>
            <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Photos
            </label>
            <PhotoUpload
              photos={formData.photos}
              photoPreviews={formData.photoPreviews}
              onAddPhotos={onAddPhotos}
              onReplacePhotos={onReplacePhotos}
              onRemovePhoto={onRemovePhoto}
              onReorder={onReorderPhotos}
              onSetMain={onSetMainPhoto}
              onBulkRemove={onBulkRemovePhotos}
              onUpdatePhoto={onUpdatePhoto}
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
              onChange={(e) => onInputChange('title', e.target.value.slice(0, titleCharLimit))}
              rows={2}
              className="w-full mt-1 p-3 rounded text-sm resize-none"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Description ({formData.description.length}/2000)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => onInputChange('description', e.target.value.slice(0, 2000))}
              rows={6}
              className="w-full mt-1 p-3 rounded text-sm resize-none"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => onInputChange('category', e.target.value)}
              className="w-full mt-1 p-2 rounded text-sm"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            >
              <option value="">Select category</option>
              {CANONICAL_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
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
              onChange={(e) => onInputChange('price', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.00"
              step="0.01"
              className="w-full mt-1 p-2 rounded text-sm"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
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
              onChange={(e) => onInputChange('brand', e.target.value)}
              className="w-full mt-1 p-2 rounded text-sm"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            />
          </div>

          {/* Condition */}
          <div>
            <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Condition
            </label>
            <select
              value={formData.condition}
              onChange={(e) => onInputChange('condition', e.target.value as FindCondition)}
              className="w-full mt-1 p-2 rounded text-sm"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
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
              onChange={(e) => onInputChange('quantity', parseInt(e.target.value) || 1)}
              min="1"
              className="w-full mt-1 p-2 rounded text-sm"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            />
          </div>

          {/* Shipping Weight */}
          <div>
            <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Shipping Weight (kg)
            </label>
            <input
              type="number"
              value={formData.shippingWeight ?? ''}
              onChange={(e) => onInputChange('shippingWeight', e.target.value ? parseFloat(e.target.value) : null)}
              step="0.1"
              className="w-full mt-1 p-2 rounded text-sm"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            />
          </div>

          {/* Shipping dimensions */}
          <div>
            <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Shipping Dimensions (cm)
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(['length', 'width', 'height'] as const).map((dim) => (
                <input
                  key={dim}
                  type="number"
                  placeholder={dim}
                  value={formData.shippingDimensions[dim] ?? ''}
                  onChange={(e) =>
                    onInputChange('shippingDimensions', {
                      ...formData.shippingDimensions,
                      [dim]: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="p-2 rounded text-sm"
                  style={inputStyle}
                  onFocus={onFocusStyle}
                  onBlur={onBlurStyle}
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
                      onInputChange('platformFields', {
                        ...formData.platformFields,
                        vinted: {
                          ...formData.platformFields.vinted,
                          primaryColor: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full mt-1 p-2 rounded text-sm"
                    style={inputStyle}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle}
                  >
                    <option value="">Select colour</option>
                    {UNIFIED_COLOURS.filter(c => c.vintedId).map((color) => (
                      <option key={color.vintedId} value={color.vintedId!}>
                        {color.label}
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
                      onInputChange('platformFields', {
                        ...formData.platformFields,
                        vinted: {
                          ...formData.platformFields.vinted,
                          secondaryColor: e.target.value ? parseInt(e.target.value) : undefined,
                        },
                      })
                    }
                    className="w-full mt-1 p-2 rounded text-sm"
                    style={inputStyle}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle}
                  >
                    <option value="">Select colour (optional)</option>
                    {UNIFIED_COLOURS.filter(c => c.vintedId).map((color) => (
                      <option key={color.vintedId} value={color.vintedId!}>
                        {color.label}
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
                      onInputChange('platformFields', {
                        ...formData.platformFields,
                        vinted: {
                          ...formData.platformFields.vinted,
                          conditionDescription: e.target.value || undefined,
                        },
                      })
                    }
                    rows={3}
                    className="w-full mt-1 p-2 rounded text-sm resize-none"
                    style={inputStyle}
                    onFocus={onFocusStyle}
                    onBlur={onBlurStyle}
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
                      onInputChange('platformFields', {
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
                      onInputChange('platformFields', {
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
                onClick={() => onShowSaveAsTemplate(true)}
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
                onShowSaveAsTemplate(false)
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
              onClose={() => onShowSaveAsTemplate(false)}
            />
          )}
        </div>

        {/* Right: Internal fields */}
        <div
          className="col-span-1 lg:col-span-3 space-y-4 p-4 rounded lg:sticky lg:top-24 h-fit"
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
              onChange={(e) => onInputChange('sku', e.target.value)}
              className="w-full mt-1 p-2 rounded text-sm"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
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
              onChange={(e) => onInputChange('costPrice', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="0.00"
              step="0.01"
              className="w-full mt-1 p-2 rounded text-sm"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            />
            {margin !== null && (
              <p className="text-xs mt-1 font-mono" style={{ color: '#4A5E48' }}>
                Margin: {margin}%
              </p>
            )}
          </div>

          {/* Stash */}
          <div>
            <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Stash
            </label>
            <div className="mt-1">
              <StashTypeahead
                value={formData.stashId}
                onChange={(id) => onInputChange('stashId', id)}
              />
            </div>
          </div>

          {/* Internal note */}
          <div>
            <label className="text-xs uppercase tracking-wider font-medium" style={{ color: '#8A9E88' }}>
              Internal Note
            </label>
            <textarea
              value={formData.internalNote}
              onChange={(e) => onInputChange('internalNote', e.target.value)}
              rows={4}
              className="w-full mt-1 p-2 rounded text-sm resize-none"
              style={inputStyle}
              onFocus={onFocusStyle}
              onBlur={onBlurStyle}
            />
          </div>
        </div>

        {/* Edit mode action bar */}
        <div
          className="col-span-1 lg:col-span-12 sticky bottom-0 flex items-center justify-between gap-2 p-4 rounded mt-6"
          style={{
            backgroundColor: '#F5F0E8',
            borderWidth: '1px',
            borderColor: 'rgba(61,92,58,.14)',
          }}
        >
          <button
            onClick={onCancel}
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
            onClick={onSave}
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
  )
}
