'use client'

import { useCallback, useMemo, Dispatch, SetStateAction } from 'react'
import { usePhotoHandlers } from '@/components/add-find/usePhotoHandlers'
import { generateSKU } from '@/lib/sku'
import { applyTemplate } from '@/lib/templates/apply-template'
import { Platform, ListingTemplate } from '@/types'
import { PLATFORM_TITLE_LIMITS, PLATFORM_DESCRIPTION_LIMITS } from '@/data/unified-colours'
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

  /** Apply smart defaults to shared platform fields when a category is selected.
   *  Only fills EMPTY fields — never overwrites user input. */
  const applyCategoryDefaults = useCallback((category: string) => {
    setFormData((prev) => {
      const shared = (prev.platformFields.shared ?? {}) as Record<string, string | boolean | string[] | undefined>
      const platforms = prev.selectedPlatforms

      // Helper: set a shared field only if currently empty/undefined
      const patch: Record<string, string | boolean> = {}
      const setIfEmpty = (key: string, value: string | boolean) => {
        if (!shared[key] && shared[key] !== false) {
          patch[key] = value
        }
      }

      // ── Depop defaults (all categories) ──
      if (platforms.includes('depop') && !shared['depopSource']) {
        patch['depopSource'] = 'Thrifted/Secondhand'
      }

      // ── Category-specific defaults ──
      if (category.startsWith('books_media')) {
        setIfEmpty('whoMade', 'someone_else')
        setIfEmpty('whenMade', '2020_2025')
        setIfEmpty('isSupply', false)
      } else if (category.startsWith('clothing')) {
        setIfEmpty('whoMade', 'someone_else')
        setIfEmpty('whenMade', '2020_2025')
        if (platforms.includes('depop')) {
          setIfEmpty('depopSource', 'Thrifted/Secondhand')
        }
      } else if (category.startsWith('art')) {
        setIfEmpty('whoMade', 'someone_else')
        setIfEmpty('whenMade', 'before_2000')
      } else if (category.startsWith('craft_supplies')) {
        setIfEmpty('whoMade', 'someone_else')
        setIfEmpty('isSupply', true)
      } else if (category.startsWith('antiques')) {
        setIfEmpty('whoMade', 'someone_else')
        setIfEmpty('whenMade', 'before_2000')
      }

      // Nothing to patch — return unchanged reference
      if (Object.keys(patch).length === 0) return prev

      return {
        ...prev,
        platformFields: {
          ...prev.platformFields,
          shared: { ...shared, ...patch },
        },
      }
    })
  }, [])

  const handleInputChange = useCallback(
    (field: keyof FormData, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setIncompleteRequiredFields((prev) => {
        const updated = new Set(prev)
        updated.delete(field)
        return updated
      })
      // Auto-populate sensible defaults when category changes
      if (field === 'category' && typeof value === 'string' && value) {
        applyCategoryDefaults(value)
      }
    },
    [applyCategoryDefaults]
  )

  const handleApplyTemplate = useCallback((template: ListingTemplate) => {
    const result = applyTemplate(template, formData)
    setFormData(prev => ({ ...result.merged, sourcingTripId: prev.sourcingTripId, stashId: prev.stashId }))
    setIncompleteRequiredFields(new Set(result.incompleteRequiredFields))
    setTemplateAppliedBanner(template.name)
    setTimeout(() => setTemplateAppliedBanner(null), 3000)
    fetch(`/api/templates/${template.id}`, { method: 'PATCH' }).catch((err) => {
      console.error('Failed to increment template usage:', err)
    })
  }, [formData])

  const handlePlatformToggle = useCallback((platform: Platform) => {
    setFormData((prev) => {
      const isRemoving = prev.selectedPlatforms.includes(platform)
      const selectedPlatforms = isRemoving
        ? prev.selectedPlatforms.filter((p) => p !== platform)
        : [...prev.selectedPlatforms, platform]

      // When adding eBay, initialise platform fields with defaults so they persist on save
      let platformFields = prev.platformFields
      if (!isRemoving && platform === 'ebay' && !prev.platformFields.ebay) {
        platformFields = {
          ...platformFields,
          ebay: { acceptOffers: false, isAuction: false },
        }
      }

      return { ...prev, selectedPlatforms, platformFields }
    })
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
    if (formData.selectedPlatforms.length === 0) return 255
    return Math.min(...formData.selectedPlatforms.map(p => PLATFORM_TITLE_LIMITS[p] ?? 255))
  }, [formData.selectedPlatforms])

  // Description uses the *lowest* platform limit as a soft warning (shown in counter)
  // but does NOT hard-truncate — the extension truncates per-platform at publish time
  const descriptionCharLimit = useMemo(() => {
    if (formData.selectedPlatforms.length === 0) return 12000
    return Math.min(...formData.selectedPlatforms.map(p => PLATFORM_DESCRIPTION_LIMITS[p] ?? 12000))
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
    descriptionCharLimit,
    handleDimensionChange,
    handlePlatformPriceChange,
  }
}
