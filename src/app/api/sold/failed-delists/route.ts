import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/sold/failed-delists
 *
 * Returns PMDs in 'error' state that belong to this user, grouped by
 * marketplace. Used by the /sold page to show a warning banner when items
 * were sold on one platform but delist failed on another (still live → risk
 * of double-sale).
 *
 * Why this matters: before this endpoint, delist failures were invisible.
 * Extension reports status='error' after 3 failed attempts, PMD gets stuck
 * there, and nobody notices until a second buyer purchases the still-live
 * listing elsewhere.
 */
export const GET = withAuth(async (_req, user) => {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('product_marketplace_data')
      .select(`
        id,
        marketplace,
        platform_listing_id,
        platform_listing_url,
        error_message,
        updated_at,
        find:finds!inner (
          id,
          name,
          user_id,
          status
        )
      `)
      .eq('status', 'error')
      .eq('finds.user_id', user.id)

    if (error) {
      console.error('[failed-delists] query error:', error)
      return ApiResponseHelper.internalError()
    }

    type RawRow = {
      id: string
      marketplace: string
      platform_listing_id: string | null
      platform_listing_url: string | null
      error_message: string | null
      updated_at: string | null
      find: { id: string; name: string; user_id: string; status: string }
        | { id: string; name: string; user_id: string; status: string }[]
        | null
    }

    const rows = ((data as unknown) as RawRow[]) || []

    const items = rows.map((r) => {
      const find = Array.isArray(r.find) ? r.find[0] : r.find
      return {
        pmdId: r.id,
        findId: find?.id ?? null,
        findName: find?.name ?? 'Unknown item',
        findStatus: find?.status ?? null,
        marketplace: r.marketplace,
        platformListingId: r.platform_listing_id,
        platformListingUrl: r.platform_listing_url,
        errorMessage: r.error_message,
        updatedAt: r.updated_at,
      }
    })

    // Group by marketplace for UI summary
    const byMarketplace = items.reduce<Record<string, number>>((acc, it) => {
      acc[it.marketplace] = (acc[it.marketplace] || 0) + 1
      return acc
    }, {})

    return ApiResponseHelper.success({
      count: items.length,
      byMarketplace,
      items,
    })
  } catch (error) {
    console.error('[failed-delists] unexpected:', error)
    return ApiResponseHelper.internalError()
  }
})
