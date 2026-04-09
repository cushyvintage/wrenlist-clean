import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { FieldConfig, Platform } from '@/types'
import { getCategoryFields } from '@/data/marketplace/category-field-requirements'
import { LEGACY_CATEGORY_MAP } from '@/data/marketplace-category-map'
import type { PlatformFieldMap } from '@/types/categories'

const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
}

export const GET = async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams
    const category = searchParams.get('category')
    const marketplace = (searchParams.get('marketplace') || 'vinted') as Platform

    if (!category) {
      return NextResponse.json(
        { error: 'category query parameter is required' },
        { status: 400 }
      )
    }

    // Resolve legacy category names, then look up field requirements
    const resolvedCategory = LEGACY_CATEGORY_MAP[category.toLowerCase()] ?? category.toLowerCase()
    const mp = marketplace === 'ebay' || marketplace === 'vinted' ? marketplace : null
    const fieldDefs = mp ? getCategoryFields(resolvedCategory, mp) : []

    // Convert CategoryFieldDef[] → PlatformFieldMap for backward compat with consumers
    const staticFields: PlatformFieldMap = {}
    for (const f of fieldDefs) {
      staticFields[f.name.toLowerCase().replace(/\s+/g, '_')] = {
        show: true,
        required: f.required,
        type: f.type === 'select' ? 'select' : 'text',
      }
    }

    // Check DB for overrides (extension PATCH writes here)
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('marketplace_category_config')
      .select('*')
      .eq('category', resolvedCategory)
      .eq('marketplace', marketplace)
      .single()

    if (data?.fields) {
      // Merge DB overrides on top of static data
      const dbFields = data.fields as unknown as Record<string, FieldConfig>
      const merged = { ...staticFields }
      for (const [key, val] of Object.entries(dbFields)) {
        merged[key] = { ...merged[key], ...val }
      }

      return NextResponse.json(
        { ...data, fields: merged },
        { headers: CACHE_HEADERS }
      )
    }

    // No DB override — return static fields directly
    return NextResponse.json(
      {
        category: resolvedCategory,
        marketplace,
        fields: staticFields,
      },
      { status: 200, headers: CACHE_HEADERS }
    )
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error fetching category config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch category configuration' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/config/category-fields
 * Called by the Vinted extension to augment field config with live API data.
 * Body: { category, marketplace, fields, source: 'vinted_api' | 'ebay_api' }
 * Auth: must be logged in (extension uses user session)
 */
export const PATCH = withAuth(async (req, user) => {
  const body = await req.json()
  const { category, marketplace, fields, source } = body

  if (!category || !marketplace || !fields) {
    return NextResponse.json({ error: 'category, marketplace and fields are required' }, { status: 400 })
  }

  const validSources = ['vinted_api', 'ebay_api', 'manual']
  const safeSource = validSources.includes(source) ? source : 'vinted_api'

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('marketplace_category_config')
    .upsert({
      category: category.toLowerCase(),
      marketplace,
      fields,
      source: safeSource,
      last_updated: new Date().toISOString(),
    }, { onConflict: 'category,marketplace' })
    .select()
    .single()

  if (error) throw error

  return NextResponse.json(data)
})
