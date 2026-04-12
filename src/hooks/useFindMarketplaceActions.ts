'use client'

import { useState, useCallback } from 'react'
import { parseApiError } from '@/lib/api-utils'
import type { Find } from '@/types'

interface MarketplaceData {
  marketplace: string
  status: string
  platform_listing_url: string | null
  platform_listing_id: string | null
  error_message: string | null
  platform_listed_at: string | null
}

const EXTENSION_ID = 'nblnainobllgbjkdkpeodjpopkgnpfgb'

type ChromeRuntime = {
  sendMessage?: (id: string, msg: unknown, cb: (resp: unknown) => void) => void
  lastError?: { message: string }
}

function getChromeRuntime(): ChromeRuntime | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { chrome?: { runtime?: ChromeRuntime } }).chrome?.runtime
}

interface UseFindMarketplaceActionsProps {
  find: Find | null
  id: string
  marketplaceData: MarketplaceData[]
  refreshMarketplaceData: () => void
  setFind: (find: Find) => void
  setMarketplaceData: (data: MarketplaceData[]) => void
}

export function useFindMarketplaceActions({
  find,
  id,
  marketplaceData,
  refreshMarketplaceData,
  setFind,
  setMarketplaceData,
}: UseFindMarketplaceActionsProps) {
  const [isListingOnVinted, setIsListingOnVinted] = useState(false)
  const [vintedListResult, setVintedListResult] = useState<{ ok: boolean; message: string; url?: string } | null>(null)
  const [isListingOnEbay, setIsListingOnEbay] = useState(false)
  const [ebayListResult, setEbayListResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [delistingPlatform, setDelistingPlatform] = useState<string | null>(null)
  const [delistConfirm, setDelistConfirm] = useState<string | null>(null)
  const [retryingPlatform, setRetryingPlatform] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleListOnVinted = useCallback(async () => {
    if (!find) return
    setIsListingOnVinted(true)
    setVintedListResult(null)

    const runtime = getChromeRuntime()
    if (!runtime?.sendMessage) {
      setVintedListResult({ ok: false, message: 'Wrenlist extension not detected. Install it and open Vinted in another tab.' })
      setIsListingOnVinted(false)
      return
    }

    try {
      const payloadRes = await fetch(`/api/chrome-extension/vinted/product-payload/${id}`)
      if (!payloadRes.ok) await parseApiError(payloadRes, 'Failed to build Vinted payload')
      const payloadData = await payloadRes.json()
      const product = payloadData?.data?.product ?? payloadData?.product
      if (!product) throw new Error('No product payload returned')

      await new Promise<void>((resolve, reject) => {
        runtime.sendMessage!(
          EXTENSION_ID,
          { action: 'publishtomarketplace', marketplace: 'vinted', product },
          (resp: unknown) => {
            const r = resp as { success?: boolean; ok?: boolean; error?: string } | null
            if (runtime.lastError) reject(new Error(runtime.lastError.message))
            else if (!r?.success && !r?.ok) reject(new Error(r?.error || 'Extension returned failure'))
            else resolve()
          }
        )
      })

      setVintedListResult({ ok: true, message: 'Sent to Vinted — check the extension tab to confirm.' })
    } catch (err) {
      setVintedListResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to list on Vinted' })
    } finally {
      setIsListingOnVinted(false)
    }
  }, [find, id])

  const handleListOnEbay = useCallback(async () => {
    if (!find) return
    setIsListingOnEbay(true)
    setEbayListResult(null)

    const runtime = getChromeRuntime()
    if (!runtime?.sendMessage) {
      setEbayListResult({ ok: false, message: 'Wrenlist extension not detected. Install it and open eBay in another tab.' })
      setIsListingOnEbay(false)
      return
    }

    try {
      const payloadRes = await fetch(`/api/chrome-extension/ebay/product-payload/${id}`)
      if (!payloadRes.ok) await parseApiError(payloadRes, 'Failed to build eBay payload')
      const payloadData = await payloadRes.json()
      const product = payloadData?.data?.product ?? payloadData?.product
      if (!product) throw new Error('No product payload returned')

      await new Promise<void>((resolve, reject) => {
        runtime.sendMessage!(
          EXTENSION_ID,
          { action: 'publishtomarketplace', marketplace: 'ebay', product },
          (resp: unknown) => {
            const r = resp as { success?: boolean; ok?: boolean; error?: string } | null
            if (runtime.lastError) reject(new Error(runtime.lastError.message))
            else if (!r?.success && !r?.ok) reject(new Error(r?.error || 'Extension returned failure'))
            else resolve()
          }
        )
      })

      setEbayListResult({ ok: true, message: 'Sent to eBay — check the extension tab to confirm.' })
    } catch (err) {
      setEbayListResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to list on eBay' })
    } finally {
      setIsListingOnEbay(false)
    }
  }, [find, id])

  const handleDelistFromVinted = useCallback(async () => {
    if (!find) return
    setIsListingOnVinted(true)
    setVintedListResult(null)

    try {
      const vintedPmd = marketplaceData.find((m) => m.marketplace === 'vinted')
      if (!vintedPmd) {
        setVintedListResult({ ok: false, message: 'Vinted listing not found' })
        setIsListingOnVinted(false)
        return
      }

      const pmdRes = await fetch(`/api/finds/${id}/marketplace?marketplace=vinted`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'needs_delist' }),
      })

      if (!pmdRes.ok) throw new Error('Failed to queue delist')

      const runtime = getChromeRuntime()
      if (runtime?.sendMessage) {
        runtime.sendMessage(
          EXTENSION_ID,
          { action: 'delistlistingfrommarketplace', marketplace: 'vinted', listingId: vintedPmd.platform_listing_id },
          () => { /* non-fatal */ }
        )
      }

      refreshMarketplaceData()
      setVintedListResult({ ok: true, message: 'Delist queued — extension will remove from Vinted shortly.' })
    } catch (err) {
      setVintedListResult({ ok: false, message: err instanceof Error ? err.message : 'Failed to delist from Vinted' })
    } finally {
      setIsListingOnVinted(false)
    }
  }, [find, id, marketplaceData, refreshMarketplaceData])

  const handleDelistFromPlatform = useCallback(async (marketplace: string) => {
    if (!find) return
    setDelistConfirm(null)
    setDelistingPlatform(marketplace)
    try {
      const res = await fetch('/api/crosslist/delist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ findId: find.id, marketplace }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Delist from ${marketplace} failed`)
      }
      refreshMarketplaceData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Delist failed')
    } finally {
      setDelistingPlatform(null)
    }
  }, [find, refreshMarketplaceData])

  const handleRetryPublish = useCallback(async (marketplace: string) => {
    if (!find) return
    setRetryingPlatform(marketplace)
    try {
      const res = await fetch(`/api/finds/${id}/marketplace?marketplace=${marketplace}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'needs_publish' }),
      })
      if (!res.ok) throw new Error('Failed to retry')
      refreshMarketplaceData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetryingPlatform(null)
    }
  }, [find, id, refreshMarketplaceData])

  const handleRelistOnVinted = useCallback(async () => {
    if (!find) return
    setIsListingOnVinted(true)
    setVintedListResult(null)
    try {
      const vintedMeta = (find.platform_fields as Record<string, unknown> | null)?.vinted as { vintedMetadata?: Record<string, unknown>; originalListingId?: string } | undefined
      const storedVintedMeta = vintedMeta?.vintedMetadata
      const originalListingId = vintedMeta?.originalListingId

      if (!storedVintedMeta && !originalListingId) {
        setVintedListResult({ ok: false, message: 'No Vinted metadata stored — item must be relisted manually on Vinted.' })
        return
      }

      if (typeof window === 'undefined') return
      const runtime = getChromeRuntime()
      if (!runtime?.sendMessage) {
        setVintedListResult({ ok: false, message: 'Extension not available.' })
        return
      }

      const response = await new Promise<{ success: boolean; message?: string; listingId?: string; product?: { id?: string | number; url?: string } }>((resolve) => {
        const timeout = setTimeout(() => resolve({ success: false, message: 'Extension timed out.' }), 30000)
        runtime.sendMessage!(
          EXTENSION_ID,
          {
            action: 'postlistingtomarketplace',
            marketplace: 'vinted',
            vintedTld: 'co.uk',
            wrenlistBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
            productData: {
              id: find.id,
              title: find.name,
              description: find.description || '',
              price: Number(find.asking_price_gbp) || 0,
              images: (find.photos?.length ? find.photos : (storedVintedMeta?.photos as Array<{ full_size_url?: string; url?: string }>)?.map((p) => p.full_size_url || p.url).filter(Boolean)) || [],
              condition: (() => {
                const c = find.condition?.toLowerCase() || ''
                if (c === 'new_with_tags') return 'NewWithTags'
                if (c === 'new_without_tags') return 'NewWithoutTags'
                if (c === 'very_good') return 'VeryGood'
                if (c === 'good') return 'Good'
                if (c === 'fair') return 'Fair'
                if (c === 'poor') return 'Poor'
                if (c === 'excellent') return 'NewWithoutTags'
                return 'Good'
              })(),
              category: (storedVintedMeta?.catalog_id as number | string | undefined) ? [String(storedVintedMeta?.catalog_id)] : [find.category || 'other'],
              brand: find.brand || '',
              dynamicProperties: {
                colorIds: (storedVintedMeta?.color_ids as number[] | undefined) || [],
                packageSizeId: (storedVintedMeta?.shipping as { package_size_id?: number } | undefined)?.package_size_id || (storedVintedMeta?.package_size_id as number | undefined) || 2,
                ...((storedVintedMeta?.isbn as string | undefined) ? { ISBN: storedVintedMeta?.isbn } : {}),
                vintedItemAttributes: (storedVintedMeta?.item_attributes as unknown[]) || [],
                vintedBrandId: (storedVintedMeta?.brand_id as number | null | undefined) || null,
              },
              vintedCatalogId: (storedVintedMeta?.catalog_id as number | null | undefined) || null,
              size: (storedVintedMeta?.size_id as number | undefined) ? [String(storedVintedMeta?.size_id)] : (find.size ? [find.size] : []),
              shipping: {
                shippingType: 'Prepaid',
                shippingWeight: {
                  value: Math.round((((storedVintedMeta?.shipping as { weight_grams?: number } | undefined)?.weight_grams || 500) / 1000) * 10) / 10,
                  unit: 'kg',
                },
                packageSizeId: (storedVintedMeta?.shipping as { package_size_id?: number } | undefined)?.package_size_id || (storedVintedMeta?.package_size_id as number | undefined) || 2,
              },
              vintedMetadata: storedVintedMeta,
            },
          },
          (res: unknown) => {
            clearTimeout(timeout)
            const r = res as { success?: boolean; message?: string; listingId?: string; product?: { id?: string | number; url?: string } } | null
            if (runtime.lastError) {
              resolve({ success: false, message: runtime.lastError.message })
            } else if (r) {
              resolve({ success: r.success ?? false, message: r.message, listingId: r.listingId, product: r.product })
            } else {
              resolve({ success: false, message: 'No response from extension' })
            }
          }
        )
      })

      if (response.success) {
        const newListingId = response.product?.id ? String(response.product.id) : undefined
        const newListingUrl = response.product?.url ?? undefined
        await fetch(`/api/finds/${find.id}/marketplace?marketplace=vinted`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'listed', platform_listing_id: newListingId, platform_listing_url: newListingUrl }),
        })
        setVintedListResult({ ok: true, message: 'Relisted on Vinted successfully!', url: newListingUrl })
        await Promise.all([
          fetch(`/api/finds/${id}`).then((res) => res.json()).then((result) => {
            if (result.data) setFind(result.data)
          }),
          fetch(`/api/finds/${id}/marketplace`).then((res) => res.json()).then((result) => {
            if (result?.data) setMarketplaceData(result.data)
          }),
        ])
      } else {
        setVintedListResult({ ok: false, message: response.message || 'Relist failed.' })
      }
    } catch (e) {
      setVintedListResult({ ok: false, message: e instanceof Error ? e.message : 'Relist failed.' })
    } finally {
      setIsListingOnVinted(false)
    }
  }, [find, id, setFind, setMarketplaceData])

  return {
    isListingOnVinted,
    vintedListResult,
    setVintedListResult,
    isListingOnEbay,
    ebayListResult,
    setEbayListResult,
    delistingPlatform,
    delistConfirm,
    setDelistConfirm,
    retryingPlatform,
    actionError,
    setActionError,
    handleListOnVinted,
    handleListOnEbay,
    handleDelistFromVinted,
    handleDelistFromPlatform,
    handleRetryPublish,
    handleRelistOnVinted,
  }
}
