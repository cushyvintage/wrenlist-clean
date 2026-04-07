import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'

/**
 * PATCH /api/jobs/[id]
 * Cancel a pending job. Only works on jobs in 'pending' status.
 */
export const PATCH = withAuth(async (req: NextRequest, user, params) => {
  const jobId = params?.id
  if (!jobId) return ApiResponseHelper.badRequest('Job ID required')

  const body = await req.json()
  const { status } = body as { status?: string }

  if (status !== 'cancelled') {
    return ApiResponseHelper.badRequest('Only cancellation is supported (status: "cancelled")')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Only cancel pending jobs owned by this user
  const { data, error } = await supabase
    .from('publish_jobs')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (error || !data) {
    return ApiResponseHelper.error('Job not found or not cancellable (must be pending)', 409)
  }

  return ApiResponseHelper.success({ id: data.id, status: 'cancelled' })
})

/**
 * DELETE /api/jobs/[id]
 * Delete a completed/failed/cancelled job (cleanup).
 */
export const DELETE = withAuth(async (_req: NextRequest, user, params) => {
  const jobId = params?.id
  if (!jobId) return ApiResponseHelper.badRequest('Job ID required')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('publish_jobs')
    .delete()
    .eq('id', jobId)
    .eq('user_id', user.id)
    .in('status', ['completed', 'failed', 'cancelled'])
    .select('id')

  if (error) {
    return ApiResponseHelper.internalError()
  }

  if (!data || data.length === 0) {
    return ApiResponseHelper.notFound('Job not found or not deletable (must be completed, failed, or cancelled)')
  }

  return ApiResponseHelper.success({ deleted: true })
})
