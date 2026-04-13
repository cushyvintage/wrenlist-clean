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
 * GET /api/admin/categories
 * List categories with optional filters: ?top_level=X&search=Y&unmapped=platform
 */
export const GET = withAdminAuth(async (req) => {
  const params = req.nextUrl.searchParams
  const topLevel = params.get('top_level')
  const search = params.get('search')
  const unmapped = params.get('unmapped') // platform name — filter to categories missing this platform

  const supabase = getServiceClient()
  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order')

  if (topLevel) {
    query = query.eq('top_level', topLevel)
  }

  if (search) {
    query = query.or(`label.ilike.%${search}%,value.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Post-filter for unmapped platform (jsonb path filter is complex, easier in JS)
  let results = data ?? []
  if (unmapped) {
    results = results.filter((cat) => {
      const platforms = cat.platforms as Record<string, unknown>
      return !platforms[unmapped]
    })
  }

  return NextResponse.json({ data: results, count: results.length })
})

/**
 * POST /api/admin/categories
 * Create a new category
 */
export const POST = withAdminAuth(async (req) => {
  const body = await req.json()
  const { value, label, top_level, parent_group, platforms, sort_order } = body

  if (!value || !label || !top_level) {
    return NextResponse.json(
      { error: 'value, label, and top_level are required' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('categories')
    .insert({
      value: value.toLowerCase(),
      label,
      top_level: top_level.toLowerCase(),
      parent_group: parent_group || null,
      platforms: platforms || {},
      sort_order: sort_order ?? 0,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `Category '${value}' already exists` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
})

/**
 * PATCH /api/admin/categories
 * Update a category. Body must include { value } to identify the row.
 */
export const PATCH = withAdminAuth(async (req) => {
  const body = await req.json()
  const { value, ...updates } = body

  if (!value) {
    return NextResponse.json({ error: 'value is required to identify the category' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('categories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('value', value)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: `Category '${value}' not found` }, { status: 404 })
  }

  return NextResponse.json(data)
})

/**
 * DELETE /api/admin/categories
 * Delete a category. Body: { value }
 * Cascades to category_field_requirements via FK.
 */
export const DELETE = withAdminAuth(async (req) => {
  const body = await req.json()
  const { value } = body

  if (!value) {
    return NextResponse.json({ error: 'value is required' }, { status: 400 })
  }

  const supabase = getServiceClient()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('value', value)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: value })
})
