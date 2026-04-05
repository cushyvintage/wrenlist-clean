import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * GET /api/marketplace/events
 * Returns marketplace activity log for the user.
 * Query params: find_id, marketplace, limit (default 50), offset (default 0)
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url)
  const findId = searchParams.get('find_id')
  const marketplace = searchParams.get('marketplace')
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 200)
  const offset = Number(searchParams.get('offset')) || 0

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('marketplace_events')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (findId) query = query.eq('find_id', findId)
  if (marketplace) query = query.eq('marketplace', marketplace)

  const { data, error } = await query

  if (error) return ApiResponseHelper.internalError()

  return ApiResponseHelper.success(data)
})
