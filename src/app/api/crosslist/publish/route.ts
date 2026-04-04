import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import type { Platform } from '@/types'

// eBay and Shopify publish via API; all others queue for extension
const API_MARKETPLACES = new Set(['ebay', 'shopify'])
const SUPPORTED_MARKETPLACES: Platform[] = ['ebay', 'shopify', 'vinted', 'depop', 'poshmark', 'mercari', 'facebook', 'whatnot', 'grailed', 'etsy']

interface MarketplaceResult {
  ok: boolean
  listingUrl?: string
  error?: string
}

/**
 * POST /api/crosslist/publish
 *
 * Publishes a find to one or more marketplaces.
 * - eBay / Shopify: calls their publish APIs directly
 * - Vinted: queues via product_marketplace_data (extension polls publish-queue)
 *
 * Body: { findId: string, marketplaces: string[] }
 * Returns: { results: Record<string, MarketplaceResult> }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { findId, marketplaces } = body as { findId?: string; marketplaces?: string[] }

  if (!findId) {
    return ApiResponseHelper.badRequest('findId is required')
  }
  if (!marketplaces || marketplaces.length === 0) {
    return ApiResponseHelper.badRequest('marketplaces array is required')
  }

  const invalid = marketplaces.filter((m) => !SUPPORTED_MARKETPLACES.includes(m as Platform))
  if (invalid.length > 0) {
    return ApiResponseHelper.badRequest(`Unsupported marketplaces: ${invalid.join(', ')}`)
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership
  const { data: find, error: findError } = await supabase
    .from('finds')
    .select('id, name, status')
    .eq('id', findId)
    .eq('user_id', user.id)
    .single()

  if (findError || !find) {
    return ApiResponseHelper.notFound('Find not found')
  }

  const results: Record<string, MarketplaceResult> = {}

  // Build base URL for internal API calls — host header is always present in Next.js
  const host = req.headers.get('host') || 'localhost:3004'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  for (const marketplace of marketplaces) {
    try {
      if (marketplace === 'ebay') {
        // eBay — direct API publish
        const res = await fetch(`${baseUrl}/api/ebay/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: req.headers.get('cookie') || '',
          },
          body: JSON.stringify({ findId }),
        })
        const data = await res.json()
        if (res.ok && data.data?.success) {
          results.ebay = { ok: true, listingUrl: data.data.listingUrl }
        } else {
          results.ebay = { ok: false, error: data.error || data.data?.message || 'eBay publish failed' }
        }
      } else if (marketplace === 'shopify') {
        // Shopify — direct API publish
        const res = await fetch(`${baseUrl}/api/shopify/publish`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: req.headers.get('cookie') || '',
          },
          body: JSON.stringify({ findId }),
        })
        const data = await res.json()
        if (res.ok && data.data?.listingUrl) {
          results.shopify = { ok: true, listingUrl: data.data.listingUrl }
        } else {
          results.shopify = { ok: false, error: data.error || 'Shopify publish failed' }
        }
      } else {
        // All other marketplaces — queue for extension via publish-queue
        const { error: queueError } = await supabase
          .from('product_marketplace_data')
          .upsert(
            {
              find_id: findId,
              marketplace,
              status: 'needs_publish',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'find_id,marketplace' }
          )

        if (queueError) {
          results[marketplace] = { ok: false, error: `Failed to queue: ${queueError.message}` }
        } else {
          results[marketplace] = { ok: true, listingUrl: undefined }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results[marketplace] = { ok: false, error: msg }
    }
  }

  return ApiResponseHelper.success({ results })
})
