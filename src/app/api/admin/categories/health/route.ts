import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withAdminAuth } from '@/lib/with-auth'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Load Vinted leaf set (cached in memory)
let vintedLeafIds: Set<string> | null = null
function getVintedLeafIds(): Set<string> {
  if (vintedLeafIds) return vintedLeafIds
  const data = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/data/marketplace/vinted-categories.json'), 'utf-8')
  )
  const ids = new Set<string>()
  function walk(nodes: any[]) {
    for (const n of nodes) {
      if (n.is_leaf || !n.children?.length) ids.add(String(n.id))
      if (n.children?.length) walk(n.children)
    }
  }
  walk(data)
  vintedLeafIds = ids
  return ids
}

type Issue = {
  type: 'missing_mapping' | 'non_leaf' | 'missing_required_fields' | 'no_field_requirements'
  platform: string
  detail: string
}

type HealthResult = {
  value: string
  label: string
  top_level: string
  issues: Issue[]
  score: number // 0-100, higher = healthier
}

const PUBLISH_PLATFORMS = ['ebay', 'vinted', 'shopify', 'depop'] as const

/**
 * GET /api/admin/categories/health
 * Returns publish-readiness health check for all categories.
 * Optional: ?top_level=X, ?issues_only=true
 */
export const GET = withAdminAuth(async (req) => {
  const params = req.nextUrl.searchParams
  const topLevel = params.get('top_level')
  const issuesOnly = params.get('issues_only') === 'true'

  const supabase = getServiceClient()
  const leafIds = getVintedLeafIds()

  // Fetch categories
  let catQuery = supabase.from('categories').select('value, label, top_level, platforms').order('sort_order')
  if (topLevel) catQuery = catQuery.eq('top_level', topLevel)
  const { data: categories, error: catErr } = await catQuery
  if (catErr) return NextResponse.json({ error: catErr.message }, { status: 500 })

  // Fetch field requirements
  const { data: fieldReqs } = await supabase
    .from('category_field_requirements')
    .select('category_value, platform, fields')

  // Build field req lookup: category_value -> { platform -> fields[] }
  const fieldMap: Record<string, Record<string, any[]>> = {}
  for (const row of fieldReqs ?? []) {
    if (!fieldMap[row.category_value]) fieldMap[row.category_value] = {}
    fieldMap[row.category_value]![row.platform] = row.fields ?? []
  }

  const results: HealthResult[] = []

  for (const cat of categories ?? []) {
    const platforms = (cat.platforms ?? {}) as Record<string, { id?: string; name?: string }>
    const issues: Issue[] = []

    for (const platform of PUBLISH_PLATFORMS) {
      const mapping = platforms[platform]

      // Check: missing mapping
      if (!mapping?.id) {
        issues.push({
          type: 'missing_mapping',
          platform,
          detail: `No ${platform} category ID mapped`,
        })
        continue
      }

      // Check: non-leaf Vinted
      if (platform === 'vinted' && !leafIds.has(mapping.id)) {
        issues.push({
          type: 'non_leaf',
          platform: 'vinted',
          detail: `Vinted ID ${mapping.id} is not a leaf node`,
        })
      }

      // Check: Depop 2-segment (non-leaf)
      if (platform === 'depop') {
        const pipeCount = (mapping.id.match(/\|/g) ?? []).length
        if (pipeCount === 1) {
          issues.push({
            type: 'non_leaf',
            platform: 'depop',
            detail: `Depop ID "${mapping.id}" is a group, not a product type`,
          })
        }
      }
    }

    // Check: field requirements
    const catFields = fieldMap[cat.value]
    if (!catFields || Object.keys(catFields).length === 0) {
      issues.push({
        type: 'no_field_requirements',
        platform: 'all',
        detail: 'No field requirements defined for any platform',
      })
    } else {
      // Check if eBay has required fields defined (most categories should)
      if (platforms.ebay?.id && !catFields.ebay?.length) {
        issues.push({
          type: 'missing_required_fields',
          platform: 'ebay',
          detail: 'eBay mapping exists but no field requirements defined',
        })
      }
    }

    // Score: 100 minus penalties
    const score = Math.max(0, 100 - issues.length * 20)

    if (!issuesOnly || issues.length > 0) {
      results.push({
        value: cat.value,
        label: cat.label,
        top_level: cat.top_level,
        issues,
        score,
      })
    }
  }

  // Summary stats
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0)
  const healthyCount = results.filter((r) => r.issues.length === 0).length
  const issuesByType: Record<string, number> = {}
  for (const r of results) {
    for (const issue of r.issues) {
      issuesByType[issue.type] = (issuesByType[issue.type] ?? 0) + 1
    }
  }

  return NextResponse.json({
    total: categories?.length ?? 0,
    healthy: healthyCount,
    withIssues: results.filter((r) => r.issues.length > 0).length,
    totalIssues,
    issuesByType,
    categories: issuesOnly ? results.filter((r) => r.issues.length > 0) : results,
  })
})
