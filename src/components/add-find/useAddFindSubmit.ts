'use client'

import { Dispatch, SetStateAction } from 'react'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { FieldConfig } from '@/types'
import type { FormData } from './useAddFindForm'

interface SubmitDeps {
  formData: FormData
  fieldConfig: Record<string, FieldConfig> | null
  router: AppRouterInstance
  setIsLoading: Dispatch<SetStateAction<boolean>>
  setError: Dispatch<SetStateAction<string | null>>
  setUploadProgress: Dispatch<SetStateAction<number>>
}

export function useAddFindSubmit(deps: SubmitDeps) {
  const { formData, fieldConfig, router, setIsLoading, setError, setUploadProgress } = deps

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
    shipping_weight_grams: formData.shippingWeight,
    shipping_length_cm: formData.shippingDimensions.length,
    shipping_width_cm: formData.shippingDimensions.width,
    shipping_height_cm: formData.shippingDimensions.height,
    selected_marketplaces: formData.selectedPlatforms,
    platform_fields: {
      ...formData.platformFields,
      platformPrices: formData.platformPrices,
    },
    status,
  })

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
        body: JSON.stringify(buildPayload('listed')),
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

  return { handleSaveDraft, handlePublish }
}
