'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PhotoUpload from '@/components/listing/PhotoUpload'
import CategoryPicker from '@/components/listing/CategoryPicker'
import TemplatePickerPopover from '@/components/templates/TemplatePickerPopover'
import SaveAsTemplateInput from '@/components/templates/SaveAsTemplateInput'
import PlatformSelector from '@/components/add-find/PlatformSelector'
import AutoDetectedCategoryBanner from '@/components/add-find/AutoDetectedCategoryBanner'
import AIAutoFillBanner, { type AIAutoFillData, type AIAutoFillResult } from '@/components/add-find/AIAutoFillBanner'
import TitleDescriptionSection from '@/components/add-find/TitleDescriptionSection'
import PricingSection from '@/components/add-find/PricingSection'
import ItemDetailsSection from '@/components/add-find/ItemDetailsSection'
import MarketplaceFieldsSection from '@/components/add-find/MarketplaceFieldsSection'
import ShippingSection from '@/components/add-find/ShippingSection'
import InternalFieldsSidebar from '@/components/add-find/InternalFieldsSidebar'
import { usePhotoHandlers } from '@/components/add-find/usePhotoHandlers'
import { generateSKU } from '@/lib/sku'
import { applyTemplate } from '@/lib/templates/apply-template'
import { FindCondition, Platform, FieldConfig, ListingTemplate } from '@/types'

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
  shippingDimensions: { length: number | null; width: number | null; height: number | null }
  sku: string
  costPrice: number | null
  internalNote: string
  sourcingTripId: string | null
  platformPrices: Partial<Record<Platform, number | null>>
}

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
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fieldConfig, setFieldConfig] = useState<Record<string, FieldConfig> | null>(null)
  const [incompleteRequiredFields, setIncompleteRequiredFields] = useState<Set<string>>(new Set())
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false)
  const [templateAppliedBanner, setTemplateAppliedBanner] = useState<string | null>(null)
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<{
    category: string
    confidence: 'high' | 'medium' | 'low'
  } | null>(null)
  const [dismissedAutoDetection, setDismissedAutoDetection] = useState(false)
  const [aiAutoFill, setAiAutoFill] = useState<AIAutoFillData | null>(null)
  const [dismissedAutoFill, setDismissedAutoFill] = useState(false)
  const [isIdentifying, setIsIdentifying] = useState(false)
  const [aiPrefs, setAiPrefs] = useState<{ enabled: boolean; title: boolean; description: boolean; category: boolean; condition: boolean; price: boolean } | null>(null)
  const [sourcingTripName, setSourcingTripName] = useState<string | null>(null)
  const [isbnLookupOpen, setIsbnLookupOpen] = useState(false)
  const [classifyingPhotoIndex, setClassifyingPhotoIndex] = useState<number | null>(null)

  // ── URL params on mount ──
  useEffect(() => {
    const saveAsTemplateParam = searchParams.get('saveAsTemplate')
    if (saveAsTemplateParam === 'true') setShowSaveAsTemplate(true)

    const titleParam = searchParams.get('title')
    const categoryParam = searchParams.get('category')
    const brandParam = searchParams.get('brand')
    const eanParam = searchParams.get('ean')
    const priceParam = searchParams.get('price')
    if (titleParam || categoryParam || brandParam || eanParam || priceParam) {
      setFormData((prev) => ({
        ...prev,
        ...(titleParam && { title: titleParam }),
        ...(categoryParam && { category: categoryParam }),
        ...(brandParam && { brand: brandParam }),
        ...(priceParam && { price: parseFloat(priceParam) }),
        ...(eanParam && {
          platformFields: {
            ...prev.platformFields,
            vinted: { ...prev.platformFields.vinted, isbn: eanParam },
            ebay: { ...prev.platformFields.ebay, isbn: eanParam },
          },
        }),
      }))
    }

    const sourcingTripIdParam = searchParams.get('sourcingTripId')
    if (sourcingTripIdParam) {
      const fetchTripName = async () => {
        try {
          const response = await fetch(`/api/sourcing/${sourcingTripIdParam}`)
          if (!response.ok) throw new Error('Failed to load trip')
          const { data: trip } = await response.json()
          setFormData((prev) => ({ ...prev, sourcingTripId: sourcingTripIdParam }))
          setSourcingTripName(trip.name)
        } catch (err) {
          console.error('Failed to load sourcing trip:', err)
        }
      }
      fetchTripName()
    }

    const templateId = searchParams.get('templateId')
    if (templateId) {
      const autoApplyTemplate = async () => {
        try {
          const response = await fetch(`/api/templates/${templateId}`)
          if (!response.ok) throw new Error('Failed to load template')
          const { data: template } = await response.json()
          const result = applyTemplate(template, formData)
          setFormData(prev => ({ ...result.merged, sourcingTripId: prev.sourcingTripId }))
          setIncompleteRequiredFields(new Set(result.incompleteRequiredFields))
          setTemplateAppliedBanner(template.name)
          setTimeout(() => setTemplateAppliedBanner(null), 3000)
          await fetch(`/api/templates/${templateId}`, { method: 'PATCH' })
        } catch (err) {
          console.error('Failed to auto-apply template:', err)
        }
      }
      autoApplyTemplate()
    }
  }, [searchParams])

  // ── Field config fetch ──
  useEffect(() => {
    if (!formData.category || formData.selectedPlatforms.length === 0) {
      setFieldConfig(null)
      return
    }

    const controller = new AbortController()

    const fetchFieldConfig = async () => {
      try {
        const cacheBust = new Date().toISOString().slice(0, 10)
        const results = await Promise.all(
          formData.selectedPlatforms.map(async (platform) => {
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

  // ── Load AI preferences ──
  useEffect(() => {
    fetch('/api/user/preferences')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setAiPrefs(data) })
      .catch(() => {})
  }, [])

  // ── Auto-identify from first photo (title + description + category) ──
  useEffect(() => {
    let cancelled = false
    const abortController = new AbortController()

    const identifyFromPhoto = async () => {
      if (!formData.photoPreviews.length || dismissedAutoFill) return
      // Wait for preferences to load, then respect master toggle
      if (aiPrefs === null) return
      if (!aiPrefs.enabled) return
      if (formData.title && formData.category) return
      const firstPhoto = formData.photoPreviews[0]
      if (!firstPhoto) return

      // Convert blob URL to a resized data URL for the API (keeps payload under 4MB)
      let imageUrl = firstPhoto
      if (firstPhoto.startsWith('blob:') || firstPhoto.startsWith('data:')) {
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = reject
            img.src = firstPhoto
          })
          if (cancelled) return
          const MAX = 1024
          let { width, height } = img
          if (width > MAX || height > MAX) {
            const scale = MAX / Math.max(width, height)
            width = Math.round(width * scale)
            height = Math.round(height * scale)
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(img, 0, 0, width, height)
          imageUrl = canvas.toDataURL('image/jpeg', 0.8)
        } catch {
          return
        }
      } else if (!firstPhoto.startsWith('http')) {
        return
      }

      if (cancelled) return
      setIsIdentifying(true)
      try {
        const response = await fetch('/api/ai/identify-from-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images: [imageUrl] }),
          signal: abortController.signal,
        })
        if (cancelled) return
        if (response.ok) {
          const data = await response.json()
          // Show identification results immediately (title, description, category, condition)
          setAiAutoFill({
            title: data.title,
            description: data.description,
            category: data.category,
            condition: data.condition,
            suggestedQuery: data.suggestedQuery,
            confidence: data.confidence,
            priceLoading: !!data.suggestedQuery,
          })
          if (data.category && !formData.category) {
            setAutoDetectedCategory({ category: data.category, confidence: data.confidence })
          }

          // Fire price research in the background (non-blocking)
          if (data.suggestedQuery && !cancelled) {
            try {
              const priceRes = await fetch('/api/price-research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: data.suggestedQuery }),
                signal: abortController.signal,
              })
              if (!cancelled && priceRes.ok) {
                const priceData = await priceRes.json()
                const suggested = priceData?.recommendation?.suggested_price
                const reasoning = priceData?.recommendation?.reasoning
                setAiAutoFill(prev => prev ? {
                  ...prev,
                  suggestedPrice: typeof suggested === 'number' ? suggested : undefined,
                  priceReasoning: typeof reasoning === 'string' ? reasoning : undefined,
                  priceLoading: false,
                } : null)
              } else if (!cancelled) {
                setAiAutoFill(prev => prev ? { ...prev, priceLoading: false } : null)
              }
            } catch {
              if (!cancelled) {
                setAiAutoFill(prev => prev ? { ...prev, priceLoading: false } : null)
              }
            }
          }
        }
      } catch (err) {
        if (!cancelled) console.error('Failed to identify from photo:', err)
      } finally {
        if (!cancelled) setIsIdentifying(false)
      }
    }

    identifyFromPhoto()
    return () => { cancelled = true; abortController.abort() }
  }, [formData.photoPreviews, formData.title, formData.category, dismissedAutoFill, aiPrefs])

  // ── Handlers ──
  const handleInputChange = useCallback(
    (field: keyof FormData, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setIncompleteRequiredFields((prev) => {
        const updated = new Set(prev)
        updated.delete(field)
        return updated
      })
    },
    []
  )

  const handleApplyTemplate = useCallback((template: ListingTemplate) => {
    const result = applyTemplate(template, formData)
    setFormData(prev => ({ ...result.merged, sourcingTripId: prev.sourcingTripId }))
    setIncompleteRequiredFields(new Set(result.incompleteRequiredFields))
    setTemplateAppliedBanner(template.name)
    setTimeout(() => setTemplateAppliedBanner(null), 3000)
    fetch(`/api/templates/${template.id}`, { method: 'PATCH' }).catch((err) => {
      console.error('Failed to increment template usage:', err)
    })
  }, [formData])

  const handlePlatformToggle = useCallback((platform: Platform) => {
    setFormData((prev) => ({
      ...prev,
      selectedPlatforms: prev.selectedPlatforms.includes(platform)
        ? prev.selectedPlatforms.filter((p) => p !== platform)
        : [...prev.selectedPlatforms, platform],
    }))
  }, [])

  const {
    handleAddPhotos,
    handleReplacePhotos,
    handleRemovePhoto,
    handleReorderPhotos,
    handleUpdatePhoto,
    handleSetMainPhoto,
    handleBulkRemovePhotos,
  } = usePhotoHandlers(setFormData)

  const handlePlatformFieldChange = useCallback(
    (platform: Platform, field: string, value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        platformFields: {
          ...prev.platformFields,
          [platform]: {
            ...((prev.platformFields as Record<string, Record<string, unknown>>)[platform] || {}),
            [field]: value,
          },
        },
      }))
      setIncompleteRequiredFields((prev) => {
        const updated = new Set(prev)
        updated.delete(`platformFields.${platform}`)
        return updated
      })
    },
    []
  )

  const handleSharedFieldChange = useCallback(
    (field: string, value: string | string[] | boolean | undefined) => {
      setFormData((prev) => ({
        ...prev,
        platformFields: {
          ...prev.platformFields,
          shared: { ...(prev.platformFields.shared || {}), [field]: value },
        },
      }))
    },
    []
  )

  const handleRegenerateSKU = useCallback(() => {
    if (formData.category) {
      setFormData((prev) => ({ ...prev, sku: generateSKU(prev.category) }))
    }
  }, [formData.category])

  const handleClassifyPhoto = useCallback(
    async (index: number) => {
      if (!formData.photoPreviews[index]) return
      const photoUrl = formData.photoPreviews[index]
      if (!photoUrl.startsWith('http')) return

      setClassifyingPhotoIndex(index)
      try {
        const response = await fetch('/api/ai/classify-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl }),
        })
        if (!response.ok) throw new Error('Failed to classify photo')
        const data = await response.json()
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
        throw new Error((errorData as { error?: string }).error || 'Failed to generate description')
      }
      const data = await response.json()
      handleInputChange('description', data.description)
    } catch (err) {
      setError((err as Error).message || 'Failed to generate description')
    } finally {
      setIsGeneratingDescription(false)
    }
  }, [formData.title, formData.category, formData.brand, formData.condition])

  const titleCharLimit = useMemo(() => {
    return formData.selectedPlatforms.includes('ebay') ? 80 : 255
  }, [formData.selectedPlatforms])

  const handleDimensionChange = useCallback(
    (dimension: 'length' | 'width' | 'height', value: number | null) => {
      setFormData((prev) => ({
        ...prev,
        shippingDimensions: { ...prev.shippingDimensions, [dimension]: value },
      }))
    },
    []
  )

  const handlePlatformPriceChange = useCallback(
    (platform: Platform, value: number | null) => {
      setFormData((prev) => ({
        ...prev,
        platformPrices: { ...prev.platformPrices, [platform]: value },
      }))
    },
    []
  )

  // ── Upload + Save/Publish ──
  const uploadPhotosToStorage = async (findId: string): Promise<string[]> => {
    if (!formData.photos.length) return []
    const uploadFormData = new FormData()
    uploadFormData.append('find_id', findId)
    formData.photos.forEach((photo) => uploadFormData.append('photos', photo))
    const uploadResponse = await fetch('/api/finds/upload-photos', { method: 'POST', body: uploadFormData })
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      throw new Error((errorData as { error?: string }).error || 'Failed to upload photos')
    }
    const uploadData = await uploadResponse.json()
    return uploadData.urls || []
  }

  const handleSaveDraft = async () => {
    setIsLoading(true)
    setError(null)
    setUploadProgress(0)
    try {
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
            throw new Error(`You've reached your ${limit}-find limit on the ${plan.charAt(0).toUpperCase()+plan.slice(1)} plan. Upgrade to add more finds.`)
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
          colour: formData.platformFields.shared?.colour ? String(formData.platformFields.shared.colour) : null,
          size: formData.platformFields.shared?.size ? String(formData.platformFields.shared.size) : null,
          sku: formData.sku || null,
          cost_gbp: formData.costPrice,
          sourcing_trip_id: formData.sourcingTripId,
          shipping_weight_grams: formData.shippingWeight,
          shipping_length_cm: formData.shippingDimensions.length,
          shipping_width_cm: formData.shippingDimensions.width,
          shipping_height_cm: formData.shippingDimensions.height,
          selected_marketplaces: formData.selectedPlatforms,
          platform_fields: {
            ...formData.platformFields,
            platformPrices: formData.platformPrices,
          },
          status: 'draft',
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error((errorData as { error?: string }).error || 'Failed to save draft')
      }
      const data = await response.json()
      const findId = data?.data?.id || data?.id
      if (findId && formData.photos.length > 0) {
        setError('Uploading photos...')
        const photoUrls = await uploadPhotosToStorage(findId)
        setUploadProgress(50)
        const patchResponse = await fetch(`/api/finds/${findId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: photoUrls }),
        })
        if (!patchResponse.ok) {
          const errorData = await patchResponse.json()
          throw new Error((errorData as { error?: string }).error || 'Failed to update photos')
        }
      }
      setUploadProgress(100)
      router.push(`/finds`)
    } catch (err) {
      setError((err as Error).message || 'An error occurred')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const handlePublish = async () => {
    if (!formData.title.trim()) { setError('Title is required'); return }
    if (!formData.category) { setError('Category is required'); return }
    if (formData.selectedPlatforms.length === 0) { setError('Select at least one marketplace'); return }
    if (formData.category && formData.selectedPlatforms.length > 0 && !fieldConfig) {
      setError('Loading field requirements — please try again'); return
    }

    if (fieldConfig) {
      const missing: string[] = []
      for (const [key, config] of Object.entries(fieldConfig)) {
        if (!config.required) continue
        if (key === 'brand') {
          if (!formData.brand.trim()) missing.push('Brand')
          continue
        }
        if (key === 'colour') {
          const hasVintedColour = formData.selectedPlatforms.includes('vinted') && formData.platformFields.vinted?.primaryColor
          const hasSharedColour = formData.platformFields.shared?.colour && String(formData.platformFields.shared.colour).trim()
          if (!hasVintedColour && !hasSharedColour) missing.push('Colour')
          continue
        }
        const val = formData.platformFields.shared?.[key]
        if (!val || (typeof val === 'string' && !val.trim())) {
          missing.push(key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
        }
      }
      if (missing.length > 0) { setError(`Required fields missing: ${missing.join(', ')}`); return }
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
          colour: formData.platformFields.shared?.colour ? String(formData.platformFields.shared.colour) : null,
          size: formData.platformFields.shared?.size ? String(formData.platformFields.shared.size) : null,
          sku: formData.sku || null,
          cost_gbp: formData.costPrice,
          sourcing_trip_id: formData.sourcingTripId,
          shipping_weight_grams: formData.shippingWeight,
          shipping_length_cm: formData.shippingDimensions.length,
          shipping_width_cm: formData.shippingDimensions.width,
          shipping_height_cm: formData.shippingDimensions.height,
          selected_marketplaces: formData.selectedPlatforms,
          platform_fields: {
            ...formData.platformFields,
            platformPrices: formData.platformPrices,
          },
          status: 'listed',
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error((errorData as { error?: string }).error || 'Failed to publish')
      }
      const data = await response.json()
      const findId = data?.data?.id || data?.id

      if (findId && formData.photos.length > 0) {
        setError('Uploading photos...')
        const uploadedPhotoUrls = await uploadPhotosToStorage(findId)
        setUploadProgress(50)
        const patchResponse = await fetch(`/api/finds/${findId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photos: uploadedPhotoUrls }),
        })
        if (!patchResponse.ok) {
          const errorData = await patchResponse.json()
          throw new Error((errorData as { error?: string }).error || 'Failed to update photos')
        }
      }

      setUploadProgress(75)

      if (formData.selectedPlatforms.length > 0) {
        setError('Publishing to marketplaces...')
        try {
          const crosslistRes = await fetch('/api/crosslist/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ findId, marketplaces: formData.selectedPlatforms }),
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
      setError((err as Error).message || 'An error occurred')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  // ── Render ──
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-sage/14 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="text-sm text-sage-lt hover:text-sage transition-colors">
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
          <button onClick={() => setTemplateAppliedBanner(null)} className="text-sage-lt hover:text-sage transition-colors">✕</button>
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
          {/* LEFT PANEL */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg border border-sage/14 p-6 md:sticky md:top-24 space-y-4">
              <TemplatePickerPopover onSelectTemplate={handleApplyTemplate} />
              <PlatformSelector
                selectedPlatforms={formData.selectedPlatforms}
                onPlatformToggle={handlePlatformToggle}
              />
            </div>
          </div>

          {/* CENTRE PANEL */}
          <div className="md:col-span-7 space-y-6">
            {/* AI Auto-Fill banner (rich: title + description + category) */}
            {aiAutoFill && !dismissedAutoFill ? (
              <AIAutoFillBanner
                data={aiAutoFill}
                hasTitle={!!formData.title}
                hasDescription={!!formData.description}
                hasCategory={!!formData.category}
                hasCondition={true}
                hasPrice={!!formData.price}
                onApply={(fields: AIAutoFillResult) => {
                  if (fields.title) handleInputChange('title', fields.title)
                  if (fields.description) handleInputChange('description', fields.description)
                  if (fields.category) handleInputChange('category', fields.category)
                  if (fields.condition) handleInputChange('condition', fields.condition)
                  if (fields.price) handleInputChange('price', fields.price)
                  setAiAutoFill(null)
                  setDismissedAutoFill(true)
                  setAutoDetectedCategory(null)
                }}
                onDismiss={() => {
                  setDismissedAutoFill(true)
                  setAiAutoFill(null)
                }}
              />
            ) : isIdentifying ? (
              <div className="rounded-lg border border-sage/10 bg-sage/5 p-4 text-sm text-sage-dim flex items-center gap-2">
                <span className="animate-pulse">⏳</span> AI is identifying your item...
              </div>
            ) : (
              <AutoDetectedCategoryBanner
                autoDetectedCategory={autoDetectedCategory}
                hasCategory={!!formData.category}
                dismissedAutoDetection={dismissedAutoDetection}
                onApply={(cat) => {
                  handleInputChange('category', cat)
                  setAutoDetectedCategory(null)
                }}
                onDismiss={() => setDismissedAutoDetection(true)}
              />
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

            <TitleDescriptionSection
              title={formData.title}
              description={formData.description}
              category={formData.category}
              titleCharLimit={titleCharLimit}
              incompleteRequiredFields={incompleteRequiredFields}
              isGeneratingDescription={isGeneratingDescription}
              isbnLookupOpen={isbnLookupOpen}
              selectedPlatforms={formData.selectedPlatforms}
              onTitleChange={(v) => handleInputChange('title', v)}
              onDescriptionChange={(v) => handleInputChange('description', v)}
              onGenerateDescription={handleGenerateDescription}
              onIsbnLookupOpenChange={setIsbnLookupOpen}
              onAuthorFill={(platform, author) => handlePlatformFieldChange(platform, 'author', author)}
              onIsbnFill={(platform, isbn) => handlePlatformFieldChange(platform, 'isbn', isbn)}
            />

            {/* Category */}
            <div className={`bg-white rounded-lg border p-6 ${
              incompleteRequiredFields.has('category') ? 'border-amber-400' : 'border-sage/14'
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

            <PricingSection
              price={formData.price}
              platformPrices={formData.platformPrices}
              selectedPlatforms={formData.selectedPlatforms}
              ebayAcceptOffers={formData.platformFields.ebay?.acceptOffers ?? false}
              ebayIsAuction={formData.platformFields.ebay?.isAuction ?? false}
              incompleteRequiredFields={incompleteRequiredFields}
              onPriceChange={(v) => handleInputChange('price', v)}
              onPlatformPriceChange={handlePlatformPriceChange}
              onEbayFieldChange={(field, value) => handlePlatformFieldChange('ebay', field, value)}
            />

            <ItemDetailsSection
              brand={formData.brand}
              condition={formData.condition}
              quantity={formData.quantity}
              selectedPlatforms={formData.selectedPlatforms}
              fieldConfig={fieldConfig}
              incompleteRequiredFields={incompleteRequiredFields}
              onBrandChange={(v) => handleInputChange('brand', v)}
              onConditionChange={(v) => handleInputChange('condition', v)}
              onQuantityChange={(v) => handleInputChange('quantity', v)}
            />

            <MarketplaceFieldsSection
              selectedPlatforms={formData.selectedPlatforms}
              fieldConfig={fieldConfig}
              platformFields={formData.platformFields}
              onSharedFieldChange={handleSharedFieldChange}
              onPlatformFieldChange={handlePlatformFieldChange}
            />

            <ShippingSection
              shippingWeight={formData.shippingWeight}
              shippingDimensions={formData.shippingDimensions}
              onWeightChange={(v) => handleInputChange('shippingWeight', v)}
              onDimensionChange={handleDimensionChange}
            />
          </div>

          {/* RIGHT PANEL */}
          <InternalFieldsSidebar
            sku={formData.sku}
            costPrice={formData.costPrice}
            price={formData.price}
            internalNote={formData.internalNote}
            category={formData.category}
            onSkuChange={(v) => handleInputChange('sku', v)}
            onCostPriceChange={(v) => handleInputChange('costPrice', v)}
            onInternalNoteChange={(v) => handleInputChange('internalNote', v)}
            onRegenerateSKU={handleRegenerateSKU}
          />
        </div>

        {/* Save as Template */}
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
              onSaveSuccess={() => setShowSaveAsTemplate(false)}
              onClose={() => setShowSaveAsTemplate(false)}
            />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="sticky bottom-0 bg-white border-t border-sage/14 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <button onClick={() => router.back()} className="text-sm text-sage-lt hover:text-sage transition-colors">
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
