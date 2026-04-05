import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/import/marketplace-imported?marketplace=shopify
 * Returns list of already-imported listing IDs for a given marketplace.
 * Generic version of /api/import/vinted-imported.
 */
export const GET = withAuth(async (req: NextRequest, _user) => {
  const marketplace = req.nextUrl.searchParams.get('marketplace')

  if (!marketplace) {
    return ApiResponseHelper.badRequest('marketplace query parameter is required')
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('product_marketplace_data')
    .select('platform_listing_id')
    .eq('marketplace', marketplace)

  if (error) {
    return ApiResponseHelper.internalError(`Failed to fetch imported ${marketplace} listings`)
  }

  const importedIds = (data || [])
    .map(row => row.platform_listing_id)
    .filter(Boolean)

  return ApiResponseHelper.success({ importedIds })
})
