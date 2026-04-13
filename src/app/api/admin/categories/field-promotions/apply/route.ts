import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/with-auth'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface FieldDef {
  name: string
  type?: string
  required?: boolean
}

/**
 * POST /api/admin/categories/field-promotions/apply
 *
 * Merge new fields from a marketplace_category_config override
 * into the canonical category_field_requirements row.
 *
 * Body: { category, platform }
 */
export const POST = withAdminAuth(async (req) => {
  const body = await req.json()
  const { category, platform } = body as { category?: string; platform?: string }

  if (!category || !platform) {
    return NextResponse.json(
      { error: 'category and platform are required' },
      { status: 400 }
    )
  }

  const supabase = getServiceClient()

  // 1. Read the override from marketplace_category_config
  const { data: override, error: overrideErr } = await supabase
    .from('marketplace_category_config')
    .select('fields')
    .eq('category_value', category)
    .eq('platform', platform)
    .in('source', ['vinted_api', 'ebay_api'])
    .single()

  if (overrideErr || !override) {
    return NextResponse.json(
      { error: 'No API-sourced override found for this category+platform' },
      { status: 404 }
    )
  }

  const overrideFields = (override.fields ?? []) as FieldDef[]

  // 2. Read existing canonical fields
  const { data: canonical } = await supabase
    .from('category_field_requirements')
    .select('fields')
    .eq('category_value', category)
    .eq('platform', platform)
    .single()

  const existingFields = (canonical?.fields ?? []) as FieldDef[]
  const existingNames = new Set(existingFields.map((f) => f.name))

  // 3. Merge: add new fields, update required flags for existing
  const merged = [...existingFields]
  for (const field of overrideFields) {
    if (!existingNames.has(field.name)) {
      merged.push({
        name: field.name,
        type: field.type,
        required: field.required,
      })
    } else if (field.required) {
      // Promote required flag if override says it's required
      const existing = merged.find((f) => f.name === field.name)
      if (existing && !existing.required) {
        existing.required = true
      }
    }
  }

  // 4. Upsert into category_field_requirements
  const { data, error } = await supabase
    .from('category_field_requirements')
    .upsert(
      {
        category_value: category,
        platform,
        fields: merged,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'category_value,platform' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    applied: true,
    fieldCount: merged.length,
    newFieldsAdded: merged.length - existingFields.length,
    data,
  })
})
