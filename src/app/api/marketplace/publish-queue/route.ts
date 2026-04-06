import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'

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

  // First get this user's find IDs, then get their marketplace data
  const { data: userFinds } = await supabaseAdmin
    .from('finds')
    .select('id')
    .eq('user_id', user.id)

  const userFindIds = (userFinds || []).map((f) => f.id)
  if (userFindIds.length === 0) {
    return ApiResponseHelper.success([])
  }

  const { data, error } = await supabaseAdmin
    .from('product_marketplace_data')
    .select('find_id, marketplace, fields, listing_price, platform_category_id')
    .eq('status', 'needs_publish')
    .in('find_id', userFindIds)

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
    .select('id, name, description, category, brand, condition, asking_price_gbp, photos, sku, colour, size')
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

  const queue = items.map((item) => ({
    find_id: item.find_id,
    marketplace: item.marketplace,
    find: findsMap[item.find_id] || null,
    listing_price: item.listing_price || null,
    platform_category_id: item.platform_category_id || null,
    fields: item.fields || null,
    ...(item.marketplace === 'shopify' && shopifyStoreDomain
      ? { settings: { shopifyShopUrl: shopifyStoreDomain } }
      : {}),
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

  // Verify ownership
  const { data: find, error: findError } = await supabaseAdmin
    .from('finds')
    .select('id')
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
    .update(updateData)
    .eq('find_id', findId)
    .eq('marketplace', marketplace)

  if (error) {
    return ApiResponseHelper.internalError()
  }

  const eventType = targetStatus === 'error' ? 'publish_error' : 'listed'
  logMarketplaceEvent(supabaseAdmin, user.id, {
    findId,
    marketplace,
    eventType,
    source: 'extension',
    details: targetStatus === 'error'
      ? { error_message: errorMessage }
      : { platform_listing_id, platform_listing_url },
  })

  return ApiResponseHelper.success({ message: `Status updated to ${targetStatus}` })
})
