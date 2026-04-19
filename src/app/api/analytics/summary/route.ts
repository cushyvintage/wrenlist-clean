import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

interface AnalyticsSummary {
  // Core metrics
  total_finds: number
  listed_finds: number
  sold_finds: number
  draft_finds: number

  // Financial — sold items only
  total_sales: number                    // sum of sold_price_gbp for sold items
  cogs: number                           // cost of goods sold (cost_gbp for sold items only)
  gross_profit: number | null            // total_sales - cogs; null when cost coverage is 0
  profit_margin_pct: number | null       // (gross_profit / total_sales) * 100; null when no cost data
  avg_profit_per_item: number | null     // gross_profit / sold count; null when no cost data
  cost_coverage_pct: number              // share of sold items that have cost_gbp set

  // Stock value — unsold items
  stock_cost: number         // what you paid for unsold inventory
  stock_listed_value: number // what unsold inventory is listed at (asking_price_gbp)
  stock_count: number        // items in stock (listed + draft)

  // Performance
  avg_days_to_sell: number
  sell_through_pct: number   // sold / (sold + listed) * 100

  // This month
  this_month_sales: number
  this_month_profit: number | null   // null when no cost data this month
  this_month_items_sold: number
  this_month_items_sourced: number
  this_month_expenses: number
  this_month_mileage_gbp: number
}

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const userId = user.id

    // Parse time period from query string
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'all'

    // Calculate date boundaries
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    let periodStart: string | null = null
    if (period === 'month') {
      periodStart = monthStart
    } else if (period === '3months') {
      periodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString()
    }

    // Fetch all finds for this user — paginate in chunks of 1000 to bypass
    // Supabase's default REST row cap. Without this, analytics silently truncate
    // at 1000 items and stats like "Items sourced" plateau at that number.
    const PAGE_SIZE = 1000
    const finds: Array<{ status: string | null; cost_gbp: number | null; asking_price_gbp: number | null; sold_price_gbp: number | null; sold_at: string | null; sourced_at: string | null; created_at: string }> = []
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data: page, error: pageErr } = await supabase
        .from('finds')
        .select('status, cost_gbp, asking_price_gbp, sold_price_gbp, sold_at, sourced_at, created_at')
        .eq('user_id', userId)
        .range(offset, offset + PAGE_SIZE - 1)
      if (pageErr) {
        console.error('Error fetching finds page:', pageErr)
        return NextResponse.json({ error: 'Failed to fetch finds' }, { status: 500 })
      }
      if (!page || page.length === 0) break
      finds.push(...page)
      if (page.length < PAGE_SIZE) break
    }

    // Filter by period if needed (filter in JS since we need both sold_at and sourced_at)
    const periodFinds = periodStart
      ? finds.filter((f) => {
          // Include if sourced, sold, or created within period
          const created = new Date(f.created_at)
          const sold = f.sold_at ? new Date(f.sold_at) : null
          const sourced = f.sourced_at ? new Date(f.sourced_at) : null
          const cutoff = new Date(periodStart!)
          return created >= cutoff || (sold && sold >= cutoff) || (sourced && sourced >= cutoff)
        })
      : finds

    // Basic counts
    const totalFinds = periodFinds.length
    const listedFinds = periodFinds.filter((f) => f.status === 'listed').length
    const soldFinds = periodFinds.filter((f) => f.status === 'sold').length
    const draftFinds = periodFinds.filter((f) => f.status === 'draft').length

    // Financial — SOLD items only
    let totalSales = 0
    let cogs = 0
    let soldWithCost = 0
    const daysToSellData: number[] = []

    periodFinds.forEach((find) => {
      if (find.status === 'sold' && find.sold_price_gbp) {
        totalSales += find.sold_price_gbp
        if (find.cost_gbp && find.cost_gbp > 0) {
          cogs += find.cost_gbp
          soldWithCost += 1
        }
        if (find.sourced_at && find.sold_at) {
          const days = Math.round(
            (new Date(find.sold_at).getTime() - new Date(find.sourced_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
          if (days >= 0) daysToSellData.push(days)
        }
      }
    })

    // When no sold item has a cost, margin/profit are undefined rather than 100%.
    const hasAnyCost = soldWithCost > 0
    const grossProfit = hasAnyCost ? totalSales - cogs : null
    const profitMarginPct = hasAnyCost && totalSales > 0
      ? Math.round(((totalSales - cogs) / totalSales) * 100)
      : null
    const avgProfitPerItem = hasAnyCost && soldFinds > 0
      ? Math.round(((totalSales - cogs) / soldFinds) * 100) / 100
      : null
    const costCoveragePct = soldFinds > 0
      ? Math.round((soldWithCost / soldFinds) * 100)
      : 0
    const avgDaysToSell = daysToSellData.length > 0
      ? Math.round(daysToSellData.reduce((a, b) => a + b, 0) / daysToSellData.length)
      : 0

    // Stock value — unsold items (listed + draft)
    let stockCost = 0
    let stockListedValue = 0
    let stockCount = 0

    periodFinds.forEach((find) => {
      if (find.status === 'listed' || find.status === 'draft') {
        stockCount++
        if (find.cost_gbp) stockCost += find.cost_gbp
        if (find.asking_price_gbp) stockListedValue += find.asking_price_gbp
      }
    })

    // Sell-through rate
    const sellableDenom = soldFinds + listedFinds
    const sellThroughPct = sellableDenom > 0 ? Math.round((soldFinds / sellableDenom) * 100) : 0

    // This month metrics (always current month regardless of period filter)
    const thisMonthSold = finds.filter((f) => {
      if (!f.sold_at || f.status !== 'sold') return false
      const soldDate = new Date(f.sold_at)
      return soldDate >= new Date(monthStart) && soldDate <= new Date(monthEnd)
    })

    const thisMonthSales = thisMonthSold.reduce((sum, f) => sum + (f.sold_price_gbp || 0), 0)
    const thisMonthCogs = thisMonthSold.reduce((sum, f) => sum + (f.cost_gbp || 0), 0)
    const thisMonthHasAnyCost = thisMonthSold.some((f) => (f.cost_gbp || 0) > 0)

    const thisMonthSourced = finds.filter((f) => {
      const d = f.sourced_at ? new Date(f.sourced_at) : new Date(f.created_at)
      return d >= new Date(monthStart) && d <= new Date(monthEnd)
    }).length

    // Fetch expenses for this month
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount_gbp')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    const thisMonthExpenses = expenses
      ? expenses.reduce((sum, e) => sum + (e.amount_gbp || 0), 0)
      : 0

    // Fetch mileage for this month
    const { data: mileage } = await supabase
      .from('mileage')
      .select('deductible_value_gbp')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    const thisMonthMileageGbp = mileage
      ? mileage.reduce((sum, m) => sum + (m.deductible_value_gbp || 0), 0)
      : 0

    const summary: AnalyticsSummary = {
      total_finds: totalFinds,
      listed_finds: listedFinds,
      sold_finds: soldFinds,
      draft_finds: draftFinds,

      total_sales: Math.round(totalSales * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      gross_profit: grossProfit == null ? null : Math.round(grossProfit * 100) / 100,
      profit_margin_pct: profitMarginPct,
      avg_profit_per_item: avgProfitPerItem,
      cost_coverage_pct: costCoveragePct,

      stock_cost: Math.round(stockCost * 100) / 100,
      stock_listed_value: Math.round(stockListedValue * 100) / 100,
      stock_count: stockCount,

      avg_days_to_sell: avgDaysToSell,
      sell_through_pct: sellThroughPct,

      this_month_sales: Math.round(thisMonthSales * 100) / 100,
      this_month_profit: thisMonthHasAnyCost
        ? Math.round((thisMonthSales - thisMonthCogs) * 100) / 100
        : null,
      this_month_items_sold: thisMonthSold.length,
      this_month_items_sourced: thisMonthSourced,
      this_month_expenses: Math.round(thisMonthExpenses * 100) / 100,
      this_month_mileage_gbp: Math.round(thisMonthMileageGbp * 100) / 100,
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Analytics summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
