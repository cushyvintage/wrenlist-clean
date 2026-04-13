import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/with-auth'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const PLATFORMS = ['ebay', 'vinted', 'shopify', 'etsy', 'depop'] as const

/**
 * GET /api/admin/categories/freshness
 * Returns per-platform taxonomy freshness info.
 */
export const GET = withAdminAuth(async () => {
  const supabase = getServiceClient()

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

  for (const platform of PLATFORMS) {
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
