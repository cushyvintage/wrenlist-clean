'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { applyTemplate } from '@/lib/templates/apply-template'
import { FindCondition, Platform, FieldConfig, ListingTemplate } from '@/types'
import type { PlatformFieldsData } from '@/types/listing-form'
import type { AIAutoFillData } from '@/components/add-find/AIAutoFillBanner'

export type { PlatformFieldsData }

export interface FormData {
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
  stashId: string | null
  platformPrices: Partial<Record<Platform, number | null>>
}

export interface AIPrefs {
  enabled: boolean
  title: boolean
  description: boolean
  category: boolean
  condition: boolean
  price: boolean
}

export function useAddFindForm() {
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
    selectedPlatforms: [],
    platformFields: {},
    shippingWeight: null,
    shippingDimensions: { length: null, width: null, height: null },
    sku: '',
    costPrice: null,
    internalNote: '',
    sourcingTripId: null,
    stashId: typeof window !== 'undefined' ? localStorage.getItem('wrenlist:stickyStashId') : null,
    platformPrices: { vinted: null, ebay: null, etsy: null, shopify: null },
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [publishProgress, setPublishProgress] = useState<import('@/components/publish/PublishProgressPanel').PublishProgress | null>(null)
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
          // Use functional updater to merge against current state (not stale closure)
          let incompleteFields: string[] = []
          setFormData(prev => {
            const result = applyTemplate(template, prev)
            incompleteFields = result.incompleteRequiredFields
            return { ...result.merged, sourcingTripId: prev.sourcingTripId, stashId: prev.stashId }
          })
          setIncompleteRequiredFields(new Set(incompleteFields))
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
        for (let i = 0; i < results.length; i++) {
          const fields = results[i]
          const platform = formData.selectedPlatforms[i]
          if (!fields) continue
          for (const [key, val] of Object.entries(fields)) {
            if (!merged[key]) {
              merged[key] = { ...val, requiredBy: val.required && platform ? [platform] : [] }
            } else {
              if (val.show) merged[key].show = true
              if (val.required) {
                merged[key].required = true
                if (platform) {
                  merged[key].requiredBy = [...(merged[key].requiredBy ?? []), platform]
                }
              }
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

  // ── Explicit AI identification (triggered by user button click) ──
  const identifyPhotos = async () => {
    if (!formData.photoPreviews.length || isIdentifying) return

    const firstPhoto = formData.photoPreviews[0]
    if (!firstPhoto) return
    const additionalPreviews = formData.photoPreviews.slice(1, 3)

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

    setIsIdentifying(true)
    try {
      const response = await fetch('/api/ai/identify-from-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [imageUrl, ...additionalPreviews.filter((p) => p.startsWith('http') || p.startsWith('data:'))],
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setAiAutoFill({
          title: data.title,
          description: data.description,
          category: data.category,
          condition: data.condition,
          suggestedQuery: data.suggestedQuery,
          confidence: data.confidence,
          priceLoading: !!data.suggestedQuery,
        })
        if (data.suggestedQuery) {
          try {
            const priceRes = await fetch('/api/price-research', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: data.suggestedQuery }),
            })
            if (priceRes.ok) {
              const priceData = await priceRes.json()
              const suggested = priceData?.recommendation?.suggested_price
              const reasoning = priceData?.recommendation?.reasoning
              setAiAutoFill(prev => prev ? {
                ...prev,
                suggestedPrice: typeof suggested === 'number' ? suggested : undefined,
                priceReasoning: typeof reasoning === 'string' ? reasoning : undefined,
                priceLoading: false,
              } : null)
            } else {
              setAiAutoFill(prev => prev ? { ...prev, priceLoading: false } : null)
            }
          } catch {
            setAiAutoFill(prev => prev ? { ...prev, priceLoading: false } : null)
          }
        }
      }
    } catch (err) {
      console.error('Failed to identify from photo:', err)
    } finally {
      setIsIdentifying(false)
    }
  }

  return {
    router,
    formData,
    setFormData,
    isLoading,
    setIsLoading,
    error,
    setError,
    uploadProgress,
    setUploadProgress,
    publishProgress,
    setPublishProgress,
    fieldConfig,
    incompleteRequiredFields,
    setIncompleteRequiredFields,
    showSaveAsTemplate,
    setShowSaveAsTemplate,
    templateAppliedBanner,
    setTemplateAppliedBanner,
    isGeneratingDescription,
    setIsGeneratingDescription,
    autoDetectedCategory,
    setAutoDetectedCategory,
    dismissedAutoDetection,
    setDismissedAutoDetection,
    aiAutoFill,
    setAiAutoFill,
    dismissedAutoFill,
    setDismissedAutoFill,
    isIdentifying,
    identifyPhotos,
    sourcingTripName,
    setSourcingTripName,
    isbnLookupOpen,
    setIsbnLookupOpen,
    classifyingPhotoIndex,
    setClassifyingPhotoIndex,
  }
}
