import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'

export const GET = withAuth(async (req, user) => {
  const supabase = await createSupabaseServerClient()

  // Fetch all finds for this user
  const { data: finds, error } = await supabase
    .from('finds')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    console.error('Error fetching finds:', error)
    return NextResponse.json({ error: 'Failed to fetch finds' }, { status: 500 })
  }

  // 1. Aged stock alert: items listed 30+ days with no sale
  const agedFinds = finds.filter((f) => {
    if (f.status !== 'listed' || !f.created_at) return false
    const daysListed = Math.floor(
      (Date.now() - new Date(f.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysListed >= 30
  })

  if (agedFinds.length > 0) {
    return NextResponse.json({
      insight: `You have ${agedFinds.length} item${agedFinds.length === 1 ? '' : 's'} listed for 30+ days with no sale. Consider dropping the price by 10-15%.`,
      type: 'alert',
    })
  }

  // 2. Best category: find category with highest avg margin on sold items
  const soldFinds = finds.filter((f) => f.status === 'sold' && f.cost_gbp && f.sold_price_gbp)

  if (soldFinds.length > 0) {
    const categoryMargins: Record<string, { total: number; count: number }> = {}

    soldFinds.forEach((f) => {
      if (!f.category || !f.cost_gbp || !f.sold_price_gbp) return

      const category = f.category
      const margin = ((f.sold_price_gbp - f.cost_gbp) / f.cost_gbp) * 100
      if (!categoryMargins[category]) {
        categoryMargins[category] = { total: 0, count: 0 }
      }
      categoryMargins[category].total += margin
      categoryMargins[category].count += 1
    })

    const bestCategory = Object.entries(categoryMargins).reduce((best, [cat, data]) => {
      const avgMargin = data.total / data.count
      return !best || avgMargin > best.avgMargin ? { cat, avgMargin } : best
    }, null as { cat: string; avgMargin: number } | null)

    if (bestCategory) {
      const categoryName = bestCategory.cat
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      return NextResponse.json({
        insight: `Your ${categoryName.toLowerCase()} items are selling at ${Math.round(bestCategory.avgMargin)}% margin — your best performer. Source more.`,
        type: 'tip',
      })
    }
  }

  // 3. Low stock warning: fewer than 5 finds with status draft or listed
  const activeFinds = finds.filter((f) => f.status === 'draft' || f.status === 'listed')

  if (activeFinds.length < 5) {
    return NextResponse.json({
      insight: 'Your inventory is running low — time for a sourcing run.',
      type: 'tip',
    })
  }

  // 4. Crosslisting nudge: lots of Vinted items but nothing on eBay
  const vintedFinds = finds.filter((f) => f.source_name === 'Vinted' && f.status === 'listed')
  const ebayFinds = finds.filter((f) => {
    const pf = f.platform_fields as Record<string, unknown> | null
    return pf && pf['ebay']
  })

  if (vintedFinds.length >= 20 && ebayFinds.length === 0) {
    const highValue = vintedFinds.filter((f) => (f.asking_price_gbp ?? 0) >= 20)
    return NextResponse.json({
      insight: `You have ${vintedFinds.length} items on Vinted but nothing on eBay. Crosslisting your ${highValue.length} items priced £20+ could significantly boost revenue — eBay reaches a different buyer base.`,
      type: 'tip',
    })
  }

  // 4b. Price research nudge: items missing asking_price_gbp
  const unpriced = finds.filter((f) => !f.asking_price_gbp && f.status !== 'sold')

  if (unpriced.length > 0) {
    return NextResponse.json({
      insight: `${unpriced.length} item${unpriced.length === 1 ? ' is' : 's are'} missing prices. Use Price Research to set competitive prices.`,
      type: 'info',
    })
  }

  // 5. Default insight
  return NextResponse.json({
    insight: 'Add more items and sell to unlock personalised insights.',
    type: 'info',
  })
})
