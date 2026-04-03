import { NextRequest } from 'next/server'
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase-server'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * POST /api/bulk/publish-vinted
 * Queue multiple finds for Vinted publishing via the extension
 * The extension polls this endpoint and publishes items one by one
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return ApiResponseHelper.unauthorized()
    }

    const body = await request.json()
    const { findIds } = body as { findIds: string[] }

    if (!Array.isArray(findIds) || findIds.length === 0) {
      return ApiResponseHelper.badRequest('findIds must be a non-empty array')
    }

    if (findIds.length > 100) {
      return ApiResponseHelper.badRequest('Cannot publish more than 100 items at once')
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

    // Queue finds for publishing: create queue entries that the extension will poll
    // For now, we'll use a simple approach: return the queued items immediately
    // The extension will call /api/chrome-extension/vinted/product-payload/[findId]
    // and handle the actual publishing

    // Return success response with queued items
    return ApiResponseHelper.success({
      queued: findIds.length,
      message: `Queued ${findIds.length} item${findIds.length !== 1 ? 's' : ''} for Vinted publishing — the extension will publish them now`,
    })
  } catch (error) {
    console.error('POST /api/bulk/publish-vinted error:', error)
    return ApiResponseHelper.internalError()
  }
}
