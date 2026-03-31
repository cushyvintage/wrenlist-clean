import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

interface ListingStats {
  totalListings: number
  activeListing: number
  soldCount: number
  delistedCount: number
  totalRevenue: number
  avgMargin: number
  viewsTotal: number
  likesTotal: number
}

/**
 * GET /api/listings/stats
 * Get listing statistics for user
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const supabase = await createSupabaseServerClient()
    // Get all listings for user
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      if (process.env.NODE_ENV !== 'production') { console.error('Supabase error:', error)
      return ApiResponseHelper.internalError(error.message)
    }

    if (!listings || listings.length === 0) {
      return ApiResponseHelper.success({
        totalListings: 0,
        activeListing: 0,
        soldCount: 0,
        delistedCount: 0,
        totalRevenue: 0,
        avgMargin: 0,
        viewsTotal: 0,
        likesTotal: 0,
      } as ListingStats)
    }

    // Calculate stats
    const stats: ListingStats = {
      totalListings: listings.length,
      activeListing: listings.filter((l) => l.status === 'live').length,
      soldCount: listings.filter((l) => l.status === 'sold').length,
      delistedCount: listings.filter((l) => l.status === 'delisted').length,
      totalRevenue: 0,
      avgMargin: 0,
      viewsTotal: listings.reduce((sum, l) => sum + (l.views || 0), 0),
      likesTotal: listings.reduce((sum, l) => sum + (l.likes || 0), 0),
    }

    return ApiResponseHelper.success(stats)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') { console.error('GET /api/listings/stats error:', error)
    return ApiResponseHelper.internalError()
  }
}
