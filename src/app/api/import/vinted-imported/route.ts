import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'
import { withAuth } from '@/lib/with-auth'

/**
 * GET /api/import/vinted-imported
 * Returns list of already-imported Vinted listing IDs for the current user.
 * Used by the import page to mark which Vinted listings are already in Wren.
 */
export const GET = withAuth(async (_req: NextRequest, user) => {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('product_marketplace_data')
    .select('platform_listing_id, find_id')
    .eq('marketplace', 'vinted')

  if (error) {
    return ApiResponseHelper.internalError('Failed to fetch imported Vinted listings')
  }

  const importedIds = (data || [])
    .map(row => row.platform_listing_id)
    .filter(Boolean)

  return ApiResponseHelper.success({ importedIds })
})
