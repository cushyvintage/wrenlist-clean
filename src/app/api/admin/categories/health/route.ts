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
interface VintedCatNode { id: number; is_leaf?: boolean; children?: VintedCatNode[] }

let vintedLeafIds: Set<string> | null = null
function getVintedLeafIds(): Set<string> {
  if (vintedLeafIds) return vintedLeafIds
  const data: VintedCatNode[] = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/data/marketplace/vinted-categories.json'), 'utf-8')
  )
  const ids = new Set<string>()
  function walk(nodes: VintedCatNode[]) {
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
  type: 'missing_mapping' | 'non_leaf' | 'missing_required_fields' | 'no_field_requirements' | 'low_success_rate'
  platform: string
  detail: string
}

type Priority = 'critical' | 'high' | 'medium' | 'low'

type HealthResult = {
  value: string
  label: string
  top_level: string
  issues: Issue[]
  score: number // 0-100, higher = healthier
  usage_count: number
  priority?: Priority
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

  // Fetch usage counts per category (aggregated to avoid fetching all rows)
  let usageRows: Array<{ category: string; count: number }> | null = null
  try {
    const { data } = await supabase.rpc('get_category_usage_counts')
    usageRows = data as Array<{ category: string; count: number }> | null
  } catch { /* RPC may not exist yet — fallback below */ }
  const usageMap: Record<string, number> = {}
  // Fallback: if RPC doesn't exist yet, fetch distinct categories with counts
  if (!usageRows) {
    const { data: fallbackRows } = await supabase
      .from('finds')
      .select('category')
      .not('category', 'is', null)
      .limit(5000)
    for (const row of fallbackRows ?? []) {
      if (row.category) usageMap[row.category] = (usageMap[row.category] ?? 0) + 1
    }
  } else {
    for (const row of usageRows) {
      usageMap[row.category] = row.count
    }
  }

  // Fetch field requirements
  const { data: fieldReqs } = await supabase
    .from('category_field_requirements')
    .select('category_value, platform, fields')

  // Build field req lookup: category_value -> { platform -> fields[] }
  const fieldMap: Record<string, Record<string, Array<{ required?: boolean; name?: string }>>> = {}
  for (const row of fieldReqs ?? []) {
    if (!fieldMap[row.category_value]) fieldMap[row.category_value] = {}
    fieldMap[row.category_value]![row.platform] = row.fields ?? []
  }

  // Fetch publish outcomes for success-rate checking (bounded to last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: outcomeRows } = await supabase
    .from('category_publish_outcomes')
    .select('category_value, platform, outcome, error_message')
    .gte('created_at', ninetyDaysAgo)
    .limit(10000)

  // Aggregate outcomes: category_value -> platform -> { success, failure, total, last_error }
  const outcomeMap: Record<string, Record<string, { success: number; failure: number; total: number; last_error: string | null }>> = {}
  for (const row of outcomeRows ?? []) {
    if (!outcomeMap[row.category_value]) outcomeMap[row.category_value] = {}
    const pm = outcomeMap[row.category_value]!
    if (!pm[row.platform]) pm[row.platform] = { success: 0, failure: 0, total: 0, last_error: null }
    const g = pm[row.platform]!
    g.total++
    if (row.outcome === 'success') g.success++
    else {
      g.failure++
      if (row.error_message) g.last_error = row.error_message
    }
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
      // Check eBay: mapping exists but no field requirements
      if (platforms.ebay?.id && !catFields.ebay?.length) {
        issues.push({
          type: 'missing_required_fields',
          platform: 'ebay',
          detail: 'eBay mapping exists but no field requirements defined',
        })
      }
      // Check Vinted: only flag missing required fields for categories that genuinely need them.
      // books_media → should have ISBN/Language; clothing → should have size.
      // All other categories → zero required Vinted fields is normal, don't flag.
      if (platforms.vinted?.id) {
        const vintedExpectsRequired =
          cat.top_level === 'books_media' || cat.top_level === 'clothing'
        if (vintedExpectsRequired) {
          const vintedFields = catFields.vinted as Array<{ required?: boolean; name?: string }> | undefined
          if (!vintedFields?.length) {
            issues.push({
              type: 'missing_required_fields',
              platform: 'vinted',
              detail: `Vinted mapping exists but no field requirements defined (expected for ${cat.top_level})`,
            })
          } else {
            const vintedRequired = vintedFields.filter((f) => f.required)
            if (vintedRequired.length === 0) {
              issues.push({
                type: 'missing_required_fields',
                platform: 'vinted',
                detail: `Vinted mapping exists but no required fields (expected for ${cat.top_level})`,
              })
            }
          }
        }
      }
    }

    // Check: low publish success rate (>= 5 attempts, < 80% success)
    const catOutcomes = outcomeMap[cat.value]
    if (catOutcomes) {
      for (const platform of PUBLISH_PLATFORMS) {
        const stats = catOutcomes[platform]
        if (stats && stats.total >= 5) {
          const rate = Math.round((stats.success / stats.total) * 100)
          if (rate < 80) {
            issues.push({
              type: 'low_success_rate',
              platform,
              detail: `${rate}% success rate (${stats.success}/${stats.total})${stats.last_error ? ` — last error: ${stats.last_error}` : ''}`,
            })
          }
        }
      }
    }

    // Score: weighted penalties — missing mappings are critical, missing fields are minor
    let penalty = 0
    for (const issue of issues) {
      if (issue.type === 'missing_mapping') penalty += 25
      else if (issue.type === 'non_leaf') penalty += 15
      else if (issue.type === 'no_field_requirements') penalty += 10
      else if (issue.type === 'missing_required_fields') penalty += 5
      else if (issue.type === 'low_success_rate') penalty += 20
    }
    const score = Math.max(0, 100 - penalty)

    const usage_count = usageMap[cat.value] ?? 0

    // Assign priority based on usage + issues
    let priority: Priority | undefined
    if (issues.length > 0) {
      if (usage_count >= 10) priority = 'critical'
      else if (usage_count >= 3) priority = 'high'
      else if (usage_count >= 1) priority = 'medium'
      else priority = 'low'
    }

    if (!issuesOnly || issues.length > 0) {
      results.push({
        value: cat.value,
        label: cat.label,
        top_level: cat.top_level,
        issues,
        score,
        usage_count,
        priority,
      })
    }
  }

  // Sort: critical first (by usage desc), then high, medium, low
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  results.sort((a, b) => {
    const pa = a.priority ? (priorityOrder[a.priority] ?? 4) : 4
    const pb = b.priority ? (priorityOrder[b.priority] ?? 4) : 4
    if (pa !== pb) return pa - pb
    return b.usage_count - a.usage_count
  })

  // Summary stats
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0)
  const withIssuesCount = results.filter((r) => r.issues.length > 0).length
  const totalCategories = categories?.length ?? 0
  const healthyCount = totalCategories - withIssuesCount
  const issuesByType: Record<string, number> = {}
  for (const r of results) {
    for (const issue of r.issues) {
      issuesByType[issue.type] = (issuesByType[issue.type] ?? 0) + 1
    }
  }

  // Priority breakdown
  const criticalIssues = results.filter((r) => r.priority === 'critical').length
  const highPriorityIssues = results.filter((r) => r.priority === 'high').length
  const unusedWithIssues = results.filter((r) => r.priority === 'low').length
  const totalUsedCategories = new Set(Object.keys(usageMap)).size

  return NextResponse.json({
    total: categories?.length ?? 0,
    healthy: healthyCount,
    withIssues: withIssuesCount,
    totalIssues,
    issuesByType,
    criticalIssues,
    highPriorityIssues,
    unusedWithIssues,
    totalUsedCategories,
    categories: issuesOnly ? results.filter((r) => r.issues.length > 0) : results,
  })
})
