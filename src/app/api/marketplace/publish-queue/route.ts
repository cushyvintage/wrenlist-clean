import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'
import { getPlatformCategoryIdFromDb } from '@/lib/category-db'

/**
 * GET /api/marketplace/publish-queue
 * Returns finds where any marketplace has status = "needs_publish".
 * Extension polls this to find listings to publish.
 */
export const GET = withAuth(async (_req, user) => {
  // Use service role client with explicit user_id filter instead of RLS.
  // The extension's MV3 service worker authenticates via Bearer token, so
  // the cookie-based Supabase client has no session and RLS blocks queries.
  // withAuth already verified the user, so filtering by user_id is safe.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Use a JOIN instead of two-step (fetch all find IDs → .in()) to avoid
  // URL length limits when a user has many finds (1000+ UUIDs in the query
  // string exceeds PostgREST's URL limit and causes intermittent 500s).
  const { data, error } = await supabaseAdmin
    .from('product_marketplace_data')
    .select('find_id, marketplace, fields, listing_price, platform_category_id, finds!inner(user_id)')
    .eq('status', 'needs_publish')
    .eq('finds.user_id', user.id)

  if (error) {
    console.error('[PublishQueue] Marketplace data query failed:', error)
    return ApiResponseHelper.internalError()
  }

  const items = data || []
  if (items.length === 0) {
    return ApiResponseHelper.success([])
  }

  // Enrich with find data
  const findIds = [...new Set(items.map((d) => d.find_id))]
  const { data: finds } = await supabaseAdmin
    .from('finds')
    .select('id, name, description, category, brand, condition, asking_price_gbp, photos, sku, colour, size, platform_fields, shipping_weight_grams')
    .eq('user_id', user.id)
    .in('id', findIds)

  const findsMap: Record<string, Record<string, unknown>> = {}
  if (finds) {
    for (const f of finds) {
      findsMap[f.id] = f
    }
  }

  // If any Shopify items, fetch the user's Shopify store domain
  const hasShopify = items.some((item) => item.marketplace === 'shopify')
  let shopifyStoreDomain: string | null = null
  if (hasShopify) {
    const { data: conn } = await supabaseAdmin
      .from('shopify_connections')
      .select('store_domain')
      .eq('user_id', user.id)
      .single()
    shopifyStoreDomain = conn?.store_domain || null
  }

  const queue = await Promise.all(items.map(async (item) => {
    const find = findsMap[item.find_id] || null
    // Resolve platform_category_id: PMD → vintedMetadata → category map
    let categoryId = item.platform_category_id || null
    if (!categoryId && find) {
      // For Vinted: prefer vintedMetadata.catalog_id (specific sub-category from form/import)
      const pf = (find.platform_fields ?? {}) as Record<string, unknown>
      const vintedMeta = ((pf.vinted ?? {}) as Record<string, unknown>).vintedMetadata as Record<string, unknown> | undefined
      if (item.marketplace === 'vinted' && vintedMeta?.catalog_id) {
        categoryId = String(vintedMeta.catalog_id)
      }
      // Fallback: resolve from category DB
      if (!categoryId && find.category && ['vinted', 'depop', 'etsy', 'shopify'].includes(item.marketplace)) {
        const mapped = await getPlatformCategoryIdFromDb(find.category as string, item.marketplace)
        if (mapped) categoryId = mapped
      }
    }
    return {
      find_id: item.find_id,
      marketplace: item.marketplace,
      find: find ? { ...find, shipping_weight_grams: find.shipping_weight_grams || 500 } : find,
      listing_price: item.listing_price || null,
      platform_category_id: categoryId,
      fields: item.fields || null,
      ...(item.marketplace === 'shopify' && shopifyStoreDomain
        ? { settings: { shopifyShopUrl: shopifyStoreDomain } }
        : {}),
    }
  }))

  return ApiResponseHelper.success(queue)
})

/**
 * POST /api/marketplace/publish-queue
 * Called by extension after publishing (success or failure).
 * On success: updates status to "listed" and sets platform_listing_id/url.
 * On error: updates status to "error" and stores error_message + retry_count in fields.
 *
 * Body: { find_id, marketplace, status?, error_message?, platform_listing_id?, platform_listing_url?, fields? }
 *   status: 'listed' (default) or 'error'
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const {
    find_id: findId,
    marketplace,
    platform_listing_id,
    platform_listing_url,
    fields: extraFields,
    status: reportedStatus,
    error_message: errorMessage,
  } = body as {
    find_id?: string
    marketplace?: string
    platform_listing_id?: string
    platform_listing_url?: string
    fields?: Record<string, unknown>
    status?: 'draft' | 'listed' | 'error' | 'needs_publish'
    error_message?: string
  }

  if (!findId || !marketplace) {
    return ApiResponseHelper.badRequest('find_id and marketplace are required')
  }

  // Use service role client — extension authenticates via Bearer token so
  // the cookie-based Supabase client has no session. withAuth verified the user.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify ownership and fetch context for error enrichment
  const { data: find, error: findError } = await supabaseAdmin
    .from('finds')
    .select('id, name, category')
    .eq('id', findId)
    .eq('user_id', user.id)
    .single()

  if (findError || !find) {
    return ApiResponseHelper.notFound('Find not found')
  }

  // draft = saved as draft on marketplace (not live yet)
  // listed = published live on marketplace
  // needs_publish = retry (keep in queue with updated retry_count)
  // error = exhausted retries
  const targetStatus = reportedStatus === 'error'
    ? 'error'
    : reportedStatus === 'needs_publish'
      ? 'needs_publish'
      : reportedStatus === 'draft'
        ? 'draft'
        : 'listed'

  // Update marketplace data (merge any extra fields like collection_name, retry_count)
  const updateData: Record<string, unknown> = {
    status: targetStatus,
    updated_at: new Date().toISOString(),
  }

  if (targetStatus === 'listed' || targetStatus === 'draft') {
    updateData.platform_listing_id = platform_listing_id || null
    updateData.platform_listing_url = platform_listing_url || null
    updateData.last_synced_at = new Date().toISOString()
  }

  if (targetStatus === 'error' && errorMessage) {
    updateData.error_message = errorMessage
  }

  if (extraFields && typeof extraFields === 'object') {
    updateData.fields = extraFields
  }

  const { error } = await supabaseAdmin
    .from('product_marketplace_data')
    .upsert(
      { find_id: findId, marketplace, ...updateData },
      { onConflict: 'find_id,marketplace' }
    )

  if (error) {
    return ApiResponseHelper.internalError()
  }

  const eventType = targetStatus === 'error' ? 'publish_error' : targetStatus === 'draft' ? 'listed' : 'listed'
  logMarketplaceEvent(supabaseAdmin, user.id, {
    findId,
    marketplace,
    eventType: targetStatus === 'error' ? 'publish_error' : 'listed',
    source: 'extension',
    details: targetStatus === 'error'
      ? { error_message: errorMessage, find_name: find.name, find_category: find.category, retry_count: extraFields?.retry_count }
      : { platform_listing_id, platform_listing_url, find_name: find.name },
  })

  // Sync publish_jobs table — the extension still uses this old endpoint but
  // the Jobs page reads from publish_jobs. Mark matching pending/running publish
  // jobs as completed or failed so the UI stays in sync.
  const jobStatus = (targetStatus === 'listed' || targetStatus === 'draft') ? 'completed' : targetStatus === 'error' ? 'failed' : null
  if (jobStatus) {
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('publish_jobs')
      .update({
        status: jobStatus,
        completed_at: now,
        updated_at: now,
        ...(jobStatus === 'completed' ? {
          result: { platform_listing_id, platform_listing_url, status: targetStatus },
        } : {}),
        ...(jobStatus === 'failed' && errorMessage ? { error_message: errorMessage } : {}),
      })
      .eq('find_id', findId)
      .eq('platform', marketplace)
      .eq('action', 'publish')
      .eq('user_id', user.id)
      .in('status', ['pending', 'claimed', 'running'])
  }

  return ApiResponseHelper.success({ message: `Status updated to ${targetStatus}` })
})
