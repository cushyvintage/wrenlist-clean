import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * POST /api/bulk/mark-sold
 * Mark multiple finds as sold with optional uniform sold price
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()
    const { findIds, soldPrice } = body as { findIds: string[]; soldPrice?: number }

    if (!Array.isArray(findIds) || findIds.length === 0) {
      return ApiResponseHelper.badRequest('findIds must be a non-empty array')
    }

    if (findIds.length > 100) {
      return ApiResponseHelper.badRequest('Cannot mark more than 100 items at once')
    }

    const supabase = await createSupabaseServerClient()

    // Verify all finds belong to the user
    const { data: finds, error: findError } = await supabase
      .from('finds')
      .select('id, status')
      .in('id', findIds)
      .eq('user_id', user.id)

    if (findError) {
      console.error('Supabase error checking finds:', findError)
      return ApiResponseHelper.internalError()
    }

    if (!finds || finds.length !== findIds.length) {
      return ApiResponseHelper.notFound('One or more finds not found or not authorized')
    }

    // Prepare update data
    const now = new Date().toISOString()
    const updateData = {
      status: 'sold',
      sold_at: now,
      ...(soldPrice !== undefined && soldPrice > 0 ? { sold_price_gbp: soldPrice } : {}),
    }

    // Update all finds
    // Note: Vinted delist dispatch happens client-side in inventory detail page via extension messaging
    // Bulk operations cannot reach the browser extension, so individual mark-sold actions are responsible for delist dispatch
    const { error: updateError } = await supabase
      .from('finds')
      .update(updateData)
      .in('id', findIds)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Supabase error marking finds sold:', updateError)
      return ApiResponseHelper.internalError()
    }

    return ApiResponseHelper.success({
      updated: findIds.length,
      message: `Marked ${findIds.length} item${findIds.length !== 1 ? 's' : ''} as sold`,
    })
  } catch (error) {
    console.error('POST /api/bulk/mark-sold error:', error)
    return ApiResponseHelper.internalError()
  }
}
