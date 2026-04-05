import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
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
  const supabase = await createSupabaseServerClient()

  // Get all user's find IDs first
  const { data: userFinds, error: findsError } = await supabase
    .from('finds')
    .select('id')
    .eq('user_id', user.id)

  if (findsError || !userFinds) {
    return ApiResponseHelper.internalError()
  }

  const findIds = userFinds.map((f: { id: string }) => f.id)

  // Find all marketplace data with needs_delist status for this user's finds
  const { data, error } = await supabase
    .from('product_marketplace_data')
    .select('find_id, marketplace, platform_listing_id, platform_listing_url, fields')
    .eq('status', 'needs_delist')
    .in('find_id', findIds)

  if (error) {
    console.error('[Delist Queue] Failed to fetch queue:', error)
    return ApiResponseHelper.internalError()
  }

  // Filter out items without platform_listing_id (can't delist without an ID)
  const validItems = (data || []).filter(
    (item): item is DelistQueueItem => !!item.platform_listing_id
  )

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

  const supabase = await createSupabaseServerClient()

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
