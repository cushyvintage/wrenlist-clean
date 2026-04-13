import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { getAdminClient } from '@/lib/supabase-admin'

interface FieldDef {
  name: string
  type?: string
  required?: boolean
}

interface Promotion {
  category: string
  platform: string
  newFields: FieldDef[]
  source: string
  discoveredAt: string
}

/**
 * GET /api/admin/categories/field-promotions
 *
 * Find fields discovered by extension APIs (vinted_api, ebay_api) that
 * don't yet exist in canonical category_field_requirements.
 */
export const GET = withAdminAuth(async () => {
  const supabase = getAdminClient()

  // 1. Fetch config overrides from extension API sources
  const { data: overrides, error: overrideErr } = await supabase
    .from('marketplace_category_config')
    .select('category_value, platform, fields, source, updated_at')
    .in('source', ['vinted_api', 'ebay_api'])

  if (overrideErr) {
    return NextResponse.json({ error: overrideErr.message }, { status: 500 })
  }

  if (!overrides || overrides.length === 0) {
    return NextResponse.json({ promotions: [] })
  }

  // 2. Fetch canonical field requirements for matching category+platform combos
  const keys = overrides.map((o) => `${o.category_value}::${o.platform}`)
  const categoryValues = [...new Set(overrides.map((o) => o.category_value))]
  const platforms = [...new Set(overrides.map((o) => o.platform))]

  const { data: canonicalRows, error: canonErr } = await supabase
    .from('category_field_requirements')
    .select('category_value, platform, fields')
    .in('category_value', categoryValues)
    .in('platform', platforms)

  if (canonErr) {
    return NextResponse.json({ error: canonErr.message }, { status: 500 })
  }

  // Build lookup: "category::platform" -> Set of field names
  const canonicalFieldNames: Record<string, Set<string>> = {}
  for (const row of canonicalRows ?? []) {
    const key = `${row.category_value}::${row.platform}`
    const fields = (row.fields ?? []) as FieldDef[]
    canonicalFieldNames[key] = new Set(fields.map((f) => f.name))
  }

  // 3. Compare: find fields in overrides that are NOT in canonical
  const promotions: Promotion[] = []

  for (const override of overrides) {
    const key = `${override.category_value}::${override.platform}`
    const canonNames = canonicalFieldNames[key] ?? new Set<string>()
    const overrideFields = (override.fields ?? []) as FieldDef[]

    const newFields = overrideFields.filter((f) => !canonNames.has(f.name))

    if (newFields.length > 0) {
      promotions.push({
        category: override.category_value,
        platform: override.platform,
        newFields: newFields.map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
        })),
        source: override.source,
        discoveredAt: override.updated_at,
      })
    }
  }

  return NextResponse.json({ promotions })
})
