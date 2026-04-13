import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/with-auth'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/admin/categories/outcomes?min_attempts=5
 * Returns publish outcome stats grouped by category + platform.
 * Only includes categories with >= min_attempts (default 5).
 */
export const GET = withAdminAuth(async (req: NextRequest) => {
  const params = req.nextUrl.searchParams
  const minAttempts = parseInt(params.get('min_attempts') || '5', 10)

  const supabase = getServiceClient()

  const { data, error } = await supabase.rpc('get_category_publish_outcomes', {
    min_attempts: minAttempts,
  })

  // Fallback: if the RPC doesn't exist, query directly
  if (error?.code === '42883' || error?.message?.includes('function')) {
    // No RPC — use raw SQL via a manual aggregation approach
    const { data: raw, error: rawErr } = await supabase
      .from('category_publish_outcomes')
      .select('category_value, platform, outcome, error_message, created_at')

    if (rawErr) {
      return NextResponse.json({ error: rawErr.message }, { status: 500 })
    }

    // Aggregate in-memory
    const groups: Record<string, {
      category_value: string
      platform: string
      success: number
      failure: number
      total: number
      last_error: string | null
      last_error_at: string | null
    }> = {}

    for (const row of raw || []) {
      const key = `${row.category_value}::${row.platform}`
      if (!groups[key]) {
        groups[key] = {
          category_value: row.category_value,
          platform: row.platform,
          success: 0,
          failure: 0,
          total: 0,
          last_error: null,
          last_error_at: null,
        }
      }
      const g = groups[key]!
      g.total++
      if (row.outcome === 'success') g.success++
      else g.failure++
      if (row.outcome === 'failure' && row.error_message) {
        if (!g.last_error_at || row.created_at > g.last_error_at) {
          g.last_error = row.error_message
          g.last_error_at = row.created_at
        }
      }
    }

    const results = Object.values(groups)
      .filter((g) => g.total >= minAttempts)
      .sort((a, b) => b.failure - a.failure)
      .map((g) => ({
        category_value: g.category_value,
        platform: g.platform,
        success: g.success,
        failure: g.failure,
        total: g.total,
        success_rate: Math.round((g.success / g.total) * 100),
        last_error: g.last_error,
      }))

    return NextResponse.json({ outcomes: results, count: results.length })
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // RPC returned data — add success_rate
  const results = (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    success_rate: row.total ? Math.round((Number(row.success) / Number(row.total)) * 100) : 0,
  }))

  return NextResponse.json({ outcomes: results, count: results.length })
})
