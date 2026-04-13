import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/depop/shop-stats
 * Read cached shop stats from depop_connections
 */
export const GET = withAuth(async (_req, user) => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('depop_connections')
    .select(
      `depop_username, net_earnings_30d, gross_sales_30d, items_sold_30d,
       username, verified, stats_updated_at`
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return ApiResponseHelper.internalError(error.message)
  if (!data) return ApiResponseHelper.success({ connected: false })

  return ApiResponseHelper.success({
    connected: true,
    username: data.username ?? data.depop_username,
    netEarnings30d: data.net_earnings_30d,
    grossSales30d: data.gross_sales_30d,
    itemsSold30d: data.items_sold_30d,
    verified: data.verified,
    updatedAt: data.stats_updated_at,
  })
})

/**
 * POST /api/depop/shop-stats
 * Store shop stats from extension fetch
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const {
    netEarnings30d, grossSales30d, itemsSold30d,
    username, verified, rawJson,
  } = body

  const supabase = await createSupabaseServerClient()

  const updateData: Record<string, unknown> = {
    stats_updated_at: new Date().toISOString(),
    stats_raw_json: rawJson ?? null,
  }

  if (netEarnings30d != null) updateData.net_earnings_30d = netEarnings30d
  if (grossSales30d != null) updateData.gross_sales_30d = grossSales30d
  if (itemsSold30d != null) updateData.items_sold_30d = itemsSold30d
  if (username != null) updateData.username = username
  if (verified != null) updateData.verified = verified

  // Upsert: update if exists, insert if not
  const { error } = await supabase
    .from('depop_connections')
    .upsert({ user_id: user.id, ...updateData }, { onConflict: 'user_id' })

  if (error) return ApiResponseHelper.internalError(error.message)

  return ApiResponseHelper.success({ updated: true })
})
