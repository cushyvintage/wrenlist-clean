import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'

interface DelistQueueItem {
  find_id: string
  marketplace: string
  platform_listing_id: string
  platform_listing_url: string | null
  fields: Record<string, unknown> | null
}

/**
 * GET /api/marketplace/delist-queue
 * Returns all finds where any marketplace has status = "needs_delist"
 * Extension polls this to get listings to delist
 *
 * Response: Array of { find_id, marketplace, platform_listing_id, platform_listing_url, fields }
 */
export const GET = withAuth(async (_req, user) => {
  // Use service role client — extension authenticates via Bearer token so
  // cookie-based client has no session and RLS blocks queries.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Use a JOIN instead of two-step (fetch all find IDs → .in()) to avoid
  // URL length limits when a user has many finds (1000+ UUIDs in the query
  // string exceeds PostgREST's URL limit and causes intermittent 500s).
  const { data, error } = await supabase
    .from('product_marketplace_data')
    .select('find_id, marketplace, platform_listing_id, platform_listing_url, fields, finds!inner(user_id)')
    .eq('status', 'needs_delist')
    .eq('finds.user_id', user.id)

  if (error) {
    console.error('[Delist Queue] Failed to fetch queue:', error)
    return ApiResponseHelper.internalError()
  }

  // Filter out items without platform_listing_id (can't delist without an ID).
  // Mark invalid items as error so the user gets feedback instead of being stuck.
  const allItems = data || []
  const validItems: DelistQueueItem[] = []

  for (const item of allItems) {
    if (item.platform_listing_id) {
      validItems.push(item as DelistQueueItem)
    } else {
      // Auto-fail: no listing ID means we can't navigate to the listing to delist it
      await supabase
        .from('product_marketplace_data')
        .update({
          status: 'error',
          error_message: 'Cannot delist: no listing ID found. The listing ID was not captured during publish. Please delist manually from the marketplace.',
          updated_at: new Date().toISOString(),
        })
        .eq('find_id', item.find_id)
        .eq('marketplace', item.marketplace)
    }
  }

  // If any Shopify items, fetch the user's Shopify store domain
  const hasShopify = validItems.some((item) => item.marketplace === 'shopify')
  let shopifyStoreDomain: string | null = null
  if (hasShopify) {
    const { data: conn } = await supabase
      .from('shopify_connections')
      .select('store_domain')
      .eq('user_id', user.id)
      .single()
    shopifyStoreDomain = conn?.store_domain || null
  }

  const queue = validItems.map((item) => ({
    ...item,
    ...(item.marketplace === 'shopify' && shopifyStoreDomain
      ? { settings: { shopifyShopUrl: shopifyStoreDomain } }
      : {}),
  }))

  return ApiResponseHelper.success(queue)
})

/**
 * POST /api/marketplace/delist-queue
 * Called by extension after delisting (success or failure).
 * On success: updates status to "delisted".
 * On error: updates status to "error" and stores error_message + retry_count in fields.
 *
 * Body: { find_id, marketplace, status?, error_message?, fields? }
 *   status: 'delisted' (default) or 'error'
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const {
    find_id: findId,
    marketplace,
    status: reportedStatus,
    error_message: errorMessage,
    fields: extraFields,
  } = body as {
    find_id?: string
    marketplace?: string
    status?: 'delisted' | 'error' | 'needs_delist'
    error_message?: string
    fields?: Record<string, unknown>
  }

  if (!findId || !marketplace) {
    return ApiResponseHelper.badRequest(
      'find_id and marketplace are required'
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify user owns this find
  const { data: find, error: findError } = await supabase
    .from('finds')
    .select('id')
    .eq('id', findId)
    .eq('user_id', user.id)
    .single()

  if (findError || !find) {
    return ApiResponseHelper.notFound('Find not found')
  }

  // needs_delist = retry (keep in queue with updated retry_count)
  // error = exhausted retries
  // delisted = success (default)
  const targetStatus = reportedStatus === 'error'
    ? 'error'
    : reportedStatus === 'needs_delist'
      ? 'needs_delist'
      : 'delisted'

  const updateData: Record<string, unknown> = {
    status: targetStatus,
    updated_at: new Date().toISOString(),
  }

  if (targetStatus === 'error' && errorMessage) {
    updateData.error_message = errorMessage
  }

  if (extraFields && typeof extraFields === 'object') {
    updateData.fields = extraFields
  }

  const { error } = await supabase
    .from('product_marketplace_data')
    .update(updateData)
    .eq('find_id', findId)
    .eq('marketplace', marketplace)

  if (error) {
    console.error('[Delist Queue] Failed to update status:', error)
    return ApiResponseHelper.internalError()
  }

  const eventType = targetStatus === 'error' ? 'delist_error' : 'delisted'
  logMarketplaceEvent(supabase, user.id, {
    findId,
    marketplace,
    eventType,
    source: 'extension',
    details: targetStatus === 'error' ? { error_message: errorMessage } : undefined,
  })

  return ApiResponseHelper.success({ message: `Status updated to ${targetStatus}` })
})
