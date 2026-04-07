import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

interface FindWithMarketplaceJoin {
  id: string
  name: string
  sold_price_gbp: number | null
  cost_gbp: number | null
  sold_at: string
  product_marketplace_data: Array<{
    marketplace: string
    platform_listing_url: string | null
  }>
}

interface Order {
  id: string
  name: string
  sold_price_gbp: number | null
  cost_gbp: number | null
  sold_at: string
  marketplace: string
  platform_listing_url: string | null
  margin_gbp: number | null
  margin_pct: number | null
}

/**
 * GET /api/orders
 * Fetch all orders (sold finds) for the authenticated user
 * Joined with product_marketplace_data to get platform info
 * Returns: array of orders with marketplace data and margin calculations
 */
export const GET = withAuth(async (req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    // Fetch finds with status='sold', join with marketplace data
    const { data: finds, error: findsError } = await supabase
      .from('finds')
      .select(
        `
        id,
        name,
        sold_price_gbp,
        cost_gbp,
        sold_at,
        product_marketplace_data(
          marketplace,
          platform_listing_url
        )
        `
      )
      .eq('user_id', user.id)
      .eq('status', 'sold')
      .order('sold_at', { ascending: false })
      .limit(10000)

    if (findsError) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Supabase error:', findsError)
      }
      return ApiResponseHelper.internalError()
    }

    // Transform data and calculate margins
    const orders: Order[] = ((finds || []) as FindWithMarketplaceJoin[]).flatMap((find) => {
      const marketplaceDataArray = find.product_marketplace_data || []

      // If no marketplace data, create a generic order entry
      if (marketplaceDataArray.length === 0) {
        return [{
          id: find.id,
          name: find.name,
          sold_price_gbp: find.sold_price_gbp,
          cost_gbp: find.cost_gbp,
          sold_at: find.sold_at,
          marketplace: 'unknown',
          platform_listing_url: null,
          margin_gbp: find.sold_price_gbp && find.cost_gbp ? find.sold_price_gbp - find.cost_gbp : null,
          margin_pct: find.sold_price_gbp && find.cost_gbp && find.cost_gbp > 0 ? Math.round(((find.sold_price_gbp - find.cost_gbp) / find.cost_gbp) * 100) : null,
        }]
      }

      // Create an order entry for each marketplace the item was listed on
      return marketplaceDataArray.map((md) => ({
        id: find.id,
        name: find.name,
        sold_price_gbp: find.sold_price_gbp,
        cost_gbp: find.cost_gbp,
        sold_at: find.sold_at,
        marketplace: md.marketplace,
        platform_listing_url: md.platform_listing_url,
        margin_gbp: find.sold_price_gbp && find.cost_gbp ? find.sold_price_gbp - find.cost_gbp : null,
        margin_pct: find.sold_price_gbp && find.cost_gbp && find.cost_gbp > 0 ? Math.round(((find.sold_price_gbp - find.cost_gbp) / find.cost_gbp) * 100) : null,
      }))
    })

    return ApiResponseHelper.success({
      data: orders,
      total: orders.length,
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching orders:', error)
    }
    return ApiResponseHelper.internalError('Failed to fetch orders')
  }
})
