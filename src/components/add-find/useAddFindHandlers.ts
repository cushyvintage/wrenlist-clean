'use client'

import { useCallback, useMemo, Dispatch, SetStateAction } from 'react'
import { usePhotoHandlers } from '@/components/add-find/usePhotoHandlers'
import { generateSKU } from '@/lib/sku'
import { applyTemplate } from '@/lib/templates/apply-template'
import { Platform, ListingTemplate } from '@/types'
import type { FormData } from './useAddFindForm'

interface HandlerDeps {
  formData: FormData
  setFormData: Dispatch<SetStateAction<FormData>>
  setError: Dispatch<SetStateAction<string | null>>
  setIncompleteRequiredFields: Dispatch<SetStateAction<Set<string>>>
  setTemplateAppliedBanner: Dispatch<SetStateAction<string | null>>
  setIsGeneratingDescription: Dispatch<SetStateAction<boolean>>
  setAutoDetectedCategory: Dispatch<SetStateAction<{ category: string; confidence: 'high' | 'medium' | 'low' } | null>>
  setClassifyingPhotoIndex: Dispatch<SetStateAction<number | null>>
}

export function useAddFindHandlers(deps: HandlerDeps) {
  const {
    formData,
    setFormData,
    setError,
    setIncompleteRequiredFields,
    setTemplateAppliedBanner,
    setIsGeneratingDescription,
    setAutoDetectedCategory,
    setClassifyingPhotoIndex,
  } = deps

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

  const photoHandlers = usePhotoHandlers(setFormData)

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

  return {
    handleInputChange,
    handleApplyTemplate,
    handlePlatformToggle,
    ...photoHandlers,
    handlePlatformFieldChange,
    handleSharedFieldChange,
    handleRegenerateSKU,
    handleClassifyPhoto,
    handleGenerateDescription,
    titleCharLimit,
    handleDimensionChange,
    handlePlatformPriceChange,
  }
}
