import { NextResponse } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'

interface MarketplaceAnalytics {
  marketplace: string
  listed_count: number
  sold_count: number
  total_revenue: number
}

export async function GET() {
  try {
    // Get authenticated user
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createSupabaseServerClient()
    const userId = user.id

    // Fetch all marketplace data for this user
    const { data: marketplaceData, error: mpError } = await supabase
      .from('product_marketplace_data')
      .select('*, finds!inner(id, user_id, status, sold_price_gbp)')
      .eq('finds.user_id', userId)

    if (mpError) {
      console.error('Error fetching marketplace data:', mpError)
      return NextResponse.json({ error: 'Failed to fetch marketplace data' }, { status: 500 })
    }

    // Group by marketplace and calculate metrics
    const marketplaceMap = new Map<
      string,
      {
        listed: number
        sold: number
        revenue: number
      }
    >()

    if (marketplaceData && Array.isArray(marketplaceData)) {
      marketplaceData.forEach((item: any) => {
        const market = item.marketplace
        const existing = marketplaceMap.get(market) || { listed: 0, sold: 0, revenue: 0 }

        if (item.status === 'listed') {
          existing.listed += 1
        }

        // Count sold from associated find
        const find = item.finds
        if (find && find.status === 'sold' && find.sold_price_gbp) {
          existing.sold += 1
          existing.revenue += find.sold_price_gbp
        }

        marketplaceMap.set(market, existing)
      })
    }

    // Convert to array and format response
    const analytics: MarketplaceAnalytics[] = Array.from(marketplaceMap.entries())
      .map(([marketplace, data]) => ({
        marketplace: marketplace.charAt(0).toUpperCase() + marketplace.slice(1), // Capitalize
        listed_count: data.listed,
        sold_count: data.sold,
        total_revenue: data.revenue,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Marketplace analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
