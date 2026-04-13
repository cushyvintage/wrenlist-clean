'use client'

import { Dispatch, SetStateAction } from 'react'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { FieldConfig } from '@/types'
import type { FormData } from './useAddFindForm'
import { useCategoryTree } from '@/hooks/useCategoryTree'
import { showError } from '@/lib/toast-error'
import type { PublishProgress, MarketplaceStatus } from '@/components/publish/PublishProgressPanel'

/** Resolve Vinted catalog ID from category tree DB mappings, walking up the category hierarchy */
function getVintedCatalogId(category: string, getPlatformId: (value: string, platform: string) => string | undefined): number | null {
  // Try exact category match
  const mapped = getPlatformId(category, 'vinted')
  if (mapped) return Number(mapped)

  // Try parent segment (e.g. clothing_womenswear_womens_dresses -> clothing_womenswear)
  const parts = category.split('_')
  if (parts.length > 2) {
    const parent = parts.slice(0, 2).join('_')
    const parentId = getPlatformId(parent, 'vinted')
    if (parentId) return Number(parentId)
  }

  // Try top-level (e.g. clothing)
  const topLevel = parts[0]
  if (parts.length > 1 && topLevel) {
    const topId = getPlatformId(topLevel, 'vinted')
    if (topId) return Number(topId)
  }

  return null
}

interface SubmitDeps {
  formData: FormData
  fieldConfig: Record<string, FieldConfig> | null
  router: AppRouterInstance
  setIsLoading: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  setUploadProgress: Dispatch<SetStateAction<number>>
  setPublishProgress: Dispatch<SetStateAction<PublishProgress | null>>
  setIncompleteRequiredFields: Dispatch<SetStateAction<Set<string>>>
}

export function useAddFindSubmit(deps: SubmitDeps) {
  const { formData, fieldConfig, router, setIsLoading, setError, setUploadProgress, setPublishProgress, setIncompleteRequiredFields } = deps
  const { getPlatformId } = useCategoryTree()

  const uploadPhotosToStorage = async (findId: string): Promise<string[]> => {
    let photosToUpload = formData.photos.filter((f) => f.size > 0)

    // Fallback: if File objects are missing but blob previews exist, re-fetch them
    if (photosToUpload.length === 0 && formData.photoPreviews.length > 0) {
      const blobPreviews = formData.photoPreviews.filter((p) => p.startsWith('blob:'))
      photosToUpload = await Promise.all(
        blobPreviews.map(async (url, i) => {
          const res = await fetch(url)
          const blob = await res.blob()
          return new File([blob], `photo-${i}.jpg`, { type: blob.type || 'image/jpeg' })
        })
      )
    }

    if (!photosToUpload.length) return []
    const uploadFormData = new FormData()
    uploadFormData.append('find_id', findId)
    photosToUpload.forEach((photo) => uploadFormData.append('photos', photo))
    const uploadResponse = await fetch('/api/finds/upload-photos', { method: 'POST', body: uploadFormData })
    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json()
      throw new Error((errorData as { error?: string }).error || 'Failed to upload photos')
    }
    const uploadData = await uploadResponse.json()
    return uploadData.urls || []
  }

  const buildPayload = (status: 'draft' | 'listed') => ({
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
    stash_id: formData.stashId,
    shipping_weight_grams: formData.shippingWeight || 500,
    shipping_length_cm: formData.shippingDimensions.length,
    shipping_width_cm: formData.shippingDimensions.width,
    shipping_height_cm: formData.shippingDimensions.height,
    selected_marketplaces: formData.selectedPlatforms,
    platform_fields: {
      ...formData.platformFields,
      // Build vintedMetadata when Vinted is selected — mirrors import structure
      // so the extension mapper uses the same working code path
      ...(formData.selectedPlatforms.includes('vinted') ? {
        vinted: {
          ...formData.platformFields.vinted,
          catalogId: formData.category ? getVintedCatalogId(formData.category, getPlatformId) : null,
          vintedMetadata: {
            catalog_id: formData.category ? getVintedCatalogId(formData.category, getPlatformId) : null,
            package_size_id: formData.shippingWeight
              ? formData.shippingWeight <= 500 ? 1
                : formData.shippingWeight <= 1000 ? 2
                : formData.shippingWeight <= 2000 ? 3
                : formData.shippingWeight <= 5000 ? 5
                : formData.shippingWeight <= 10000 ? 9
                : 10
              : 2,
            shipping: {
              weight_grams: formData.shippingWeight || 500,
              package_size_id: formData.shippingWeight
                ? formData.shippingWeight <= 500 ? 1
                  : formData.shippingWeight <= 1000 ? 2
                  : formData.shippingWeight <= 2000 ? 3
                  : formData.shippingWeight <= 5000 ? 5
                  : formData.shippingWeight <= 10000 ? 9
                  : 10
                : 2,
            },
            color_ids: [formData.platformFields.vinted?.primaryColor, formData.platformFields.vinted?.secondaryColor]
              .filter((id): id is number => typeof id === 'number' && id > 0),
            brand_id: 1, // "No brand" default — overridden by mapper if brand is set
            brand_title: formData.brand || '',
            size_id: formData.platformFields.shared?.vintedSizeId
              ? Number(formData.platformFields.shared.vintedSizeId)
              : null,
            status_id: formData.condition === 'new_with_tags' ? 6
              : formData.condition === 'new_without_tags' ? 1
              : formData.condition === 'very_good' ? 2
              : formData.condition === 'good' ? 3
              : formData.condition === 'fair' ? 4
              : 5, // poor
            currency: 'GBP',
            is_draft: false,
          },
        },
      } : {}),
      platformPrices: formData.platformPrices,
    },
    status,
  })

  const checkPlanLimit = async () => {
    const planCheck = await fetch('/api/finds?limit=1&offset=0&source_type=manual')
    if (!planCheck.ok) return
    const planData = await planCheck.json()
    const total = planData?.data?.pagination?.total ?? 0
    const planLimits: Record<string, number | null> = { free: 10, nester: 100, forager: 500, flock: null }
    const profileRes = await fetch('/api/profile')
    if (!profileRes.ok) return
    const profile = await profileRes.json()
    const plan = profile?.data?.data?.plan ?? 'free'
    const limit = planLimits[plan] ?? null
    if (limit !== null && total >= limit) {
      throw new Error(`You've reached your ${limit}-find limit on the ${plan.charAt(0).toUpperCase()+plan.slice(1)} plan. Upgrade to add more finds.`)
    }
  }

  const handleSaveDraft = async () => {
    setIsLoading(true)
    setError(null)
    setUploadProgress(0)
    try {
      await checkPlanLimit()
      const response = await fetch('/api/finds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload('draft')),
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
      const message = (err as Error).message || 'Could not save draft. Please try again.'
      setError(message)
      showError(err, 'Could not save draft. Please try again.')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  const handlePublish = async () => {
    if (!formData.title.trim()) { setError('Title is required'); return }
    if (!formData.category) { setError('Category is required'); return }
    if (!formData.price || formData.price <= 0) { setError('Price is required to publish'); return }
    if (!formData.condition) { setError('Condition is required to publish'); return }
    if (formData.photos.length === 0) { setError('At least one photo is required to publish'); return }
    if (formData.selectedPlatforms.length === 0) { setError('Select at least one marketplace'); return }
    if (formData.category && formData.selectedPlatforms.length > 0 && !fieldConfig) {
      setError('Loading field requirements — please try again'); return
    }

    // Check marketplace-specific required fields — block publish if any are empty.
    if (fieldConfig) {
      const missing = new Set<string>()

      // Check all fields marked required + shown in fieldConfig
      // Look in shared fields first, then per-platform fields
      for (const [key, cfg] of Object.entries(fieldConfig)) {
        if (!cfg.required || !cfg.show) continue
        let value = formData.platformFields.shared?.[key]
        // Also check per-platform field namespaces
        if (value === undefined || value === null || value === '') {
          for (const p of formData.selectedPlatforms) {
            const platFields = (formData.platformFields as Record<string, Record<string, unknown> | undefined>)[p]
            const platVal = platFields?.[key]
            if (platVal !== undefined && platVal !== null && platVal !== '') {
              value = platVal as typeof value
              break
            }
          }
        }
        const isEmpty = value === undefined || value === null || value === '' ||
          (Array.isArray(value) && value.length === 0)
        if (isEmpty) missing.add(key)
      }

      // Colour has a special case: Vinted primaryColor picker counts as filled
      if (missing.has('colour')) {
        const hasColour = !!(
          (formData.selectedPlatforms.includes('vinted') && formData.platformFields.vinted?.primaryColor) ||
          (formData.platformFields.shared?.colour && String(formData.platformFields.shared.colour).trim())
        )
        if (hasColour) missing.delete('colour')
      }

      // Etsy-specific: whoMade and whenMade are always required
      if (formData.selectedPlatforms.includes('etsy')) {
        const whoMade = formData.platformFields.shared?.whoMade
        if (!whoMade || !String(whoMade).trim()) missing.add('whoMade')
        const whenMade = formData.platformFields.shared?.whenMade
        if (!whenMade || !String(whenMade).trim()) missing.add('whenMade')
      }

      // Vinted clothing: size is required
      if (formData.selectedPlatforms.includes('vinted') && formData.category?.startsWith('clothing_')) {
        const size = formData.platformFields.shared?.size
        if (!size || !String(size).trim()) missing.add('size')
      }

      if (missing.size > 0) {
        setIncompleteRequiredFields(missing)
        const fieldNames = Array.from(missing).map(k =>
          k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
        )
        setError(`Required fields missing: ${fieldNames.join(', ')}`)
        return
      }

      // Clear any previously flagged fields
      setIncompleteRequiredFields(new Set())
    }

    setIsLoading(true)
    setError(null)
    setUploadProgress(0)

    // Initialize publish progress
    const initialMarketplaces: MarketplaceStatus[] = formData.selectedPlatforms.map(mp => ({
      marketplace: mp,
      status: 'waiting' as const,
    }))
    setPublishProgress({
      step: 'saving',
      photoCount: formData.photos.length,
      photosUploaded: 0,
      marketplaces: initialMarketplaces,
    })

    try {
      await checkPlanLimit()
      const response = await fetch('/api/finds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload('listed')),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error((errorData as { error?: string }).error || 'Failed to publish')
      }
      const data = await response.json()
      const findId = data?.data?.id || data?.id

      // Step 2: Upload photos
      if (findId && formData.photos.length > 0) {
        setPublishProgress(prev => prev ? { ...prev, step: 'uploading', findId } : prev)
        const uploadedPhotoUrls = await uploadPhotosToStorage(findId)
        setPublishProgress(prev => prev ? { ...prev, photosUploaded: formData.photos.length } : prev)
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

      // Step 3: Publish to marketplaces
      if (formData.selectedPlatforms.length > 0) {
        setPublishProgress(prev => prev ? { ...prev, step: 'publishing', findId } : prev)
        try {
          const crosslistRes = await fetch('/api/crosslist/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ findId, marketplaces: formData.selectedPlatforms }),
          })
          const crosslistData = await crosslistRes.json()
          const results = crosslistData.data?.results || {}

          // Update marketplace statuses from publish response
          const updatedMarketplaces: MarketplaceStatus[] = formData.selectedPlatforms.map(mp => {
            const r = results[mp] as { ok: boolean; listingUrl?: string; error?: string } | undefined
            if (!r) return { marketplace: mp, status: 'queued' as const }
            if (r.ok) return {
              marketplace: mp,
              status: r.listingUrl ? 'listed' as const : 'queued' as const,
              listingUrl: r.listingUrl,
            }
            return { marketplace: mp, status: 'error' as const, error: r.error }
          })
          setPublishProgress(prev => prev ? {
            ...prev,
            step: 'polling',
            findId,
            marketplaces: updatedMarketplaces,
          } : prev)

          const failures = Object.entries(results)
            .filter(([, r]: [string, unknown]) => !(r as { ok: boolean }).ok)
            .map(([p, r]: [string, unknown]) => `${p}: ${(r as { error?: string }).error}`)
          if (failures.length > 0 && failures.length === formData.selectedPlatforms.length) {
            // All platforms failed
            setError(`Saved but all publishes failed. Check Platform Connect.`)
          }
          // Don't redirect — progress panel will handle navigation
        } catch {
          setError('Saved but crosslist request failed. You can retry from the inventory page.')
        }
      }

      setUploadProgress(100)
      // Don't redirect — progress panel polls and user clicks "View in Finds"
    } catch (err) {
      setPublishProgress(null) // Close progress panel on fatal error
      const message = (err as Error).message || 'Could not publish. Please try again.'
      setError(message)
      showError(err, 'Could not publish. Please try again.')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  return { handleSaveDraft, handlePublish }
}
