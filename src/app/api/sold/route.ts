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
 * Fetch all sold items for authenticated user with marketplace data.
 * Returns the full sold history (so the workspace's history table and
 * empty state are honest about what exists), with metrics scoped to the
 * current calendar month so the "this month" footer matches the
 * dashboard's "this month" panel.
 *
 * The full ledger view with date pickers lives at /orders.
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    // Current calendar month — used to scope metrics, not the items list.
    // Matches /api/analytics/summary so the dashboard panel and /sold
    // footer agree on what counts as "this month".
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Fetch sold finds with marketplace data — paginate to bypass 1000-row REST cap
    const PAGE_SIZE = 1000
    const finds: FindWithMarketplaceJoin[] = []
    for (let off = 0; ; off += PAGE_SIZE) {
      const { data: page, error: findsError } = await supabase
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
        .order('sold_at', { ascending: false })
        .range(off, off + PAGE_SIZE - 1)

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

    // Metrics are always scoped to the current calendar month — the footer
    // displays "this month", so the underlying figures must match. The items
    // list itself is full history (so the workspace shows everything the
    // user has actually sold, not just May).
    const monthStartMs = monthStart.getTime()
    const monthItems = realItems.filter(
      (item) => item.sold_at && new Date(item.sold_at).getTime() >= monthStartMs,
    )
    const itemsSold = monthItems.length
    const totalRevenue = monthItems.reduce((sum, item) => sum + (item.sold_price_gbp || 0), 0)
    const totalCost = monthItems.reduce((sum, item) => sum + (item.cost_gbp || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const itemsWithMargin = monthItems.filter((item) => item.margin_percent != null)
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
        avgPerItem: monthItems.length > 0 ? Math.round(totalRevenue / monthItems.length) : 0,
      },
      timeframe: 'month',
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('GET /api/sold error:', error)
    }
    return ApiResponseHelper.internalError()
  }
})
