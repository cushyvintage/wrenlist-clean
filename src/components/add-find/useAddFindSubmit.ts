'use client'

import { Dispatch, SetStateAction } from 'react'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { FieldConfig } from '@/types'
import type { FormData } from './useAddFindForm'
import { getPlatformCategoryId } from '@/data/marketplace-category-map'
import type { PublishProgress, MarketplaceStatus } from '@/components/publish/PublishProgressPanel'

/** Resolve Vinted catalog ID — prefer category map, fall back to known working leaf IDs */
function getVintedCatalogId(category: string): number | null {
  // Try category map first
  const mapped = getPlatformCategoryId(category, 'vinted')
  if (mapped) return Number(mapped)

  // Fallback: known working Vinted leaf IDs for common stock categories
  // (from dom_stock_mapping + verified against Vinted UK API 2026-04-08)
  const VINTED_LEAF_FALLBACKS: Record<string, number> = {
    // Books & Media
    books_media: 2997,
    books_media_books: 2997,
    books_media_music: 2994,
    books_media_movies: 2993,
    books_media_video_games: 2995,
    // Home & Garden
    home_garden: 1934,
    home_garden_home_decor: 3822, // Sculptures & figurines
    home_garden_kitchen_dining: 1920, // Dinnerware (plates 1960, bowls 1959)
    home_garden_furniture: 3154,
    home_garden_bedding: 3816,
    home_garden_bath: 3832,
    home_garden_appliances: 3512,
    // Collectibles
    collectibles: 3823, // Decorative accessories
    collectibles_general: 3823,
    collectibles_general_collectibles: 3823,
    collectibles_militaria: 3823,
    collectibles_coins: 3823,
    collectibles_stamps: 3823,
    // Clothing
    clothing: 4, // Women's clothing (default)
    clothing_womenswear: 4,
    clothing_menswear: 2050,
    // Jewellery & Accessories
    craft_supplies: 1187, // Accessories
    // Electronics
    electronics: 2994,
    electronics_portable_audio: 2994,
    electronics_computers: 2994,
    // Toys & Games
    toys_games: 1499,
    // Antiques
    antiques: 1934, // Home accessories
    antiques_antique_decor: 1934,
    antiques_antique_furniture: 3154,
    // Art
    art: 3847, // Paintings
    art_paintings: 3847,
    art_prints: 3849,
    art_sculptures: 3822,
    // Sports
    sports_outdoors: 1499, // Use toys as fallback
    // Baby
    baby_toddler: 1193, // Kids
    // Pet supplies
    pet_supplies: 5196,
    // Vehicles & Parts
    vehicles_parts: 3512, // Hobby & DIY
    // Other / Misc
    other: 1934, // Home accessories
    other_other: 1934,
  }
  // Try exact match, then try parent segments
  if (VINTED_LEAF_FALLBACKS[category]) return VINTED_LEAF_FALLBACKS[category]
  const parent = category.split('_').slice(0, 2).join('_')
  if (VINTED_LEAF_FALLBACKS[parent]) return VINTED_LEAF_FALLBACKS[parent]
  const topLevel = category.split('_')[0] ?? ''
  if (topLevel && VINTED_LEAF_FALLBACKS[topLevel]) return VINTED_LEAF_FALLBACKS[topLevel]

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
}

export function useAddFindSubmit(deps: SubmitDeps) {
  const { formData, fieldConfig, router, setIsLoading, setError, setUploadProgress, setPublishProgress } = deps

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
          catalogId: formData.category ? getVintedCatalogId(formData.category) : null,
          vintedMetadata: {
            catalog_id: formData.category ? getVintedCatalogId(formData.category) : null,
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
      setError((err as Error).message || 'An error occurred')
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

    // Check marketplace-specific required fields — warn but don't block.
    // Missing fields are auto-filled at publish time (e.g. eBay aspects).
    // Colour is the only truly blocking field for Vinted.
    if (fieldConfig) {
      const hasColour = !!(
        (formData.selectedPlatforms.includes('vinted') && formData.platformFields.vinted?.primaryColor) ||
        (formData.platformFields.shared?.colour && String(formData.platformFields.shared.colour).trim())
      )
      // Only block on colour if Vinted is selected and colour is required
      const colourRequired = fieldConfig['colour']?.required && formData.selectedPlatforms.includes('vinted')
      if (colourRequired && !hasColour) {
        setError('Colour is required for Vinted — please select a colour')
        return
      }
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
      setError((err as Error).message || 'An error occurred')
    } finally {
      setIsLoading(false)
      setUploadProgress(0)
    }
  }

  return { handleSaveDraft, handlePublish }
}
