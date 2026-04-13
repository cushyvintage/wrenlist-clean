import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { getAdminClient } from '@/lib/supabase-admin'
import { CATEGORY_PLATFORMS } from '@/lib/platforms'

/**
 * GET /api/admin/categories/freshness
 * Returns per-platform taxonomy freshness info.
 */
export const GET = withAdminAuth(async () => {
  const supabase = getAdminClient()

  // Get latest version record per platform
  const { data, error } = await supabase
    .from('category_taxonomy_versions')
    .select('*')
    .order('fetched_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const now = Date.now()
  const result: Record<string, {
    last_checked: string | null
    days_ago: number | null
    category_count: number | null
    leaf_count: number | null
    status: 'fresh' | 'stale' | 'warning' | 'never'
    checksum: string | null
  }> = {}

  for (const platform of CATEGORY_PLATFORMS) {
    const latest = (data ?? []).find((r) => r.platform === platform)
    if (!latest) {
      result[platform] = {
        last_checked: null,
        days_ago: null,
        category_count: null,
        leaf_count: null,
        status: 'never',
        checksum: null,
      }
      continue
    }

    const daysAgo = Math.floor((now - new Date(latest.fetched_at).getTime()) / (1000 * 60 * 60 * 24))
    result[platform] = {
      last_checked: latest.fetched_at,
      days_ago: daysAgo,
      category_count: latest.category_count,
      leaf_count: latest.leaf_count,
      status: daysAgo <= 30 ? 'fresh' : daysAgo <= 90 ? 'warning' : 'stale',
      checksum: latest.checksum,
    }
  }

  return NextResponse.json(result)
})
