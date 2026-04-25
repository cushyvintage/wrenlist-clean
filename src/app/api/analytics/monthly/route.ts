import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

interface MonthlyDataPoint {
  month: string       // "2026-04"
  label: string       // "Apr"
  sales: number       // total sold_price_gbp
  profit: number      // sales - cogs
  items_sold: number
  items_sourced: number
}

export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const userId = user.id

    // Fetch all finds (paginated to bypass Supabase's 1000-row REST cap)
    const PAGE_SIZE = 1000
    const finds: Array<{ cost_gbp: number | null; sold_price_gbp: number | null; sold_at: string | null; sourced_at: string | null; created_at: string; status: string | null }> = []
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page, error } = await supabase
        .from('finds')
        .select('cost_gbp, sold_price_gbp, sold_at, sourced_at, created_at, status')
        .eq('user_id', userId)
        .range(off, off + PAGE_SIZE - 1)
      if (error) {
        console.error('Error fetching finds page:', error)
        return NextResponse.json({ error: 'Failed to fetch finds' }, { status: 500 })
      }
      if (!page || page.length === 0) break
      finds.push(...page)
      if (page.length < PAGE_SIZE) break
    }

    // Build last 6 months
    const now = new Date()
    const months: MonthlyDataPoint[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-GB', { month: 'short' })
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59)

      let sales = 0
      let cogs = 0
      let itemsSold = 0
      let itemsSourced = 0

      finds.forEach((f) => {
        // Sales in this month
        if (f.status === 'sold' && f.sold_at && f.sold_price_gbp) {
          const soldDate = new Date(f.sold_at)
          if (soldDate >= monthStart && soldDate <= monthEnd) {
            sales += f.sold_price_gbp
            cogs += f.cost_gbp || 0
            itemsSold++
          }
        }

        // Sourced in this month — only count items with explicit sourced_at.
        // Falling back to created_at makes bulk imports look like they were
        // all sourced on the day the import ran (e.g. 2,716 imported finds
        // all dated April when imported in April).
        if (f.sourced_at) {
          const sourcedDate = new Date(f.sourced_at)
          if (sourcedDate >= monthStart && sourcedDate <= monthEnd) {
            itemsSourced++
          }
        }
      })

      months.push({
        month: monthKey,
        label,
        sales: Math.round(sales * 100) / 100,
        profit: Math.round((sales - cogs) * 100) / 100,
        items_sold: itemsSold,
        items_sourced: itemsSourced,
      })
    }

    return NextResponse.json(months)
  } catch (error) {
    console.error('Monthly analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
