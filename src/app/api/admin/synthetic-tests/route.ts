import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { isAdmin } from '@/lib/admin'
import { runSuite } from '@/lib/synthetic/critical-paths-suite'

/**
 * POST /api/admin/synthetic-tests
 *
 * Admin-triggered manual run of the critical-paths suite. Same code as
 * the nightly cron — different entry point so admins can fire on demand
 * (e.g. before a deploy) without waiting for the cron.
 *
 * The suite runs against the test user's account (which is the admin
 * themselves when called from the dashboard) — no separate test
 * account needed for ad-hoc verification.
 */
export const POST = withAuth(async (request: NextRequest, user) => {
  if (!isAdmin(user.email)) {
    return ApiResponseHelper.unauthorized()
  }

  // Service-role client for recording results; runs against the same
  // user's data so it tests with their connected marketplaces.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: run, error: runErr } = await supabase
    .from('synthetic_test_runs')
    .insert({
      user_id: user.id,
      suite: 'manual_admin',
      status: 'running',
      meta: { source: 'admin_dashboard', triggered_by: user.email },
    })
    .select('id')
    .single()
  if (runErr || !run) {
    return ApiResponseHelper.internalError(`failed to open run: ${runErr?.message}`)
  }

  // Use the request's own host so the suite hits the same env it ran in.
  const baseUrl = new URL(request.url).origin

  // Forward the caller's cookies so the suite hits the API as the
  // admin. Wrenlist's auth middleware reads the Supabase session from
  // sb-api-auth-token cookies — passing the raw Cookie header through
  // is the simplest way to keep the request authenticated end-to-end.
  const cookieHeader = request.headers.get('cookie') ?? ''

  let overall: 'passed' | 'failed' = 'failed'
  let steps: { step: string; status: string }[] = []
  try {
    const result = await runSuite({
      supabase,
      userId: user.id,
      baseUrl,
      cookieHeader,
      runId: run.id,
    })
    overall = result.overall
    steps = result.steps.map((s) => ({ step: s.step, status: s.status }))
  } catch (error) {
    overall = 'failed'
    const msg = error instanceof Error ? error.message : 'Unknown error'
    await supabase
      .from('synthetic_test_results')
      .insert({ run_id: run.id, step: 'runner_error', status: 'failed', details: { error: msg } })
  }

  await supabase
    .from('synthetic_test_runs')
    .update({
      status: overall,
      finished_at: new Date().toISOString(),
      meta: { source: 'admin_dashboard', triggered_by: user.email, steps },
    })
    .eq('id', run.id)

  return NextResponse.json({ runId: run.id, overall, steps })
})

/**
 * GET /api/admin/synthetic-tests
 *
 * Lists recent runs for the admin dashboard. Shows last 30 with their
 * step breakdown so the admin can spot trends (e.g. publish.ebay starts
 * failing every night after a particular commit).
 */
export const GET = withAuth(async (_request: NextRequest, user) => {
  if (!isAdmin(user.email)) {
    return ApiResponseHelper.unauthorized()
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: runs, error } = await supabase
    .from('synthetic_test_runs')
    .select('id, suite, status, started_at, finished_at, meta')
    .order('started_at', { ascending: false })
    .limit(30)
  if (error) return ApiResponseHelper.internalError(error.message)

  // Pull all results for these runs in one query (avoids N+1).
  const runIds = (runs ?? []).map((r) => r.id)
  const { data: results } = runIds.length
    ? await supabase
        .from('synthetic_test_results')
        .select('run_id, step, status, duration_ms, details, recorded_at')
        .in('run_id', runIds)
        .order('recorded_at', { ascending: true })
    : { data: [] as never[] }

  const byRun = new Map<string, typeof results>()
  for (const row of results ?? []) {
    const list = byRun.get(row.run_id) ?? []
    list.push(row)
    byRun.set(row.run_id, list)
  }

  return ApiResponseHelper.success({
    runs: (runs ?? []).map((r) => ({
      ...r,
      results: byRun.get(r.id) ?? [],
    })),
  })
})
