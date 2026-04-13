import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/etsy/shop-stats
 * Read cached shop stats from etsy_connections
 */
export const GET = withAuth(async (_req, user) => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('etsy_connections')
    .select(
      `shop_name, shop_id, star_seller_status,
       star_seller_response_rate, star_seller_shipping_rate,
       star_seller_review_score, star_seller_case_rate,
       shop_visits, shop_orders, shop_revenue, shop_conversion_rate,
       stats_date_range, stats_updated_at`
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return ApiResponseHelper.internalError(error.message)
  if (!data) return ApiResponseHelper.success({ connected: false })

  return ApiResponseHelper.success({
    connected: true,
    shopName: data.shop_name,
    shopId: data.shop_id,
    starSeller: {
      isStarSeller: data.star_seller_status ?? false,
      responseRate: data.star_seller_response_rate,
      shippingOnTime: data.star_seller_shipping_rate,
      reviewScore: data.star_seller_review_score,
      caseRate: data.star_seller_case_rate,
    },
    stats: {
      visits: data.shop_visits,
      orders: data.shop_orders,
      revenue: data.shop_revenue,
      conversionRate: data.shop_conversion_rate,
      dateRange: data.stats_date_range,
    },
    updatedAt: data.stats_updated_at,
  })
})

/**
 * POST /api/etsy/shop-stats
 * Store shop stats from extension scrape
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { stats, starSeller, rawStats, rawStarSeller } = body

  const supabase = await createSupabaseServerClient()

  const updateData: Record<string, unknown> = {
    stats_updated_at: new Date().toISOString(),
    stats_raw_json: { rawStats, rawStarSeller },
  }

  if (stats) {
    updateData.shop_visits = stats.visits
    updateData.shop_orders = stats.orders
    updateData.shop_revenue = stats.revenue
    updateData.shop_conversion_rate = stats.conversionRate
    updateData.stats_date_range = stats.dateRange
  }

  if (starSeller) {
    updateData.star_seller_status = starSeller.isStarSeller ?? false
    updateData.star_seller_response_rate = starSeller.responseRate
    updateData.star_seller_shipping_rate = starSeller.shippingOnTime
    updateData.star_seller_review_score = starSeller.reviewScore
    updateData.star_seller_case_rate = starSeller.caseRate
  }

  // Upsert: update if exists, insert if not (user may refresh stats before connecting)
  const { error } = await supabase
    .from('etsy_connections')
    .upsert({ user_id: user.id, ...updateData }, { onConflict: 'user_id' })

  if (error) return ApiResponseHelper.internalError(error.message)

  return ApiResponseHelper.success({ updated: true })
})
