import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

interface FindWithMarketplaceJoin {
  id: string
  name: string
  category: string
  cost_gbp: number | null
  sold_price_gbp: number | null
  sourced_at: string | null
  sold_at: string | null
  photos: string[] | null
  product_marketplace_data: Array<{
    marketplace: string
    status: string
    fields: Record<string, unknown> | null
  }>
}

interface SoldItem {
  id: string
  name: string
  category: string
  cost_gbp: number | null
  sold_price_gbp: number | null
  sourced_at: string | null
  sold_at: string | null
  photo: string | null
  marketplace?: string
  margin_percent?: number | null
  days_listed?: number
  shipmentStatus?: string | null
  buyer?: string | null
  grossAmount?: number | null
  serviceFee?: number | null
  netAmount?: number | null
  trackingNumber?: string | null
}

/**
 * GET /api/sold
 * Fetch all sold items for authenticated user with marketplace data
 * Query params: timeframe? ('month' | 'quarter' | 'all')
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') || 'month'

    // Calculate date range
    // UK tax year runs 6 April – 5 April
    const now = new Date()
    let startDate = new Date()

    function ukTaxYearStart(year: number): Date {
      return new Date(`${year}-04-06T00:00:00`)
    }

    // Current tax year start: if before 6 Apr, it started last calendar year
    const currentTaxYearStart = now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() >= 6)
      ? ukTaxYearStart(now.getFullYear())
      : ukTaxYearStart(now.getFullYear() - 1)

    switch (timeframe) {
      case 'quarter':
        startDate.setDate(now.getDate() - 90)
        break
      case 'tax_year':
        startDate = currentTaxYearStart
        break
      case 'last_tax_year':
        startDate = ukTaxYearStart(currentTaxYearStart.getFullYear() - 1)
        break
      case 'all':
        startDate = new Date('2000-01-01')
        break
      case 'month':
      default:
        startDate.setDate(now.getDate() - 30)
    }

    // For last_tax_year, also set an end date
    const endDate = timeframe === 'last_tax_year' ? currentTaxYearStart : null

    // Fetch sold finds with marketplace data including sale metadata
    let query = supabase
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
        photos,
        product_marketplace_data (
          marketplace,
          status,
          fields
        )
        `
      )
      .eq('user_id', user.id)
      .eq('status', 'sold')
      .gte('sold_at', startDate.toISOString())
      .order('sold_at', { ascending: false })
      .limit(10000)

    // Apply end date for last_tax_year filter
    if (endDate) {
      query = query.lt('sold_at', endDate.toISOString())
    }

    const { data: finds, error: findsError } = await query

    if (findsError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', findsError)
      }
      return ApiResponseHelper.internalError()
    }

    // Transform data with calculated fields
    const items: SoldItem[] = ((finds || []) as FindWithMarketplaceJoin[]).map((find) => {
      const marginPercent =
        find.cost_gbp != null && find.sold_price_gbp
          ? Math.round(((find.sold_price_gbp - find.cost_gbp) / find.sold_price_gbp) * 100)
          : null

      const daysListed =
        find.sourced_at && find.sold_at
          ? Math.round(
              (new Date(find.sold_at).getTime() - new Date(find.sourced_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0

      // Get marketplace where item was sold + sale metadata
      const soldPmd = find.product_marketplace_data?.find((m) => m.status === 'sold')
      const sale = (soldPmd?.fields as Record<string, unknown> | null)?.sale as Record<string, unknown> | undefined

      return {
        id: find.id,
        name: find.name,
        category: find.category,
        cost_gbp: find.cost_gbp,
        sold_price_gbp: find.sold_price_gbp,
        sourced_at: find.sourced_at,
        sold_at: find.sold_at,
        photo: find.photos?.[0] || null,
        marketplace: soldPmd?.marketplace || 'unknown',
        margin_percent: marginPercent,
        days_listed: daysListed,
        shipmentStatus: (sale?.shipmentStatus as string) || null,
        buyer: (sale?.buyer as Record<string, unknown>)?.username as string || null,
        grossAmount: (sale?.grossAmount as number) || null,
        serviceFee: (sale?.serviceFee as number) || null,
        netAmount: (sale?.netAmount as number) || null,
        trackingNumber: (sale?.trackingNumber as string) || null,
      }
    })

    // Calculate metrics
    const itemsSold = items.length
    const totalRevenue = items.reduce((sum, item) => sum + (item.sold_price_gbp || 0), 0)
    const totalCost = items.reduce((sum, item) => sum + (item.cost_gbp || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const itemsWithMargin = items.filter((item) => item.margin_percent != null)
    const avgMargin =
      itemsWithMargin.length > 0
        ? Math.round(itemsWithMargin.reduce((sum, item) => sum + (item.margin_percent as number), 0) / itemsWithMargin.length)
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
})
