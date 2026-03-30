import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/orders
 * Fetch all orders for the authenticated user
 * Currently returns empty array as orders sync from marketplace platforms
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    // Stub: Return empty orders array for now
    // In future, this will sync from marketplace APIs (Vinted, eBay, Etsy, Shopify)
    return ApiResponseHelper.success({
      data: [],
      message: 'Orders will sync from marketplace platforms',
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return ApiResponseHelper.internalError('Failed to fetch orders')
  }
}
