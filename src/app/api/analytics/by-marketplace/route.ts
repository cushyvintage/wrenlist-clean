import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

interface MarketplaceAnalytics {
  marketplace: string
  listed_count: number
  sold_count: number
  total_revenue: number
}

export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const userId = user.id

    // Fetch all marketplace data for this user — paginate to bypass 1000 REST cap
    const PAGE_SIZE = 1000
    interface MarketplaceDataJoin {
      marketplace: string
      status: string
      finds: { id: string; user_id: string; status: string; sold_price_gbp: number | null }
    }
    const marketplaceData: MarketplaceDataJoin[] = []
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page, error: mpError } = await supabase
        .from('product_marketplace_data')
        .select('*, finds!inner(id, user_id, status, sold_price_gbp)')
        .eq('finds.user_id', userId)
        .range(off, off + PAGE_SIZE - 1)
      if (mpError) {
        console.error('Error fetching marketplace data page:', mpError)
        return NextResponse.json({ error: 'Failed to fetch marketplace data' }, { status: 500 })
      }
      if (!page || page.length === 0) break
      marketplaceData.push(...(page as unknown as MarketplaceDataJoin[]))
      if (page.length < PAGE_SIZE) break
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
      marketplaceData.forEach((item) => {
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
})
