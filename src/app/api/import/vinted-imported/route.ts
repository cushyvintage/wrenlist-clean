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

  // Fetch all Vinted PMD rows (paginated to bypass Supabase 1000-row default)
  let allData: Array<{ platform_listing_id: string | null }> = []
  let offset = 0
  const PAGE_SIZE = 1000
  while (true) {
    const { data: page, error: pageError } = await supabase
      .from('product_marketplace_data')
      .select('platform_listing_id')
      .eq('marketplace', 'vinted')
      .range(offset, offset + PAGE_SIZE - 1)
    if (pageError || !page || page.length === 0) break
    allData = allData.concat(page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  const data = allData
  const error = null

  if (error) {
    return ApiResponseHelper.internalError('Failed to fetch imported Vinted listings')
  }

  const importedIds = (data || [])
    .map(row => row.platform_listing_id)
    .filter(Boolean)

  return ApiResponseHelper.success({ importedIds })
})
