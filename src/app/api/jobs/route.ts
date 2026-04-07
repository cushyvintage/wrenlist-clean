import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createPublishJob } from '@/lib/publish-jobs'
import type { JobAction, StalePolicy } from '@/types'

/**
 * GET /api/jobs
 * List user's jobs with optional filters.
 * Query params: status (comma-separated), limit, offset
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const url = new URL(req.url)
  const statusFilter = url.searchParams.get('status')?.split(',').filter(Boolean)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabase
    .from('publish_jobs')
    .select('*, finds!inner(name, photos, sku)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (statusFilter && statusFilter.length > 0) {
    query = query.in('status', statusFilter)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Jobs] List query failed:', error)
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success(data || [])
})

/**
 * POST /api/jobs
 * Create a new publish/delist job.
 * Body: { find_id, platform, action, scheduled_for?, stale_policy?, payload? }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { find_id, platform, action, scheduled_for, stale_policy, payload } = body as {
    find_id?: string
    platform?: string
    action?: JobAction
    scheduled_for?: string
    stale_policy?: StalePolicy
    payload?: Record<string, unknown>
  }

  if (!find_id || !platform || !action) {
    return ApiResponseHelper.badRequest('find_id, platform, and action are required')
  }

  if (!['publish', 'delist', 'update'].includes(action)) {
    return ApiResponseHelper.badRequest('action must be publish, delist, or update')
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify ownership
  const { data: find, error: findError } = await supabase
    .from('finds')
    .select('id')
    .eq('id', find_id)
    .eq('user_id', user.id)
    .single()

  if (findError || !find) {
    return ApiResponseHelper.notFound('Find not found')
  }

  const result = await createPublishJob(supabase, {
    user_id: user.id,
    find_id,
    platform,
    action,
    scheduled_for,
    stale_policy,
    payload,
  })

  if (result.error) {
    return ApiResponseHelper.internalError(result.error)
  }

  if (result.skipped) {
    return ApiResponseHelper.success({ id: result.id, message: 'Job already exists' })
  }

  return ApiResponseHelper.created({ id: result.id })
})

/**
 * DELETE /api/jobs
 * Clear job history — deletes all completed, failed, and cancelled jobs for the user.
 */
export const DELETE = withAuth(async (_req: NextRequest, user) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('publish_jobs')
    .delete()
    .eq('user_id', user.id)
    .in('status', ['completed', 'failed', 'cancelled'])
    .select('id')

  if (error) {
    return ApiResponseHelper.internalError()
  }

  return ApiResponseHelper.success({ deleted: (data || []).length })
})
