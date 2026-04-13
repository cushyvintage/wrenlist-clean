import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { getEbayClientForUser } from '@/lib/ebay-client'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/ebay/seller-stats
 * Returns cached seller stats from ebay_seller_config.seller_stats
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: config } = await supabase
      .from('ebay_seller_config')
      .select('seller_stats, seller_stats_updated_at')
      .eq('user_id', user.id)
      .eq('marketplace_id', 'EBAY_GB')
      .single()

    return ApiResponseHelper.success({
      stats: config?.seller_stats || null,
      updatedAt: config?.seller_stats_updated_at || null,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get seller stats'
    return ApiResponseHelper.internalError(message)
  }
})

interface SellerStats {
  orderStats: {
    orderCount: number
    totalRevenue: number
    totalFees: number
    totalNet: number
    currency: string
    periodDays: number
    avgFeePercent: number | null
  }
  trafficStats: Record<string, unknown> | null
  trafficError?: string
  fetchedAt: string
}

/**
 * POST /api/ebay/seller-stats
 * Fetches fresh seller stats from eBay APIs and caches them.
 * - Order stats from Fulfillment API (always works)
 * - Traffic stats from Analytics API (may 403 if scope not granted)
 */
export const POST = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    // Verify eBay connection exists
    const { data: ebayToken } = await supabase
      .from('ebay_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('marketplace_id', 'EBAY_GB')
      .single()

    if (!ebayToken) {
      return ApiResponseHelper.badRequest('No eBay connection found.')
    }

    let ebayClient
    try {
      ebayClient = await getEbayClientForUser(user.id, supabase, 'EBAY_GB')
    } catch {
      return ApiResponseHelper.badRequest('Your eBay connection has expired. Please reconnect.')
    }

    // 1. Order stats (always available via Fulfillment API)
    const orderStats = await ebayClient.getOrderStats({ days: 30 })
    const avgFeePercent = orderStats.totalRevenue > 0
      ? Math.round((orderStats.totalFees / orderStats.totalRevenue) * 1000) / 10
      : null

    // 2. Traffic stats (may fail with 403 if sell.analytics.readonly not in scope)
    const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10).replace(/-/g, '')
    const trafficResult = await ebayClient.getTrafficReport({ startDate, endDate })

    const stats: SellerStats = {
      orderStats: { ...orderStats, avgFeePercent },
      trafficStats: trafficResult.data,
      trafficError: trafficResult.error,
      fetchedAt: new Date().toISOString(),
    }

    // Cache in ebay_seller_config
    const { error: updateError } = await supabase
      .from('ebay_seller_config')
      .update({
        seller_stats: stats,
        seller_stats_updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('marketplace_id', 'EBAY_GB')

    if (updateError) {
      console.error('[seller-stats] Failed to cache stats:', updateError.message)
    }

    return ApiResponseHelper.success({
      stats,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch seller stats'
    return ApiResponseHelper.internalError(message)
  }
})
