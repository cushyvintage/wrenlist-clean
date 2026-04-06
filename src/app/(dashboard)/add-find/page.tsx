'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { arrayMove } from '@dnd-kit/sortable'
import PhotoUpload from '@/components/listing/PhotoUpload'
import CategoryPicker from '@/components/listing/CategoryPicker'
import TemplatePickerPopover from '@/components/templates/TemplatePickerPopover'
import SaveAsTemplateInput from '@/components/templates/SaveAsTemplateInput'
import PlatformSelector from '@/components/add-find/PlatformSelector'
import ISBNLookup from '@/components/add-find/ISBNLookup'
import { VINTED_COLORS } from '@/data/vinted-colors'
import { CATEGORY_MAP } from '@/data/marketplace-category-map'
import { generateSKU } from '@/lib/sku'
import { applyTemplate } from '@/lib/templates/apply-template'
import { FindCondition, Platform, CategoryFieldConfig, FieldConfig, ListingTemplate } from '@/types'

declare const chrome: any

interface PlatformFieldsData {
  shared?: Record<string, string | string[] | boolean | undefined>
  vinted?: {
    primaryColor?: number
    secondaryColor?: number
    conditionDescription?: string
    material?: number[]
    author?: string
    isbn?: string
    language?: string
  }
  ebay?: {
    acceptOffers?: boolean
    isAuction?: boolean
    author?: string
    isbn?: string
    language?: string
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

  // Sourcing trip link
  sourcingTripId: string | null

  // Pricing overrides
  platformPrices: Partial<Record<Platform, number | null>>
}

const CONDITIONS: { value: FindCondition; label: string }[] = [
  { value: 'excellent', label: 'Excellent / Like new' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair / Worn' },
]

const CANONICAL_CATEGORIES = Object.keys(CATEGORY_MAP)
  .sort()
  .map(key => ({ value: key, label: key.charAt(0).toUpperCase() + key.slice(1) }))

export default function AddFindPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
    sourcingTripId: null,
    platformPrices: { vinted: null, ebay: null, etsy: null, shopify: null },
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPriceOverrides, setShowPriceOverrides] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fieldConfig, setFieldConfig] = useState<Record<string, FieldConfig> | null>(null)
  const [shopifyShopId, setShopifyShopId] = useState<string | null>(null)
  const [incompleteRequiredFields, setIncompleteRequiredFields] = useState<Set<string>>(new Set())
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)
  const [templateAppliedBanner, setTemplateAppliedBanner] = useState<string | null>(null)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<{
    category: string
    confidence: 'high' | 'medium' | 'low'
  } | null>(null)
  const [dismissedAutoDetection, setDismissedAutoDetection] = useState(false)
  const [sourcingTripName, setSourcingTripName] = useState<string | null>(null)
  const [isbnLookupOpen, setIsbnLookupOpen] = useState(false)
  const [classifyingPhotoIndex, setClassifyingPhotoIndex] = useState<number | null>(null)

  // Fetch Shopify store domain on component mount
  useEffect(() => {
    const fetchShopifyConnection = async () => {
      try {
        const response = await fetch('/api/shopify/connect')
        if (response.ok) {
          const data = await response.json()
          if (data.data.connected && data.data.storeDomain) {
            // Extract shop ID from domain (e.g., "pyedpp-i5" from "pyedpp-i5.myshopify.com")
            const shopId = data.data.storeDomain.split('.')[0]
            setShopifyShopId(shopId)
          }
        }
      } catch (err) {
        // Silently fail — Shopify not connected
      }
    }

    fetchShopifyConnection()
  }, [])

  // Handle URL params on mount
  useEffect(() => {
    // Check if saveAsTemplate param is set, auto-open the save-as-template input
    const saveAsTemplateParam = searchParams.get('saveAsTemplate')
    if (saveAsTemplateParam === 'true') {
      setShowSaveAsTemplate(true)
    }

    // Pre-fill from scanner params (title, category, brand, ean)
    const titleParam = searchParams.get('title')
    const categoryParam = searchParams.get('category')
    const brandParam = searchParams.get('brand')
    const eanParam = searchParams.get('ean')
    if (titleParam || categoryParam || brandParam || eanParam) {
      setFormData((prev) => ({
        ...prev,
        ...(titleParam && { title: titleParam }),
        ...(categoryParam && { category: categoryParam }),
        ...(brandParam && { brand: brandParam }),
        ...(eanParam && {
          platformFields: {
            ...prev.platformFields,
            vinted: { ...prev.platformFields.vinted, isbn: eanParam },
            ebay: { ...prev.platformFields.ebay, isbn: eanParam },
          },
        }),
      }))
    }

    // Check if sourcingTripId param is set, fetch trip name
    const sourcingTripIdParam = searchParams.get('sourcingTripId')
    if (sourcingTripIdParam) {
      const fetchTripName = async () => {
        try {
          const response = await fetch(`/api/sourcing/${sourcingTripIdParam}`)
          if (!response.ok) {
            throw new Error('Failed to load trip')
          }
          const { data: trip } = await response.json()
          setFormData((prev) => ({
            ...prev,
            sourcingTripId: sourcingTripIdParam,
          }))
          setSourcingTripName(trip.name)
        } catch (err) {
          console.error('Failed to load sourcing trip:', err)
        }
      }

      fetchTripName()
    }

    // Check if templateId param is set, auto-apply the template
    const templateId = searchParams.get('templateId')
    if (templateId) {
      const autoApplyTemplate = async () => {
        try {
          const response = await fetch(`/api/templates/${templateId}`)
          if (!response.ok) {
            throw new Error('Failed to load template')
          }
          const { data: template } = await response.json()
          const result = applyTemplate(template, formData)
          setFormData(prev => ({ ...result.merged, sourcingTripId: prev.sourcingTripId }))
          setIncompleteRequiredFields(new Set(result.incompleteRequiredFields))
          setTemplateAppliedBanner(template.name)
          // Auto-dismiss banner after 3 seconds
          setTimeout(() => setTemplateAppliedBanner(null), 3000)
          // Increment usage count
          await fetch(`/api/templates/${templateId}`, { method: 'PATCH' })
        } catch (err) {
          console.error('Failed to auto-apply template:', err)
        }
      }

      autoApplyTemplate()
    }
  }, [searchParams])

  // Handle form field changes
  const handleInputChange = useCallback(
    (field: keyof FormData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
      // Clear incomplete field flag when user interacts
      setIncompleteRequiredFields((prev) => {
        const updated = new Set(prev)
        updated.delete(field)
        return updated
      })
    },
    []
  )

  // Apply a template to the current form
  const handleApplyTemplate = useCallback((template: ListingTemplate) => {
    const result = applyTemplate(template, formData)
    setFormData(prev => ({ ...result.merged, sourcingTripId: prev.sourcingTripId }))
    setIncompleteRequiredFields(new Set(result.incompleteRequiredFields))
    setTemplateAppliedBanner(template.name)
    // Auto-dismiss banner after 3 seconds
    setTimeout(() => setTemplateAppliedBanner(null), 3000)
    // Increment usage count
    fetch(`/api/templates/${template.id}`, { method: 'PATCH' }).catch((err) => {
      console.error('Failed to increment template usage:', err)
    })
  }, [formData])

  // Fetch category field config for ALL selected platforms and merge
  useEffect(() => {
    if (!formData.category || formData.selectedPlatforms.length === 0) {
      setFieldConfig(null)
      return
    }

    const controller = new AbortController()

    const fetchFieldConfig = async () => {
      try {
        const cacheBust = new Date().toISOString().slice(0, 10)
        const platforms = formData.selectedPlatforms

        // Fetch field config for each selected platform in parallel
        const results = await Promise.all(
          platforms.map(async (platform) => {
            const res = await fetch(
              `/api/config/category-fields?category=${formData.category}&marketplace=${platform}&d=${cacheBust}`,
              { signal: controller.signal }
            )
            if (!res.ok) return null
            const config = await res.json()
            return config.fields as Record<string, FieldConfig>
          })
        )

        if (controller.signal.aborted) return

        // Merge: field shows if ANY platform needs it, required if ANY requires it
        const merged: Record<string, FieldConfig> = {}
        for (const fields of results) {
          if (!fields) continue
          for (const [key, val] of Object.entries(fields)) {
            if (!merged[key]) {
              merged[key] = { ...val }
            } else {
              if (val.show) merged[key].show = true
              if (val.required) merged[key].required = true
              if (val.options && !merged[key].options) merged[key].options = val.options
            }
          }
        }

        setFieldConfig(Object.keys(merged).length > 0 ? merged : null)
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('Error fetching field config:', err)
        setFieldConfig(null)
      }
    }

    fetchFieldConfig()
    return () => controller.abort()
  }, [formData.category, formData.selectedPlatforms])

  // Handle SKU regeneration
  const handleRegenerateSKU = useCallback(() => {
    if (formData.category) {
      // Generate a new SKU client-side for preview
      // Actual uniqueness checked on save (API will re-validate or generate if needed)
      setFormData((prev) => ({
        ...prev,
        sku: generateSKU(prev.category),
      }))
    }
  }, [formData.category])

  // Handle photo classification for category detection
  const handleClassifyPhoto = useCallback(
    async (index: number) => {
      if (!formData.photoPreviews[index]) return

      const photoUrl = formData.photoPreviews[index]
      // Only classify public URLs from Supabase (not blob URLs)
      if (!photoUrl.startsWith('http')) return

      setClassifyingPhotoIndex(index)

      try {
        const response = await fetch('/api/ai/classify-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl }),
        })

        if (!response.ok) {
          throw new Error('Failed to classify photo')
        }

        const data = await response.json()

        // Auto-select category if confidence is high
        if (data.confidence === 'high' && !formData.category) {
          handleInputChange('category', data.category)
        }

        setAutoDetectedCategory(data)
        setTimeout(() => setAutoDetectedCategory(null), 3000)
      } catch (err) {
        console.error('Failed to classify photo:', err)
      } finally {
        setClassifyingPhotoIndex(null)
      }
    },
    [formData.photoPreviews, formData.category]
  )

  // Handle description generation
  const handleGenerateDescription = useCallback(async () => {
    if (!formData.title || !formData.category) {
      setError('Title and category are required to generate description')
      return
    }

    setIsGeneratingDescription(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          brand: formData.brand || undefined,
          condition: formData.condition,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error((errorData as any).error || 'Failed to generate description')
      }

      const data = await response.json()
      handleInputChange('description', data.description)
    } catch (err) {
      setError((err as any).message || 'Failed to generate description')
    } finally {
      setIsGeneratingDescription(false)
    }
  }, [formData.title, formData.category, formData.brand, formData.condition])

  // Classify first photo when photos change
  useEffect(() => {
    const classifyFirstPhoto = async () => {
      if (!formData.photoPreviews.length || formData.category || dismissedAutoDetection) {
        return
      }

      // Only try to classify if we have a URL from Supabase (not a blob URL)
      const firstPhoto = formData.photoPreviews[0]
      if (!firstPhoto || !firstPhoto.startsWith('http')) {
        return
      }

      try {
        const response = await fetch('/api/ai/classify-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: firstPhoto }),
        })

        if (response.ok) {
          const data = await response.json()
          setAutoDetectedCategory(data)
        }
      } catch (err) {
        // Silently fail — photo classification is optional
        console.error('Failed to classify photo:', err)
      }
    }

    classifyFirstPhoto()
  }, [formData.photoPreviews, formData.category, dismissedAutoDetection])

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
      const newPhotos = [...prev.photos, ...files]
      const newPreviews = [
        ...prev.photoPreviews,
        ...files.map((f) => URL.createObjectURL(f)),
      ]
      return {
        ...prev,
        photos: newPhotos,
        photoPreviews: newPreviews,
      }
    })
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

  const handleUpdatePhoto = useCallback((index: number, preview: string) => {
    setFormData((prev) => ({
      ...prev,
      photoPreviews: prev.photoPreviews.map((p, i) => (i === index ? preview : p)),
    }))
  }, [])

  const handleSetMainPhoto = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: arrayMove(prev.photos, index, 0),
      photoPreviews: arrayMove(prev.photoPreviews, index, 0),
    }))
  }, [])

  const handleBulkRemovePhotos = useCallback((indices: number[]) => {
    const sortedDesc = [...indices].sort((a, b) => b - a)
    setFormData((prev) => {
      const newPhotos = [...prev.photos]
      const newPreviews = [...prev.photoPreviews]
      for (const idx of sortedDesc) {
        newPhotos.splice(idx, 1)
        newPreviews.splice(idx, 1)
      }
      return { ...prev, photos: newPhotos, photoPreviews: newPreviews }
    })
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
      // Clear incomplete platform field flag when user interacts
      setIncompleteRequiredFields((prev) => {
        const updated = new Set(prev)
        updated.delete(`platformFields.${platform}`)
        return updated
      })
    },
    []
  )

  /** Update shared marketplace fields (colour text, type, style, etc.) */
  const handleSharedFieldChange = useCallback(
    (field: string, value: string | string[] | boolean | undefined) => {
      setFormData((prev) => ({
        ...prev,
        platformFields: {
          ...prev.platformFields,
          shared: {
            ...(prev.platformFields.shared || {}),
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

  // Upload photos to Supabase Storage
  const uploadPhotosToStorage = async (findId: string): Promise<string[]> => {
    if (!formData.photos.length) return []

    const uploadFormData = new FormData()
    uploadFormData.append('find_id', findId)
    formData.photos.forEach((photo) => {
      uploadFormData.append('photos', photo)
    })

    const uploadResponse = await fetch('/api/finds/upload-photos', {
      method: 'POST',
      body: uploadFormData,
    })

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      throw new Error((errorData as any).error || 'Failed to upload photos')
    }

    const uploadData = await uploadResponse.json()
    return uploadData.urls || []
  }

  // Handle save (draft)
  const handleSaveDraft = async () => {
    setIsLoading(true)
    setError(null)
    setUploadProgress(0)
    try {
      // Pre-flight: check plan limit before attempting save
      const planCheck = await fetch('/api/finds?limit=1&offset=0&source_type=manual')
      if (planCheck.ok) {
        const planData = await planCheck.json()
        const total = planData?.data?.pagination?.total ?? 0
        const planLimits: Record<string, number | null> = { free: 5, nester: 10, picker: 50, trader: null }
        const profileRes = await fetch('/api/profile')
        if (profileRes.ok) {
          const profile = await profileRes.json()
          const plan = profile?.data?.plan ?? 'free'
          const limit = planLimits[plan] ?? null
          if (limit !== null && total >= limit) {
            throw new Error(`You\'ve reached your ${limit}-find limit on the ${plan.charAt(0).toUpperCase()+plan.slice(1)} plan. Upgrade to add more finds.`)
          }
        }
      }
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
          sourcing_trip_id: formData.sourcingTripId,
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
      const findId = data?.data?.id || data?.id

      // Upload photos if any
      if (findId && formData.photos.length > 0) {
        setError('Uploading photos...')
        const photoUrls = await uploadPhotosToStorage(findId)
        setUploadProgress(50)

        // Update find with photo URLs
        const patchResponse = await fetch(`/api/finds/${findId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: photoUrls }),
        })

        if (!patchResponse.ok) {
          const errorData = await patchResponse.json()
          throw new Error((errorData as any).error || 'Failed to update photos')
        }
      }

      setUploadProgress(100)
      router.push(`/finds`)
    } catch (err) {
      setError((err as any).message || 'An error occurred')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
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

    // Block publish if field config hasn't loaded yet
    if (formData.category && formData.selectedPlatforms.length > 0 && !fieldConfig) {
      setError('Loading field requirements — please try again')
      return
    }

    // Validate required marketplace fields
    if (fieldConfig) {
      const missing: string[] = []
      for (const [key, config] of Object.entries(fieldConfig)) {
        if (!config.required) continue
        // brand is a canonical field, not in shared
        if (key === 'brand') {
          if (!formData.brand.trim()) missing.push('Brand')
          continue
        }
        // colour: check both Vinted picker and shared text
        if (key === 'colour') {
          const hasVintedColour = formData.selectedPlatforms.includes('vinted') && formData.platformFields.vinted?.primaryColor
          const hasSharedColour = formData.platformFields.shared?.colour && String(formData.platformFields.shared.colour).trim()
          if (!hasVintedColour && !hasSharedColour) missing.push('Colour')
          continue
        }
        // All other fields live in shared
        const val = formData.platformFields.shared?.[key]
        if (!val || (typeof val === 'string' && !val.trim())) {
          missing.push(key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
        }
      }
      if (missing.length > 0) {
        setError(`Required fields missing: ${missing.join(', ')}`)
        return
      }
    }

    setIsLoading(true)
    setError(null)
    setUploadProgress(0)
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
          sourcing_trip_id: formData.sourcingTripId,
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
      const findId = data?.data?.id || data?.id

      // Upload photos if any
      let uploadedPhotoUrls: string[] = []
      if (findId && formData.photos.length > 0) {
        setError('Uploading photos...')
        uploadedPhotoUrls = await uploadPhotosToStorage(findId)
        setUploadProgress(50)

        // Update find with photo URLs
        const patchResponse = await fetch(`/api/finds/${findId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: uploadedPhotoUrls }),
        })

        if (!patchResponse.ok) {
          const errorData = await patchResponse.json()
          throw new Error((errorData as any).error || 'Failed to update photos')
        }
      }

      setUploadProgress(75)

      // Publish to selected marketplaces via unified crosslist endpoint
      if (formData.selectedPlatforms.length > 0) {
        setError('Publishing to marketplaces...')
        try {
          const crosslistRes = await fetch('/api/crosslist/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              findId,
              marketplaces: formData.selectedPlatforms,
            }),
          })
          const crosslistData = await crosslistRes.json()
          const results = crosslistData.data?.results || {}

          const failures = Object.entries(results)
            .filter(([, r]: [string, unknown]) => !(r as { ok: boolean }).ok)
            .map(([p, r]: [string, unknown]) => `${p}: ${(r as { error?: string }).error}`)

          if (failures.length > 0) {
            setError(`Saved but publish failed — ${failures.join(', ')}. Check Platform Connect.`)
            setIsLoading(false)
            return
          }
        } catch {
          setError('Saved but crosslist request failed. You can retry from the inventory page.')
          setIsLoading(false)
          return
        }
      }

      setUploadProgress(100)
      setError(null)

      router.push(`/finds`)
    } catch (err) {
      setError((err as any).message || 'An error occurred')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-sage/14 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm text-sage-lt hover:text-sage transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-lg sm:text-xl font-semibold text-ink">Add a find</h1>
          <div className="w-12 sm:w-16" />
        </div>
      </div>

      {/* Template applied banner */}
      {templateAppliedBanner && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 mt-4 bg-sage/5 border border-sage/20 rounded-lg text-sm text-sage flex items-center justify-between">
          <span>✓ Template applied: <strong>{templateAppliedBanner}</strong></span>
          <button
            onClick={() => setTemplateAppliedBanner(null)}
            className="text-sage-lt hover:text-sage transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 mt-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
          {/* LEFT PANEL - Marketplace Selector */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg border border-sage/14 p-6 md:sticky md:top-24 space-y-4">
              <TemplatePickerPopover onSelectTemplate={handleApplyTemplate} />
              <PlatformSelector
                selectedPlatforms={formData.selectedPlatforms}
                onPlatformToggle={handlePlatformToggle}
                connectedPlatforms={shopifyShopId ? ['vinted', 'ebay', 'shopify'] : ['vinted', 'ebay']}
              />
            </div>
          </div>

          {/* CENTRE PANEL - Main Form */}
          <div className="md:col-span-7 space-y-6">
            {/* Auto-detected category banner */}
            {autoDetectedCategory && !formData.category && !dismissedAutoDetection && (
              <div className={`rounded-lg border p-4 flex items-center justify-between ${
                autoDetectedCategory.confidence === 'high'
                  ? 'bg-sage/5 border-sage/20'
                  : autoDetectedCategory.confidence === 'medium'
                    ? 'bg-amber/5 border-amber/20'
                    : 'bg-slate-50 border-slate-20'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {autoDetectedCategory.confidence === 'high' ? '✓' : autoDetectedCategory.confidence === 'medium' ? '?' : '?'}{' '}
                    <span className={
                      autoDetectedCategory.confidence === 'high'
                        ? 'text-sage'
                        : autoDetectedCategory.confidence === 'medium'
                          ? 'text-amber'
                          : 'text-slate-600'
                    }>
                      {autoDetectedCategory.confidence === 'high'
                        ? 'Category detected: '
                        : 'Looks like '}
                      <strong className="capitalize">{autoDetectedCategory.category}</strong>
                      {autoDetectedCategory.confidence !== 'high' ? '?' : ''}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('category', autoDetectedCategory.category)
                      setAutoDetectedCategory(null)
                    }}
                    className="text-xs px-2 py-1 rounded bg-sage text-white hover:bg-sage-lt transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setDismissedAutoDetection(true)}
                    className="text-xs px-2 py-1 text-sage-lt hover:text-sage transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Sourcing trip banner */}
            {sourcingTripName && (
              <div className="rounded-lg border border-sage/20 bg-sage/5 p-4 flex items-center justify-between">
                <span className="text-sm text-ink">
                  Adding to trip: <strong>{sourcingTripName}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, sourcingTripId: null }))
                    setSourcingTripName(null)
                  }}
                  className="text-xs px-2 py-1 text-sage-lt hover:text-sage transition-colors"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Photos */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-semibold text-ink">Photos</h3>
                {formData.photoPreviews.length > 0 && !formData.category && (
                  <button
                    type="button"
                    onClick={() => formData.photoPreviews[0] && handleClassifyPhoto(0)}
                    disabled={classifyingPhotoIndex === 0}
                    className="text-xs text-sage-lt hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed transition-colors underline underline-offset-2"
                  >
                    {classifyingPhotoIndex === 0 ? '⏳ Identifying...' : '🔍 Identify item'}
                  </button>
                )}
              </div>
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
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <div className="flex justify-between items-start mb-2">
                <label className="block text-sm font-semibold text-ink">Title</label>
                <ISBNLookup
                  isOpen={isbnLookupOpen}
                  onOpenChange={setIsbnLookupOpen}
                  category={formData.category}
                  selectedPlatforms={formData.selectedPlatforms}
                  onTitleFill={(title) => handleInputChange('title', title)}
                  onAuthorFill={(platform, author) => handlePlatformFieldChange(platform, 'author', author)}
                  onIsbnFill={(platform, isbn) => handlePlatformFieldChange(platform, 'isbn', isbn)}
                  currentTitle={formData.title}
                />
              </div>
              <textarea
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value.slice(0, titleCharLimit))}
                className={`w-full px-3 py-2 border rounded text-sm resize-none focus:outline-none focus:ring-2 ${
                  incompleteRequiredFields.has('title')
                    ? 'border-amber-400 focus:ring-amber-400'
                    : 'border-sage/14 focus:ring-sage/30'
                }`}
                rows={2}
                placeholder="Item title"
              />
              <div className="flex justify-between items-start mt-1">
                <div className="text-xs text-sage-dim">
                  {formData.title.length}/{titleCharLimit}
                </div>
                {incompleteRequiredFields.has('title') && (
                  <span className="text-xs text-amber-600">Required — complete before publishing</span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg border border-sage/14 p-6">
              <div className="flex justify-between items-start mb-2">
                <label className="block text-sm font-semibold text-ink">Description</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={!formData.title || !formData.category || isGeneratingDescription}
                  className="text-xs px-2 py-1 rounded border border-sage/14 text-sage-lt hover:text-sage hover:border-sage/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  {isGeneratingDescription ? (
                    <>
                      <span className="inline-block animate-spin">⏳</span> Generating...
                    </>
                  ) : (
                    <>✨ Generate</>
                  )}
                </button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value.slice(0, 2000))}
                className={`w-full px-3 py-2 border rounded text-sm resize-none focus:outline-none focus:ring-2 ${
                  incompleteRequiredFields.has('description')
                    ? 'border-amber-400 focus:ring-amber-400'
                    : 'border-sage/14 focus:ring-sage/30'
                }`}
                rows={4}
                placeholder="Describe the item..."
              />
              <div className="flex justify-between items-start mt-1">
                <div className="text-xs text-sage-dim">
                  {formData.description.length}/2000
                </div>
                {incompleteRequiredFields.has('description') && (
                  <span className="text-xs text-amber-600">Required — complete before publishing</span>
                )}
              </div>
            </div>

            {/* Category */}
            <div className={`bg-white rounded-lg border p-6 ${
              incompleteRequiredFields.has('category')
                ? 'border-amber-400'
                : 'border-sage/14'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <label className="block text-sm font-semibold text-ink">Category</label>
                {incompleteRequiredFields.has('category') && (
                  <span className="text-xs text-amber-600">Required — complete before publishing</span>
                )}
              </div>
              <CategoryPicker
                value={formData.category}
                onChange={(value) => handleInputChange('category', value)}
                selectedPlatforms={formData.selectedPlatforms}
              />
            </div>

            {/* Price & Platform Pricing */}
            <div className="bg-white rounded-lg border border-sage/14 p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">Price</label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-sage-dim">£</span>
                    <input
                      type="number"
                      value={formData.price ?? ''}
                      onChange={(e) =>
                        handleInputChange('price', e.target.value ? parseFloat(e.target.value) : null)
                      }
                      className={`flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
                        incompleteRequiredFields.has('price')
                          ? 'border-amber-400 focus:ring-amber-400'
                          : 'border-sage/14 focus:ring-sage/30'
                      }`}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  {incompleteRequiredFields.has('price') && (
                    <span className="text-xs text-amber-600">Required — complete before publishing</span>
                  )}
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
              <div className="flex flex-col gap-2">
                <select
                  value={formData.condition}
                  onChange={(e) => handleInputChange('condition', e.target.value as FindCondition)}
                  className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 ${
                    incompleteRequiredFields.has('condition')
                      ? 'border-amber-400 focus:ring-amber-400'
                      : 'border-sage/14 focus:ring-sage/30'
                  }`}
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond.value} value={cond.value}>
                      {cond.label}
                    </option>
                  ))}
                </select>
                {incompleteRequiredFields.has('condition') && (
                  <span className="text-xs text-amber-600">Required — complete before publishing</span>
                )}
              </div>
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

            {/* Marketplace-specific fields (driven by category × platform config) */}
            {formData.selectedPlatforms.length > 0 && fieldConfig && (
              <>
                {/* Vinted colour pickers (Vinted uses numeric colour IDs) */}
                {fieldConfig?.colour?.show && formData.selectedPlatforms.includes('vinted') && (
                  <>
                    <div className="bg-white rounded-lg border border-sage/14 p-6">
                      <label className="block text-sm font-semibold text-ink mb-2">
                        Vinted colour
                        {fieldConfig.colour.required && <span className="text-red-500"> *</span>}
                      </label>
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
                  </>
                )}

                {/* Colour text input (for eBay/Depop/Shopify/Etsy — they use text not numeric IDs) */}
                {fieldConfig?.colour?.show && formData.selectedPlatforms.some(p => p !== 'vinted') && (
                  <div className="bg-white rounded-lg border border-sage/14 p-6">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      Colour
                      {fieldConfig.colour.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={(formData.platformFields.shared?.colour as string) ?? ''}
                      onChange={(e) =>
                        handleSharedFieldChange('colour', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      placeholder="e.g. Blue, Red, Multicoloured..."
                    />
                  </div>
                )}

                {/* Condition Description */}
                {fieldConfig?.condition_description?.show && (
                  <div className="bg-white rounded-lg border border-sage/14 p-6">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      Condition description{' '}
                      <span className="text-xs text-sage-dim font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={(formData.platformFields.shared?.conditionDescription as string) ?? ''}
                      onChange={(e) =>
                        handleSharedFieldChange('conditionDescription', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-sage/14 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sage/30"
                      rows={3}
                      placeholder="e.g. Small stain on cuff..."
                    />
                  </div>
                )}

                {/* Size */}
                {fieldConfig?.size?.show && (
                  <div className="bg-white rounded-lg border border-sage/14 p-6">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      Size{fieldConfig.size.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={(formData.platformFields.shared?.size as string) ?? ''}
                      onChange={(e) =>
                        handleSharedFieldChange('size', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      placeholder="e.g. M, 12, EU 38..."
                    />
                  </div>
                )}

                {/* Material */}
                {fieldConfig?.material?.show && (
                  <div className="bg-white rounded-lg border border-sage/14 p-6">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      Material
                      {fieldConfig.material.required && <span className="text-red-500"> *</span>}
                      {!fieldConfig.material.required && (
                        <span className="text-xs text-sage-dim font-normal"> (optional)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={(formData.platformFields.shared?.material as string) ?? ''}
                      onChange={(e) =>
                        handleSharedFieldChange('material', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      placeholder="e.g. Ceramic, Glass, Cotton..."
                    />
                  </div>
                )}

                {/* Author (Books) */}
                {fieldConfig?.author?.show && (
                  <div className="bg-white rounded-lg border border-sage/14 p-6">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      Author
                      {fieldConfig.author.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={(formData.platformFields.shared?.author as string) ?? ''}
                      onChange={(e) =>
                        handleSharedFieldChange('author', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      placeholder="e.g. Jane Austen"
                    />
                  </div>
                )}

                {/* ISBN (Books) */}
                {fieldConfig?.isbn?.show && (
                  <div className="bg-white rounded-lg border border-sage/14 p-6">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      ISBN
                      {fieldConfig.isbn.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={(formData.platformFields.shared?.isbn as string) ?? ''}
                      onChange={(e) =>
                        handleSharedFieldChange('isbn', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      placeholder="978..."
                    />
                  </div>
                )}

                {/* Language (Books) */}
                {fieldConfig?.language?.show && (
                  <div className="bg-white rounded-lg border border-sage/14 p-6">
                    <label className="block text-sm font-semibold text-ink mb-2">
                      Language
                      {fieldConfig.language.required && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={(formData.platformFields.shared?.language as string) ?? ''}
                      onChange={(e) =>
                        handleSharedFieldChange('language', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                      placeholder="e.g. English"
                    />
                  </div>
                )}

                {/* Dynamic additional fields — renders any fieldConfig key not already handled above */}
                {(() => {
                  const handledKeys = new Set(['colour', 'condition_description', 'size', 'material', 'author', 'isbn', 'language', 'brand'])
                  const additionalFields = Object.entries(fieldConfig).filter(
                    ([key, val]) => !handledKeys.has(key) && val.show
                  )
                  if (additionalFields.length === 0) return null
                  return additionalFields.map(([key, config]) => (
                    <div key={key} className="bg-white rounded-lg border border-sage/14 p-6">
                      <label className="block text-sm font-semibold text-ink mb-2">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        {config.required && <span className="text-red-500"> *</span>}
                        {!config.required && (
                          <span className="text-xs text-sage-dim font-normal"> (optional)</span>
                        )}
                      </label>
                      {config.options && config.options.length > 0 ? (
                        <select
                          value={(formData.platformFields.shared?.[key] as string) ?? ''}
                          onChange={(e) =>
                            handleSharedFieldChange(key, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                        >
                          <option value="">Select...</option>
                          {config.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={(formData.platformFields.shared?.[key] as string) ?? ''}
                          onChange={(e) =>
                            handleSharedFieldChange(key, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                          placeholder={`Enter ${key.replace(/_/g, ' ')}...`}
                        />
                      )}
                    </div>
                  ))
                })()}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg border border-sage/14 p-6 md:sticky md:top-24 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-ink mb-2">SKU</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    className="flex-1 px-3 py-2 border border-sage/14 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sage/30"
                    placeholder="Optional"
                  />
                  <button
                    onClick={handleRegenerateSKU}
                    disabled={!formData.category}
                    className="px-2 py-2 text-sm text-sage-lt hover:text-sage disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Regenerate SKU"
                  >
                    🔄
                  </button>
                </div>
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

        {/* Save as Template section */}
        {!showSaveAsTemplate && (
          <div className="mt-8 pb-8">
            <button
              onClick={() => setShowSaveAsTemplate(true)}
              className="text-xs text-sage-lt hover:text-sage transition-colors underline underline-offset-2"
            >
              💾 Save this as a template →
            </button>
          </div>
        )}

        {showSaveAsTemplate && (
          <div className="mt-8 pb-8 bg-white rounded-lg border border-sage/14 p-4 sm:p-6">
            <SaveAsTemplateInput
              formData={formData}
              onSaveSuccess={() => {
                setShowSaveAsTemplate(false)
              }}
              onClose={() => setShowSaveAsTemplate(false)}
            />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="sticky bottom-0 bg-white border-t border-sage/14 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-sage-lt hover:text-sage transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSaveDraft}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-4 py-2 text-sm border border-sage/14 rounded hover:bg-cream-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save draft'}
            </button>
            <button
              onClick={handlePublish}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-4 py-2 text-sm bg-sage text-white rounded hover:bg-sage-lt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
