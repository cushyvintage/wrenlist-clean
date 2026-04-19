import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * POST /api/ebay/imported-ids
 * Check which eBay listing IDs are already imported for the current user.
 * Body: { listingIds: string[] }
 * Returns: { data: string[] } — the subset that already exist
 */
export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const listingIds = (body.listingIds || []) as string[]

  if (listingIds.length === 0) {
    return ApiResponseHelper.success([])
  }

  const supabase = await createSupabaseServerClient()

  // Batch in chunks of 100 to stay within Supabase IN clause limits
  const existing: string[] = []
  for (let i = 0; i < listingIds.length; i += 100) {
    const chunk = listingIds.slice(i, i + 100)
    const { data } = await supabase
      .from('product_marketplace_data')
      .select('platform_listing_id')
      .eq('marketplace', 'ebay')
      .eq('user_id', user.id)
      .in('platform_listing_id', chunk)

    if (data) {
      existing.push(...data.map(r => r.platform_listing_id).filter(Boolean))
    }
  }

  return ApiResponseHelper.success(existing)
})
