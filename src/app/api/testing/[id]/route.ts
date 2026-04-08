import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/** GET /api/testing/[id] — get a run with all its results */
export const GET = withAuth(async (_req: NextRequest, user, params) => {
  const id = params?.id
  if (!id) return ApiResponseHelper.error('id is required', 400)

  const db = supabase()

  const { data: run, error: runError } = await db
    .from('test_runs')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (runError || !run) return ApiResponseHelper.notFound('Test run not found')

  const { data: results, error: resultsError } = await db
    .from('test_results')
    .select('*')
    .eq('run_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (resultsError) return ApiResponseHelper.error(resultsError.message, 500)

  return ApiResponseHelper.success({ ...run, results: results || [] })
})

/** PATCH /api/testing/[id] — update run status/notes/counts */
export const PATCH = withAuth(async (req: NextRequest, user, params) => {
  const id = params?.id
  if (!id) return ApiResponseHelper.error('id is required', 400)

  const body = await req.json()
  const allowed = ['status', 'notes', 'completed_at', 'passed_count', 'failed_count', 'skipped_count', 'total_tests']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return ApiResponseHelper.error('No valid fields to update', 400)
  }

  const { data, error } = await supabase()
    .from('test_runs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return ApiResponseHelper.error(error.message, 500)
  if (!data) return ApiResponseHelper.notFound('Test run not found')
  return ApiResponseHelper.success(data)
})

/** DELETE /api/testing/[id] — delete a run and all its results */
export const DELETE = withAuth(async (_req: NextRequest, user, params) => {
  const id = params?.id
  if (!id) return ApiResponseHelper.error('id is required', 400)

  const { error } = await supabase()
    .from('test_runs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return ApiResponseHelper.error(error.message, 500)
  return ApiResponseHelper.success({ deleted: true })
})
