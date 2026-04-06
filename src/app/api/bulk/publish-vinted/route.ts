import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/bulk/publish-vinted
 * Queue multiple finds for Vinted publishing via the extension
 * The extension polls this endpoint and publishes items one by one
 */
export const POST = withAuth(async (request, user) => {
  const { success } = await checkRateLimit(`bulk-publish-vinted:${user.id}`, 5)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
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

    return ApiResponseHelper.success({
      queued: findIds.length,
      message: `Queued ${findIds.length} item${findIds.length !== 1 ? 's' : ''} for Vinted publishing — the extension will publish them now`,
    })
  } catch (error) {
    console.error('POST /api/bulk/publish-vinted error:', error)
    return ApiResponseHelper.internalError()
  }
})
