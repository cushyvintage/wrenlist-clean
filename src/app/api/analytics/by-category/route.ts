import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

interface CategoryAnalytics {
  category: string
  count: number
  total_revenue: number
  avg_price: number
  avg_days_to_sell: number
}

export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const userId = user.id

    // Fetch all finds for this user
    const { data: finds, error: findsError } = await supabase
      .from('finds')
      .select('*')
      .eq('user_id', userId)
      .limit(10000)

    if (findsError) {
      console.error('Error fetching finds:', findsError)
      return NextResponse.json({ error: 'Failed to fetch finds' }, { status: 500 })
    }

    // Group by category and calculate metrics
    const categoryMap = new Map<
      string,
      {
        count: number
        revenue: number
        prices: number[]
        daysToSell: number[]
      }
    >()

    finds.forEach((find) => {
      const cat = find.category || 'Uncategorized'
      const existing = categoryMap.get(cat) || { count: 0, revenue: 0, prices: [], daysToSell: [] }

      existing.count += 1

      // Only count sold items for revenue
      if (find.status === 'sold' && find.sold_price_gbp) {
        existing.revenue += find.sold_price_gbp
        existing.prices.push(find.sold_price_gbp)

        // Calculate days to sell
        if (find.sourced_at && find.sold_at) {
          const days = Math.round(
            (new Date(find.sold_at).getTime() - new Date(find.sourced_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
          existing.daysToSell.push(days)
        }
      }

      categoryMap.set(cat, existing)
    })

    // Convert to array and calculate averages
    const analytics: CategoryAnalytics[] = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        total_revenue: data.revenue,
        avg_price: data.prices.length > 0
          ? Math.round((data.prices.reduce((a, b) => a + b, 0) / data.prices.length) * 100) / 100
          : 0,
        avg_days_to_sell: data.daysToSell.length > 0
          ? Math.round(data.daysToSell.reduce((a, b) => a + b, 0) / data.daysToSell.length)
          : 0,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Category analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
