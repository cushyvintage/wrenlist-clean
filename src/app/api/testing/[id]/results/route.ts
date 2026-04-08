import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/** PATCH /api/testing/[id]/results — bulk update results + recompute run counts */
export const PATCH = withAuth(async (req: NextRequest, user, params) => {
  const runId = params?.id
  if (!runId) return ApiResponseHelper.error('id is required', 400)

  const body = await req.json()
  const { result_id, status, severity, actual, notes, db_snapshot, screenshot_url } = body as {
    result_id: string
    status?: string
    severity?: string | null
    actual?: string
    notes?: string
    db_snapshot?: Record<string, unknown>
    screenshot_url?: string
  }

  if (!result_id) return ApiResponseHelper.error('result_id is required', 400)

  const db = supabase()

  // Build update object
  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (severity !== undefined) updates.severity = severity
  if (actual !== undefined) updates.actual = actual
  if (notes !== undefined) updates.notes = notes
  if (db_snapshot !== undefined) updates.db_snapshot = db_snapshot
  if (screenshot_url !== undefined) updates.screenshot_url = screenshot_url

  if (Object.keys(updates).length === 0) {
    return ApiResponseHelper.error('No valid fields to update', 400)
  }

  // Update the result
  const { data: result, error: resultError } = await db
    .from('test_results')
    .update(updates)
    .eq('id', result_id)
    .eq('run_id', runId)
    .eq('user_id', user.id)
    .select()
    .single()

  if (resultError) return ApiResponseHelper.error(resultError.message, 500)
  if (!result) return ApiResponseHelper.notFound('Test result not found')

  // Recompute run counts
  const { data: allResults } = await db
    .from('test_results')
    .select('status')
    .eq('run_id', runId)

  if (allResults) {
    const counts = {
      total_tests: allResults.length,
      passed_count: allResults.filter((r) => r.status === 'passed').length,
      failed_count: allResults.filter((r) => r.status === 'failed').length,
      skipped_count: allResults.filter((r) => r.status === 'skipped').length,
    }

    // Auto-compute run status
    const pending = allResults.filter((r) => r.status === 'pending').length
    let runStatus: string = 'running'
    if (pending === 0) {
      runStatus = counts.failed_count > 0 ? 'failed' : 'passed'
    }

    await db
      .from('test_runs')
      .update({
        ...counts,
        status: runStatus,
        completed_at: pending === 0 ? new Date().toISOString() : null,
      })
      .eq('id', runId)
      .eq('user_id', user.id)
  }

  return ApiResponseHelper.success(result)
})
