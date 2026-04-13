import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { getAdminClient } from '@/lib/supabase-admin'

/**
 * GET /api/admin/categories/[value]/fields
 * Get all field requirements for a category across all platforms.
 * Optional: ?platform=ebay to filter to one platform.
 */
export const GET = withAdminAuth(async (req, _user, params) => {
  const value = params?.value
  if (!value) {
    return NextResponse.json({ error: 'category value is required' }, { status: 400 })
  }

  const platform = req.nextUrl.searchParams.get('platform')
  const supabase = getAdminClient()

  let query = supabase
    .from('category_field_requirements')
    .select('*')
    .eq('category_value', value)

  if (platform) {
    query = query.eq('platform', platform)
  }

  const { data, error } = await query.order('platform')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: data ?? [] })
})

/**
 * PUT /api/admin/categories/[value]/fields
 * Upsert field requirements for a category × platform.
 * Body: { platform, fields: [...] }
 */
export const PUT = withAdminAuth(async (req, _user, params) => {
  const value = params?.value
  if (!value) {
    return NextResponse.json({ error: 'category value is required' }, { status: 400 })
  }

  const body = await req.json()
  const { platform, fields } = body

  if (!platform || !Array.isArray(fields)) {
    return NextResponse.json({ error: 'platform and fields[] are required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('category_field_requirements')
    .upsert(
      {
        category_value: value,
        platform,
        fields,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'category_value,platform' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
})

/**
 * DELETE /api/admin/categories/[value]/fields
 * Delete field requirements for a category × platform.
 * Body: { platform }
 */
export const DELETE = withAdminAuth(async (req, _user, params) => {
  const value = params?.value
  if (!value) {
    return NextResponse.json({ error: 'category value is required' }, { status: 400 })
  }

  const body = await req.json()
  const { platform } = body

  if (!platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 })
  }

  const supabase = getAdminClient()
  const { error } = await supabase
    .from('category_field_requirements')
    .delete()
    .eq('category_value', value)
    .eq('platform', platform)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: { category: value, platform } })
})
