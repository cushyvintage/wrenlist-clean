import { withAuth } from '@/lib/with-auth'
import { ApiResponseHelper } from '@/lib/api-response'
import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

/** GET /api/testing — list all test runs */
export const GET = withAuth(async (_req: NextRequest, user) => {
  const { data, error } = await supabase()
    .from('test_runs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return ApiResponseHelper.error(error.message, 500)
  return ApiResponseHelper.success(data)
})

/** POST /api/testing — create a new test run (with optional pre-populated results) */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { name, notes, results } = body as {
    name: string
    notes?: string
    results?: Array<{
      test_name: string
      phase: string
      expected?: string
    }>
  }

  if (!name) return ApiResponseHelper.error('name is required', 400)

  const db = supabase()

  // Create the run
  const { data: run, error: runError } = await db
    .from('test_runs')
    .insert({
      user_id: user.id,
      name,
      notes: notes || null,
      total_tests: results?.length || 0,
      status: 'pending',
    })
    .select()
    .single()

  if (runError) return ApiResponseHelper.error(runError.message, 500)

  // Bulk-insert pre-populated results if provided
  if (results && results.length > 0) {
    const rows = results.map((r) => ({
      run_id: run.id,
      user_id: user.id,
      test_name: r.test_name,
      phase: r.phase,
      expected: r.expected || null,
      status: 'pending',
    }))

    const { error: resultsError } = await db.from('test_results').insert(rows)
    if (resultsError) return ApiResponseHelper.error(resultsError.message, 500)
  }

  return ApiResponseHelper.created(run)
})
