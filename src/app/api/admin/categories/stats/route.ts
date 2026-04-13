import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/with-auth'

const PLATFORMS = ['ebay', 'vinted', 'shopify', 'etsy', 'depop'] as const

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * GET /api/admin/categories/stats
 * Returns coverage stats: total categories, per-platform coverage, top-level breakdown.
 */
export const GET = withAdminAuth(async () => {
  const supabase = getServiceClient()

  const { data: categories, error } = await supabase
    .from('categories')
    .select('top_level, platforms')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const total = categories?.length ?? 0

  // Per-platform coverage
  const platformCoverage: Record<string, { mapped: number; total: number; pct: number }> = {}
  for (const p of PLATFORMS) {
    const mapped = (categories ?? []).filter(
      (c) => !!(c.platforms as Record<string, unknown>)?.[p]
    ).length
    platformCoverage[p] = {
      mapped,
      total,
      pct: total > 0 ? Math.round((mapped / total) * 100) : 0,
    }
  }

  // Top-level breakdown
  const topLevelCounts: Record<string, number> = {}
  for (const c of categories ?? []) {
    topLevelCounts[c.top_level] = (topLevelCounts[c.top_level] ?? 0) + 1
  }

  // Field requirements count
  const { count: fieldReqCount } = await supabase
    .from('category_field_requirements')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    total,
    platformCoverage,
    topLevelCounts,
    fieldRequirementRows: fieldReqCount ?? 0,
  })
})
