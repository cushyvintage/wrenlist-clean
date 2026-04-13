import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
}

/**
 * GET /api/categories/lookup
 * Look up a category by various identifiers.
 *
 * Query params:
 *   ?value=clothing_womenswear_womens_dresses  — exact canonical value
 *   ?legacy=ceramics_plates                     — resolve legacy value
 *   ?platform=vinted&platform_id=1234           — reverse lookup by platform ID
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const value = params.get('value')
  const legacy = params.get('legacy')
  const platform = params.get('platform')
  const platformId = params.get('platform_id')

  const supabase = await createSupabaseServerClient()

  // Direct value lookup
  if (value) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('value', value)
      .single()

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(data, { headers: CACHE_HEADERS })
  }

  // Legacy value resolution
  if (legacy) {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .contains('legacy_values', [legacy])
      .single()

    if (data) {
      return NextResponse.json(data, { headers: CACHE_HEADERS })
    }

    // Try direct match (might already be a canonical value)
    const { data: direct } = await supabase
      .from('categories')
      .select('*')
      .eq('value', legacy)
      .single()

    if (direct) {
      return NextResponse.json(direct, { headers: CACHE_HEADERS })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Platform reverse lookup (e.g., Vinted ID → canonical category)
  if (platform && platformId) {
    // Use jsonb path query: platforms->'vinted'->>'id' = '1234'
    const { data } = await supabase
      .from('categories')
      .select('*')
      .contains('platforms', { [platform]: { id: platformId } })
      .limit(1)
      .single()

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data, { headers: CACHE_HEADERS })
  }

  return NextResponse.json({ error: 'Provide value, legacy, or platform+platform_id' }, { status: 400 })
}
