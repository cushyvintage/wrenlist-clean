import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

interface AnalyticsSummary {
  total_finds: number
  listed_finds: number
  sold_finds: number
  total_revenue_gbp: number
  total_cost_gbp: number
  gross_margin_pct: number
  avg_days_to_sell: number
  this_month_finds: number
  this_month_revenue: number
  this_month_expenses: number
  this_month_mileage_gbp: number
}

export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()
    const userId = user.id

    // Get current month boundaries
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

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

    // Calculate basic metrics
    const totalFinds = finds.length
    const listedFinds = finds.filter((f) => f.status === 'listed').length
    const soldFinds = finds.filter((f) => f.status === 'sold').length

    // Revenue and cost calculations
    let totalRevenueGbp = 0
    let totalCostGbp = 0
    let marginData: number[] = []
    let daysToSellData: number[] = []

    finds.forEach((find) => {
      // Total cost from all finds
      if (find.cost_gbp) {
        totalCostGbp += find.cost_gbp
      }

      // Only count sold items for revenue
      if (find.status === 'sold' && find.sold_price_gbp) {
        totalRevenueGbp += find.sold_price_gbp

        // Calculate margin percentage
        if (find.cost_gbp) {
          const margin = ((find.sold_price_gbp - find.cost_gbp) / find.cost_gbp) * 100
          marginData.push(margin)
        }

        // Calculate days to sell
        if (find.sourced_at && find.sold_at) {
          const days = Math.round(
            (new Date(find.sold_at).getTime() - new Date(find.sourced_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
          daysToSellData.push(days)
        }
      }
    })

    const grossMarginPct =
      totalRevenueGbp > 0 ? Math.round(((totalRevenueGbp - totalCostGbp) / totalRevenueGbp) * 100) : 0
    const avgDaysToSell = daysToSellData.length > 0
      ? Math.round(daysToSellData.reduce((a, b) => a + b, 0) / daysToSellData.length)
      : 0

    // This month metrics
    const thisMonthFinds = finds.filter((f) => {
      const createdDate = new Date(f.created_at)
      return createdDate >= new Date(monthStart) && createdDate <= new Date(monthEnd)
    }).length

    const thisMonthRevenue = finds
      .filter((f) => {
        if (!f.sold_at || f.status !== 'sold') return false
        const soldDate = new Date(f.sold_at)
        return soldDate >= new Date(monthStart) && soldDate <= new Date(monthEnd)
      })
      .reduce((sum, f) => sum + (f.sold_price_gbp || 0), 0)

    // Fetch expenses for this month
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('amount_gbp')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    let thisMonthExpenses = 0
    if (!expensesError && expenses) {
      thisMonthExpenses = expenses.reduce((sum, e) => sum + (e.amount_gbp || 0), 0)
    }

    // Fetch mileage for this month
    const { data: mileage, error: mileageError } = await supabase
      .from('mileage')
      .select('deductible_value_gbp')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lte('date', monthEnd)

    let thisMonthMileageGbp = 0
    if (!mileageError && mileage) {
      thisMonthMileageGbp = mileage.reduce((sum, m) => sum + (m.deductible_value_gbp || 0), 0)
    }

    const summary: AnalyticsSummary = {
      total_finds: totalFinds,
      listed_finds: listedFinds,
      sold_finds: soldFinds,
      total_revenue_gbp: totalRevenueGbp,
      total_cost_gbp: totalCostGbp,
      gross_margin_pct: grossMarginPct,
      avg_days_to_sell: avgDaysToSell,
      this_month_finds: thisMonthFinds,
      this_month_revenue: thisMonthRevenue,
      this_month_expenses: thisMonthExpenses,
      this_month_mileage_gbp: thisMonthMileageGbp,
    }

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Analytics summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
