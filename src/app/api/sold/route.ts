import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

interface SoldItem {
  id: string
  name: string
  category: string
  cost_gbp: number | null
  sold_price_gbp: number | null
  sourced_at: string | null
  sold_at: string | null
  marketplace?: string
  margin_percent?: number
  days_listed?: number
}

/**
 * GET /api/sold
 * Fetch all sold items for authenticated user with marketplace data
 * Query params: timeframe? ('month' | 'quarter' | 'all')
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || 'month'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()

    switch (timeframe) {
      case 'quarter':
        startDate.setDate(now.getDate() - 90)
        break
      case 'all':
        startDate = new Date('2000-01-01') // Far past
        break
      case 'month':
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // Fetch sold finds with marketplace data
    const { data: finds, error: findsError } = await supabase
      .from('finds')
      .select(
        `
        id,
        name,
        category,
        cost_gbp,
        sold_price_gbp,
        sourced_at,
        sold_at,
        product_marketplace_data (
          marketplace,
          status
        )
        `
      )
      .eq('user_id', user.id)
      .eq('status', 'sold')
      .gte('sold_at', startDate.toISOString())
      .order('sold_at', { ascending: false })

    if (findsError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', findsError)
      }
      return ApiResponseHelper.internalError()
    }

    // Transform data with calculated fields
    const items: SoldItem[] = (finds || []).map((find: any) => {
      const marginPercent =
        find.cost_gbp && find.sold_price_gbp
          ? Math.round(((find.sold_price_gbp - find.cost_gbp) / find.sold_price_gbp) * 100)
          : 0

      const daysListed =
        find.sourced_at && find.sold_at
          ? Math.round(
              (new Date(find.sold_at).getTime() - new Date(find.sourced_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0

      // Get marketplace(s) where item was sold
      const marketplaces = find.product_marketplace_data
        ?.filter((m: any) => m.status === 'sold')
        .map((m: any) => m.marketplace)

      return {
        id: find.id,
        name: find.name,
        category: find.category,
        cost_gbp: find.cost_gbp,
        sold_price_gbp: find.sold_price_gbp,
        sourced_at: find.sourced_at,
        sold_at: find.sold_at,
        marketplace: marketplaces?.[0] || 'unknown',
        margin_percent: marginPercent,
        days_listed: daysListed,
      }
    })

    // Calculate metrics
    const itemsSold = items.length
    const totalRevenue = items.reduce((sum, item) => sum + (item.sold_price_gbp || 0), 0)
    const totalCost = items.reduce((sum, item) => sum + (item.cost_gbp || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const avgMargin =
      items.length > 0
        ? Math.round(items.reduce((sum, item) => sum + (item.margin_percent || 0), 0) / items.length)
        : 0

    return ApiResponseHelper.success({
      items,
      metrics: {
        itemsSold,
        totalRevenue,
        totalCost,
        totalProfit,
        avgMargin,
        avgPerItem: items.length > 0 ? Math.round(totalRevenue / items.length) : 0,
      },
      timeframe,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/sold error:', error)
    }
    return ApiResponseHelper.internalError()
  }
}
