import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { withAuth } from '@/lib/with-auth'
import { FieldConfig, Platform } from '@/types'

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

    const supabase = await createSupabaseServerClient()
    const resolvedCategory = category.toLowerCase()

    // Step 1: Try legacy resolution via DB
    let canonicalCategory = resolvedCategory
    const { data: legacyMatch } = await supabase
      .from('categories')
      .select('value')
      .contains('legacy_values', [resolvedCategory])
      .limit(1)
      .single()

    if (legacyMatch) {
      canonicalCategory = legacyMatch.value
    }

    // Step 2: Get field requirements from category_field_requirements table
    const { data: fieldReqRow } = await supabase
      .from('category_field_requirements')
      .select('fields')
      .eq('category_value', canonicalCategory)
      .eq('platform', marketplace)
      .single()

    // Convert CategoryFieldDef[] → PlatformFieldMap for backward compat
    const staticFields: Record<string, FieldConfig> = {}
    if (fieldReqRow?.fields && Array.isArray(fieldReqRow.fields)) {
      for (const f of fieldReqRow.fields as Array<{ name: string; required?: boolean; type?: string }>) {
        staticFields[f.name.toLowerCase().replace(/\s+/g, '_')] = {
          show: true,
          required: f.required ?? false,
          type: (f.type === 'select' ? 'select' : 'text') as 'text' | 'select',
        }
      }
    }

    // Step 3: Check marketplace_category_config for user/extension overrides
    const { data: overrideRow } = await supabase
      .from('marketplace_category_config')
      .select('*')
      .eq('category', canonicalCategory)
      .eq('marketplace', marketplace)
      .single()

    if (overrideRow?.fields) {
      const dbFields = overrideRow.fields as unknown as Record<string, FieldConfig>
      const merged = { ...staticFields }
      for (const [key, val] of Object.entries(dbFields)) {
        merged[key] = { ...merged[key], ...val }
      }

      return NextResponse.json(
        { ...overrideRow, fields: merged },
        { headers: CACHE_HEADERS }
      )
    }

    // No override — return static fields
    return NextResponse.json(
      {
        category: canonicalCategory,
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
