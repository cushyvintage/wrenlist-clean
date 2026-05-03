'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { applyTemplate } from '@/lib/templates/apply-template'
import { FindCondition, Platform, FieldConfig, ListingTemplate } from '@/types'
import type { PlatformFieldsData } from '@/types/listing-form'
import type { AIAutoFillData } from '@/components/add-find/AIAutoFillBanner'
import { prepareImagesForAI } from '@/lib/ai/prepare-images'

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
  // First identification result for this set of photos. Survives refine and
  // banner dismissal so we can offer "reset to original" and so the final
  // log row diffs against what the model actually said first time.
  const [originalSuggestion, setOriginalSuggestion] = useState<AIAutoFillData | null>(null)
  const [dismissedAutoFill, setDismissedAutoFill] = useState(false)
  const [isIdentifying, setIsIdentifying] = useState(false)
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)
  // AbortController for the in-flight refine request. Cancelled when the
  // user dismisses the banner, asks Wren again, or removes all photos —
  // prevents the stale response from racing in and re-showing the banner.
  const refineAbortRef = useRef<AbortController | null>(null)
  // Guards against ultra-fast double-clicks on Send before isRefining flips.
  const refineInFlightRef = useRef(false)
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

  // Run a price research lookup for the given query and patch the banner
  // state with the result. Shared between identify and refine — avoids
  // duplicating the same fetch + null-guard dance in two places.
  const fetchPriceForBanner = async (query: string) => {
    try {
      const priceRes = await fetch('/api/price-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
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

  // Translate an AI identify/refine response into the AIAutoFillData shape
  // the banner consumes. Centralising it keeps identify and refine in lock-step.
  const aiResponseToBannerData = (data: {
    title?: string
    description?: string
    category?: string
    condition?: string
    suggestedQuery?: string
    confidence: 'high' | 'medium' | 'low'
  }): AIAutoFillData => ({
    title: data.title,
    description: data.description,
    category: data.category,
    condition: data.condition,
    suggestedQuery: typeof data.suggestedQuery === 'string' ? data.suggestedQuery : undefined,
    confidence: data.confidence,
    priceLoading: !!data.suggestedQuery,
  })

  // ── Explicit AI identification (triggered by user button click) ──
  const identifyPhotos = async () => {
    if (!formData.photoPreviews.length || isIdentifying) return

    // New identify run invalidates any in-flight refine and prior original.
    refineAbortRef.current?.abort()
    setRefineError(null)
    setOriginalSuggestion(null)

    const images = await prepareImagesForAI(formData.photoPreviews)
    if (images.length === 0) return

    setIsIdentifying(true)
    try {
      const response = await fetch('/api/ai/identify-from-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      })
      if (!response.ok) return
      const data = await response.json()
      const banner = aiResponseToBannerData(data)
      setAiAutoFill(banner)
      setOriginalSuggestion(banner)
      if (banner.suggestedQuery) await fetchPriceForBanner(banner.suggestedQuery)
    } catch (err) {
      console.error('Failed to identify from photo:', err)
    } finally {
      setIsIdentifying(false)
    }
  }

  // ── Refinement: user typed feedback ("it's actually 1970s") on the
  //    AI banner. Re-runs identify with the previous suggestion + their
  //    feedback as extra context. Logs the refinement.
  const refinePhotos = async (userFeedback: string) => {
    if (!aiAutoFill || refineInFlightRef.current) return
    refineInFlightRef.current = true
    setIsRefining(true)
    setRefineError(null)

    // Re-derive images from the current photo set rather than reusing a
    // stale list from the original identify call. If the user replaced
    // photos between Ask Wren and Refine, this ensures Wren actually sees
    // the new ones.
    const images = await prepareImagesForAI(formData.photoPreviews)
    if (images.length === 0) {
      setRefineError('Add at least one photo before asking Wren to rethink.')
      setIsRefining(false)
      refineInFlightRef.current = false
      return
    }

    const controller = new AbortController()
    refineAbortRef.current = controller

    const previousSuggestion = {
      title: aiAutoFill.title,
      description: aiAutoFill.description,
      category: aiAutoFill.category,
      condition: aiAutoFill.condition,
      suggestedQuery: aiAutoFill.suggestedQuery,
      confidence: aiAutoFill.confidence,
    }

    try {
      const response = await fetch('/api/ai/refine-from-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, previousSuggestion, userFeedback }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const msg = response.status === 429
          ? 'Slow down a moment — Wren is rate-limited. Try again in a few seconds.'
          : "Wren couldn't rethink that. Try a shorter, clearer description of what's wrong."
        setRefineError(msg)
        return
      }
      const data = await response.json()

      // Drop the result silently if the user dismissed/re-asked while we
      // were in flight — re-showing a dismissed banner feels broken.
      if (controller.signal.aborted || dismissedAutoFill) return

      // Log the refinement (fire-and-forget — never block UI on this).
      fetch('/api/ai/log-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'refined',
          suggestion: { ...previousSuggestion, originalConfidence: originalSuggestion?.confidence },
          userFeedback,
          confidence: previousSuggestion.confidence,
          photoCount: images.length,
        }),
      }).catch(() => { /* logging must not break flow */ })

      const banner = aiResponseToBannerData(data)
      setAiAutoFill(banner)

      // Skip price re-research when the search query didn't change — the
      // existing price still applies and a second call costs money for nothing.
      const queryChanged = banner.suggestedQuery && banner.suggestedQuery !== previousSuggestion.suggestedQuery
      if (queryChanged && banner.suggestedQuery) {
        await fetchPriceForBanner(banner.suggestedQuery)
      } else {
        // Carry the previous price across so the banner doesn't go blank.
        setAiAutoFill(prev => prev ? {
          ...prev,
          suggestedPrice: aiAutoFill.suggestedPrice,
          priceReasoning: aiAutoFill.priceReasoning,
          priceLoading: false,
        } : null)
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      console.error('Failed to refine identification:', err)
      setRefineError("Wren couldn't reach the network. Check your connection and try again.")
    } finally {
      setIsRefining(false)
      refineInFlightRef.current = false
      if (refineAbortRef.current === controller) refineAbortRef.current = null
    }
  }

  // Reset banner to whatever Wren said first time. Clears any refine error too.
  const resetToOriginal = () => {
    if (!originalSuggestion) return
    refineAbortRef.current?.abort()
    setRefineError(null)
    setAiAutoFill(originalSuggestion)
  }

  // Clearing photos / dismissing should also kill any in-flight refine.
  useEffect(() => {
    if (formData.photoPreviews.length === 0) {
      refineAbortRef.current?.abort()
      setOriginalSuggestion(null)
      setRefineError(null)
    }
  }, [formData.photoPreviews.length])

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
    isRefining,
    refinePhotos,
    refineError,
    setRefineError,
    originalSuggestion,
    resetToOriginal,
    sourcingTripName,
    setSourcingTripName,
    isbnLookupOpen,
    setIsbnLookupOpen,
    classifyingPhotoIndex,
    setClassifyingPhotoIndex,
  }
}
