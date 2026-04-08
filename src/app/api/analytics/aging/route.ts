import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

interface OldestItem {
  name: string
  days_listed: number
  category: string | null
  cost_gbp: number | null
  asking_price_gbp: number | null
}

interface AgingAnalytics {
  aged_30: number
  aged_60: number
  aged_90: number
  aged_stock_value: number  // total cost of items 30+ days old
  oldest_item: OldestItem | null
}

export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const userId = user.id

    // Fetch all listed finds
    const { data: finds, error: findsError } = await supabase
      .from('finds')
      .select('name, category, cost_gbp, asking_price_gbp, sourced_at, created_at')
      .eq('user_id', userId)
      .eq('status', 'listed')
      .limit(10000)

    if (findsError) {
      console.error('Error fetching finds:', findsError)
      return NextResponse.json({ error: 'Failed to fetch finds' }, { status: 500 })
    }

    if (!finds || finds.length === 0) {
      return NextResponse.json({
        aged_30: 0,
        aged_60: 0,
        aged_90: 0,
        aged_stock_value: 0,
        oldest_item: null,
      } as AgingAnalytics)
    }

    const now = new Date()
    let aged30Count = 0
    let aged60Count = 0
    let aged90Count = 0
    let agedStockValue = 0
    let oldestFind: OldestItem | null = null
    let maxDaysListed = 0

    finds.forEach((find) => {
      // Use sourced_at as listing proxy; fall back to created_at
      const listedDate = new Date(find.sourced_at || find.created_at)
      const daysListed = Math.floor(
        (now.getTime() - listedDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (daysListed >= 30) {
        aged30Count++
        agedStockValue += find.cost_gbp || 0
      }
      if (daysListed >= 60) {
        aged60Count++
      }
      if (daysListed >= 90) {
        aged90Count++
      }

      if (daysListed > maxDaysListed) {
        maxDaysListed = daysListed
        oldestFind = {
          name: find.name,
          days_listed: daysListed,
          category: find.category,
          cost_gbp: find.cost_gbp,
          asking_price_gbp: find.asking_price_gbp,
        }
      }
    })

    const result: AgingAnalytics = {
      aged_30: aged30Count,
      aged_60: aged60Count,
      aged_90: aged90Count,
      aged_stock_value: Math.round(agedStockValue * 100) / 100,
      oldest_item: oldestFind,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics aging error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
