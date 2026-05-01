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
  platform_fields: Record<string, unknown> | null
  stash_id: string | null
  stash: { id: string; name: string } | { id: string; name: string }[] | null
  product_marketplace_data: Array<{
    marketplace: string
    status: string
    fields: Record<string, unknown> | null
    platform_listed_at: string | null
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
  stashId?: string | null
  stashName?: string | null
  marketplace?: string
  margin_percent?: number | null
  days_listed?: number | null
  shipmentStatus?: string | null
  buyer?: string | null
  grossAmount?: number | null
  serviceFee?: number | null
  netAmount?: number | null
  trackingNumber?: string | null
  transactionId?: string | null
  shipmentId?: string | null
  labelUrl?: string | null
  autoImported?: boolean
  shippingAddress?: {
    name?: string | null
    line1?: string | null
    line2?: string | null
    city?: string | null
    postalCode?: string | null
    country?: string | null
  } | null
  feeSource?: string | null
  carrier?: string | null
  isBundle?: boolean
  itemCount?: number
  isGift?: boolean
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
        // Calendar month — matches /api/analytics/summary so the dashboard's
        // "this month" panel and the /sold footer agree.
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // For last_tax_year, also set an end date
    const endDate = timeframe === 'last_tax_year' ? currentTaxYearStart : null

    // Fetch sold finds with marketplace data — paginate to bypass 1000-row REST cap
    const PAGE_SIZE = 1000
    const finds: FindWithMarketplaceJoin[] = []
    for (let off = 0; ; off += PAGE_SIZE) {
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
          platform_fields,
          stash_id,
          stash:stashes(id, name),
          product_marketplace_data (
            marketplace,
            status,
            fields,
            platform_listed_at
          )
          `
        )
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .gte('sold_at', startDate.toISOString())
        .order('sold_at', { ascending: false })
        .range(off, off + PAGE_SIZE - 1)

      if (endDate) {
        query = query.lt('sold_at', endDate.toISOString())
      }

      const { data: page, error: findsError } = await query

      if (findsError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Supabase error:', findsError)
        }
        return ApiResponseHelper.internalError()
      }
      if (!page || page.length === 0) break
      finds.push(...(page as unknown as FindWithMarketplaceJoin[]))
      if (page.length < PAGE_SIZE) break
    }

    // Transform data with calculated fields
    const items: SoldItem[] = finds.map((find) => {
      const marginPercent =
        find.cost_gbp != null && find.sold_price_gbp
          ? Math.round(((find.sold_price_gbp - find.cost_gbp) / find.sold_price_gbp) * 100)
          : null

      // Use sourced_at if available, fall back to platform_listed_at from PMD
      const listedDate = find.sourced_at
        || find.product_marketplace_data?.find((m) => m.platform_listed_at)?.platform_listed_at
        || null
      const daysListed =
        listedDate && find.sold_at
          ? Math.max(0, Math.round(
              (new Date(find.sold_at).getTime() - new Date(listedDate).getTime()) /
                (1000 * 60 * 60 * 24)
            ))
          : null

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
        stashId: find.stash_id,
        stashName: Array.isArray(find.stash) ? find.stash[0]?.name || null : find.stash?.name || null,
        marketplace: soldPmd?.marketplace || 'unknown',
        margin_percent: marginPercent,
        days_listed: daysListed,
        shipmentStatus: (sale?.shipmentStatus as string) || null,
        buyer: ((sale?.buyer as Record<string, unknown>)?.username
          || (sale?.buyer as Record<string, unknown>)?.name
          || (sale?.buyer as Record<string, unknown>)?.email) as string || null,
        grossAmount: (sale?.grossAmount as number) || null,
        serviceFee: (sale?.serviceFee as number) || null,
        netAmount: (sale?.netAmount as number) || null,
        trackingNumber: (sale?.trackingNumber as string) || null,
        transactionId: (sale?.transactionId as string) || null,
        shipmentId: (sale?.shipmentId as string) || null,
        labelUrl: (sale?.labelUrl as string) || null,
        autoImported: find.platform_fields?.ebay_sale_auto_import === true,
        shippingAddress: (sale?.shippingAddress as SoldItem['shippingAddress']) || null,
        feeSource: (sale?.feeSource as string) || null,
        carrier: (sale?.carrier as string) || null,
        isBundle: (sale?.isBundle as boolean) || false,
        itemCount: (sale?.itemCount as number) || 1,
        isGift: (sale?.isGift as boolean) || false,
      }
    })

    // Filter out phantom "Bundle N items" finds created by the old Vinted
    // /my_orders fallback when item-level data was missing at list time. These
    // aren't real inventory — the real items exist under the same transactionId.
    // Extension v0.9.2 prevents new ones; existing ones stay filtered here until
    // the DB cleanup migration runs.
    const BUNDLE_PLACEHOLDER_RE = /^Bundle\s+\d+\s+items?$/i
    const realItems = items.filter((item) => !BUNDLE_PLACEHOLDER_RE.test(item.name || ''))

    // Calculate metrics
    const itemsSold = realItems.length
    const totalRevenue = realItems.reduce((sum, item) => sum + (item.sold_price_gbp || 0), 0)
    const totalCost = realItems.reduce((sum, item) => sum + (item.cost_gbp || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const itemsWithMargin = realItems.filter((item) => item.margin_percent != null)
    const avgMargin =
      itemsWithMargin.length > 0
        ? Math.round(itemsWithMargin.reduce((sum, item) => sum + (item.margin_percent as number), 0) / itemsWithMargin.length)
        : 0

    return ApiResponseHelper.success({
      items: realItems,
      metrics: {
        itemsSold,
        totalRevenue,
        totalCost,
        totalProfit,
        avgMargin,
        avgPerItem: realItems.length > 0 ? Math.round(totalRevenue / realItems.length) : 0,
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
