import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/marketplace/publish-queue
 * Returns finds where any marketplace has status = "needs_publish".
 * Extension polls this to find listings to publish.
 */
export const GET = withAuth(async (_req, user) => {
  const supabase = await createSupabaseServerClient()

  // Get user's find IDs
  const { data: userFinds, error: findsError } = await supabase
    .from('finds')
    .select('id')
    .eq('user_id', user.id)

  if (findsError || !userFinds) {
    return ApiResponseHelper.internalError()
  }

  const findIds = userFinds.map((f: { id: string }) => f.id)
  if (findIds.length === 0) {
    return ApiResponseHelper.success([])
  }

  // Fetch marketplace data with needs_publish status
  const { data, error } = await supabase
    .from('product_marketplace_data')
    .select('find_id, marketplace, fields')
    .eq('status', 'needs_publish')
    .in('find_id', findIds)

  if (error) {
    return ApiResponseHelper.internalError()
  }

  // Enrich with find data for the extension to use (exclude platform_fields — internal state)
  interface PublishQueueFind {
    id: string
    name: string
    description: string | null
    category: string
    brand: string | null
    condition: string
    asking_price_gbp: number | null
    photos: string[] | null
    sku: string | null
  }

  const enrichedFindIds = [...new Set((data || []).map((d) => d.find_id))]
  let findsMap: Record<string, PublishQueueFind> = {}

  if (enrichedFindIds.length > 0) {
    const { data: finds } = await supabase
      .from('finds')
      .select('id, name, description, category, brand, condition, asking_price_gbp, photos, sku')
      .in('id', enrichedFindIds)

    if (finds) {
      findsMap = Object.fromEntries(
        (finds as PublishQueueFind[]).map((f) => [f.id, f])
      )
    }
  }

  const queue = (data || []).map((item) => ({
    find_id: item.find_id,
    marketplace: item.marketplace,
    find: findsMap[item.find_id] || null,
  }))

  return ApiResponseHelper.success(queue)
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

  return ApiResponseHelper.success({ message: 'Publish status updated' })
})
