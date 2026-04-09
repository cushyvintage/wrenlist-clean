import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent, classifyError } from '@/lib/marketplace-events'
import { checkRateLimit } from '@/lib/rate-limit'
import { createPublishJob } from '@/lib/publish-jobs'
import { createClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { getPlatformCategoryId } from '@/data/marketplace-category-map'
import type { Platform } from '@/types'

// eBay publishes via API; Shopify and others queue for extension.
// Etsy: API key applied (Apr 2026, pending approval). Until approved,
// Etsy crosslisting uses browser automation via the Chrome extension.
// Once the key is active, add 'etsy' here and build the OAuth flow.
// Credentials: .env.local (ETSY_API_KEY, ETSY_SHARED_SECRET).
const API_MARKETPLACES = new Set(['ebay'])
const SUPPORTED_MARKETPLACES: Platform[] = ['ebay', 'shopify', 'vinted', 'depop', 'poshmark', 'mercari', 'facebook', 'whatnot', 'grailed', 'etsy']

interface MarketplaceResult {
  ok: boolean
  listingUrl?: string
  error?: string
  alreadyListed?: boolean
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
  const { success } = await checkRateLimit(`crosslist-publish:${user.id}`, 10)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json()
  const { findId, marketplaces, publishMode } = body as {
    findId?: string
    marketplaces?: string[]
    /** For Etsy: "draft" (default) or "publish" (live, $0.20 fee) */
    publishMode?: 'draft' | 'publish'
  }

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

  // Verify ownership and fetch full find data (needed for job payload snapshot)
  const { data: find, error: findError } = await supabase
    .from('finds')
    .select('id, name, description, category, brand, condition, asking_price_gbp, photos, sku, colour, size, status, platform_fields, shipping_weight_grams')
    .eq('id', findId)
    .eq('user_id', user.id)
    .single()

  if (findError || !find) {
    return ApiResponseHelper.notFound('Find not found')
  }

  const results: Record<string, MarketplaceResult> = {}

  // Extract per-platform prices from platform_fields (set in add-find form)
  const platformPrices = (find.platform_fields as Record<string, unknown>)?.platformPrices as
    Record<string, number | null> | undefined

  // Build base URL for internal API calls — host header is always present in Next.js
  const host = req.headers.get('host') || 'localhost:3004'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  for (const marketplace of marketplaces) {
    Sentry.addBreadcrumb({
      category: 'marketplace',
      message: `Publishing find to ${marketplace}`,
      level: 'info',
      data: { findId, marketplace, category: find.category, name: find.name },
    })

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
          logMarketplaceEvent(supabase, user.id, { findId, marketplace: 'ebay', eventType: 'listed', source: 'api', details: { listingUrl: data.data.listingUrl } })
        } else {
          const ebayError = data.error || data.data?.message || 'eBay publish failed'
          results.ebay = { ok: false, error: ebayError }
          Sentry.captureMessage(`eBay publish failed: ${ebayError}`, {
            level: 'warning',
            tags: { marketplace: 'ebay', error_class: classifyError(ebayError) },
            extra: { findId, findName: find.name, category: find.category },
          })
          // Persist the error in PMD so user can see it on the find detail page
          await supabase.from('product_marketplace_data').upsert(
            {
              find_id: findId,
              marketplace: 'ebay',
              status: 'error',
              error_message: ebayError,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'find_id,marketplace' }
          )
        }
      } else {
        // Check if already listed — don't re-queue to avoid duplicates
        const { data: existing } = await supabase
          .from('product_marketplace_data')
          .select('status, platform_listing_url')
          .eq('find_id', findId)
          .eq('marketplace', marketplace)
          .single()

        if (existing?.status === 'listed') {
          results[marketplace] = { ok: true, listingUrl: existing.platform_listing_url ?? undefined, alreadyListed: true }
          continue
        }

        // Queue for extension via publish-queue (only if not already listed)
        const perPlatformPrice = platformPrices?.[marketplace] ?? null
        // Pass publishMode in fields for Etsy (defaults to "draft" in extension)
        const queueFields: Record<string, unknown> = {}
        if (marketplace === 'etsy' && publishMode) {
          queueFields.publishMode = publishMode
        }
        const { error: queueError } = await supabase
          .from('product_marketplace_data')
          .upsert(
            {
              find_id: findId,
              marketplace,
              status: 'needs_publish',
              ...(perPlatformPrice != null ? { listing_price: perPlatformPrice } : {}),
              ...(Object.keys(queueFields).length > 0 ? { fields: queueFields } : {}),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'find_id,marketplace' }
          )

        if (queueError) {
          results[marketplace] = { ok: false, error: `Failed to queue: ${queueError.message}` }
        } else {
          results[marketplace] = { ok: true, listingUrl: undefined }
          logMarketplaceEvent(supabase, user.id, { findId, marketplace, eventType: 'queued', source: 'api' })

          // Dual-write: also create a publish job for the new job queue
          const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )

          // Resolve platform_category_id (same logic as old publish-queue GET)
          let platformCategoryId: string | null = null
          const pf = (find.platform_fields ?? {}) as Record<string, unknown>
          const vintedMeta = ((pf.vinted ?? {}) as Record<string, unknown>).vintedMetadata as Record<string, unknown> | undefined
          if (marketplace === 'vinted' && vintedMeta?.catalog_id) {
            platformCategoryId = String(vintedMeta.catalog_id)
          }
          if (!platformCategoryId && find.category && ['vinted', 'depop', 'etsy', 'shopify'].includes(marketplace)) {
            const mapped = getPlatformCategoryId(find.category, marketplace as 'vinted' | 'depop' | 'etsy' | 'shopify')
            if (mapped) platformCategoryId = mapped
          }

          // Fetch Shopify store URL if needed
          const jobSettings: Record<string, unknown> = {}
          if (marketplace === 'shopify') {
            const { data: conn } = await supabaseAdmin
              .from('shopify_connections')
              .select('store_domain')
              .eq('user_id', user.id)
              .single()
            if (conn?.store_domain) jobSettings.shopifyShopUrl = conn.store_domain
          }

          const jobResult = await createPublishJob(supabaseAdmin, {
            user_id: user.id,
            find_id: findId,
            platform: marketplace,
            action: 'publish',
            scheduled_for: (body as Record<string, unknown>).scheduled_for as string | undefined,
            stale_policy: ((body as Record<string, unknown>).stale_policy as 'run_if_late' | 'skip_if_late') || undefined,
            payload: {
              find: { ...find, shipping_weight_grams: find.shipping_weight_grams ?? 500 },
              listing_price: perPlatformPrice,
              platform_category_id: platformCategoryId,
              fields: queueFields,
              ...(Object.keys(jobSettings).length > 0 ? { settings: jobSettings } : {}),
            },
          })
          if (jobResult.error) {
            console.error('[DualWrite] Failed to create publish job for', marketplace, jobResult.error)
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      results[marketplace] = { ok: false, error: msg }
    }
  }

  // Update find status to 'listed' if any marketplace succeeded
  const anySuccess = Object.values(results).some((r) => (r as { ok: boolean }).ok)
  if (anySuccess) {
    await supabase
      .from('finds')
      .update({ status: 'listed', updated_at: new Date().toISOString() })
      .eq('id', findId)
      .eq('user_id', user.id)
  }

  return ApiResponseHelper.success({ results })
})
