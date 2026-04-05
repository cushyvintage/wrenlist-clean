import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createSupabaseServerClient } from '@/lib/supabase-server'

/**
 * GET /api/import/find-by-vinted-id?listingId=123456
 * Looks up a find by its Vinted listing ID.
 * Used by extension to map Vinted CDN photos back to the find.
 */
export const GET = (req: NextRequest) =>
  withAuth(async (_req, user) => {
    const supabase = await createSupabaseServerClient()
    const listingId = _req.nextUrl.searchParams.get('listingId')

    if (!listingId) return ApiResponseHelper.badRequest('listingId required')

    const { data } = await supabase
      .from('product_marketplace_data')
      .select('find_id')
      .eq('marketplace', 'vinted')
      .eq('platform_listing_id', listingId)
      .maybeSingle()

    if (!data) return ApiResponseHelper.notFound('Find not found')

    // Verify find belongs to this user
    const { data: find } = await supabase
      .from('finds')
      .select('id')
      .eq('id', data.find_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!find) return ApiResponseHelper.notFound('Find not found')

    return ApiResponseHelper.success({ findId: find.id })
  })(req, { params: Promise.resolve({}) } as any)
