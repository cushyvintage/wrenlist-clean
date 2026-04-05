import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { logMarketplaceEvent } from '@/lib/marketplace-events'

/**
 * GET /api/marketplace/publish-queue
 * Returns finds where any marketplace has status = "needs_publish".
 * Extension polls this to find listings to publish.
 */
export const GET = withAuth(async (_req, user) => {
  const supabase = await createSupabaseServerClient()

  // Get marketplace data with needs_publish status for this user's finds
  // RLS on product_marketplace_data already filters by user via the finds FK policy
  const { data, error } = await supabase
    .from('product_marketplace_data')
    .select('find_id, marketplace, fields, listing_price, platform_category_id')
    .eq('status', 'needs_publish')

  if (error) {
    console.error('[PublishQueue] Marketplace data query failed:', error)
    return ApiResponseHelper.internalError()
  }

  const items = data || []
  if (items.length === 0) {
    return ApiResponseHelper.success([])
  }

  // Enrich with find data using service role (bypasses RLS — safe since
  // product_marketplace_data RLS already verified user ownership)
  const findIds = [...new Set(items.map((d) => d.find_id))]
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: finds, error: findError } = await supabaseAdmin
    .from('finds')
    .select('id, name, description, category, brand, condition, asking_price_gbp, photos, sku, colour, size, shipping_weight_grams')
    .eq('user_id', user.id)
    .in('id', findIds)

  // Temporary debug — remove after confirming enrichment works
  if (findError) {
    console.error('[PublishQueue] Find enrichment error:', findError)
  }
  console.log('[PublishQueue] findIds:', findIds, 'user:', user.id, 'findsCount:', finds?.length ?? 0)

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
    const { data: conn } = await supabase
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
    ...(item.marketplace === 'shopify' && shopifyStoreDomain
      ? { settings: { shopifyShopUrl: shopifyStoreDomain } }
      : {}),
  }))

  return NextResponse.json({ data: queue, _debug: { findIds, userId: user.id, findsFound: finds?.length ?? 0, findError: findError?.message ?? null } })
})

/**
 * POST /api/marketplace/publish-queue
 * Called by extension after successfully publishing.
 * Updates status to "listed" and sets platform_listing_id/url.
 *
 * Body: { find_id, marketplace, platform_listing_id?, platform_listing_url? }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { find_id: findId, marketplace, platform_listing_id, platform_listing_url } = body

  if (!findId || !marketplace) {
    return ApiResponseHelper.badRequest('find_id and marketplace are required')
  }

  const supabase = await createSupabaseServerClient()

  // Verify ownership
  const { data: find, error: findError } = await supabase
    .from('finds')
    .select('id')
    .eq('id', findId)
    .eq('user_id', user.id)
    .single()

  if (findError || !find) {
    return ApiResponseHelper.notFound('Find not found')
  }

  // Update marketplace data
  const { error } = await supabase
    .from('product_marketplace_data')
    .update({
      status: 'listed',
      platform_listing_id: platform_listing_id || null,
      platform_listing_url: platform_listing_url || null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('find_id', findId)
    .eq('marketplace', marketplace)

  if (error) {
    return ApiResponseHelper.internalError()
  }

  logMarketplaceEvent(supabase, user.id, { findId, marketplace, eventType: 'listed', source: 'extension', details: { platform_listing_id, platform_listing_url } })

  return ApiResponseHelper.success({ message: 'Publish status updated' })
})
