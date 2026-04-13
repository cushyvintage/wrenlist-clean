import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getEbayClientForUser } from '@/lib/ebay-client'

/**
 * GET /api/cron/refresh-stats
 * Vercel Cron job that refreshes eBay seller stats for all connected users.
 * Runs daily — eBay has proper API access so no extension needed.
 *
 * Etsy + Vinted stats are refreshed by the extension alarm (client-side).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Get all users with eBay tokens
    const { data: ebayTokens, error: tokensError } = await supabaseAdmin
      .from('ebay_tokens')
      .select('user_id')
      .eq('marketplace_id', 'EBAY_GB')

    if (tokensError || !ebayTokens) {
      return NextResponse.json(
        { error: 'Failed to fetch eBay tokens', details: tokensError?.message },
        { status: 500 },
      )
    }

    const results = {
      usersProcessed: 0,
      usersUpdated: 0,
      errors: [] as string[],
    }

    for (const tokenRecord of ebayTokens) {
      const userId = tokenRecord.user_id

      try {
        const ebayClient = await getEbayClientForUser(userId, supabaseAdmin, 'EBAY_GB')

        // 1. Order stats (Fulfillment API)
        const orderStats = await ebayClient.getOrderStats({ days: 30 })
        const avgFeePercent = orderStats.totalRevenue > 0
          ? Math.round((orderStats.totalFees / orderStats.totalRevenue) * 1000) / 10
          : null

        // 2. Traffic stats (Analytics API — may 403 if scope not granted)
        const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const startDate = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10).replace(/-/g, '')
        const trafficResult = await ebayClient.getTrafficReport({ startDate, endDate })

        const stats = {
          orderStats: { ...orderStats, avgFeePercent },
          trafficStats: trafficResult.data,
          trafficError: trafficResult.error,
          fetchedAt: new Date().toISOString(),
        }

        // Cache in ebay_seller_config
        const { error: updateError } = await supabaseAdmin
          .from('ebay_seller_config')
          .update({
            seller_stats: stats,
            seller_stats_updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('marketplace_id', 'EBAY_GB')

        if (updateError) {
          results.errors.push(`User ${userId}: Failed to cache — ${updateError.message}`)
        } else {
          results.usersUpdated++
        }

        results.usersProcessed++
      } catch (userError) {
        const msg = userError instanceof Error ? userError.message : 'Unknown error'
        results.errors.push(`User ${userId}: ${msg}`)
        results.usersProcessed++
      }
    }

    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Cron job failed', details: message },
      { status: 500 },
    )
  }
}
