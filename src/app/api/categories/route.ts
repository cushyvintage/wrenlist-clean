import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
}

/**
 * GET /api/categories
 * Public endpoint (authenticated users only via RLS) returning the category tree.
 *
 * Query params:
 *   ?top_level=clothing   — filter to one top-level
 *   ?format=tree          — return grouped as { [topLevel]: CategoryRow[] }
 *   ?format=flat          — return flat array (default)
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const topLevel = params.get('top_level')
  const format = params.get('format') ?? 'flat'

  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('categories')
    .select('value, label, top_level, parent_group, platforms, sort_order, legacy_values')
    .order('sort_order')

  if (topLevel) {
    query = query.eq('top_level', topLevel)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (format === 'tree') {
    // Group by top_level → { clothing: [...], antiques: [...], ... }
    const tree: Record<string, typeof data> = {}
    for (const row of data ?? []) {
      if (!tree[row.top_level]) tree[row.top_level] = []
      tree[row.top_level]!.push(row)
    }
    return NextResponse.json(tree, { headers: CACHE_HEADERS })
  }

  return NextResponse.json(data ?? [], { headers: CACHE_HEADERS })
}
