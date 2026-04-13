import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { getAllCategories, type CategoryRow } from '@/lib/category-db'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface BatchRequest {
  categoryValues: string[]
  platform: string
}

interface BatchResultItem {
  categoryValue: string
  categoryLabel: string
  topLevel: string
  suggestion: {
    id: string
    name: string
    path: string
    is_leaf: boolean
    confidence: 'high' | 'medium' | 'low'
  } | null
  reasoning: string
  error?: string
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const VALID_PLATFORMS = ['vinted', 'ebay', 'shopify', 'depop', 'etsy']
const MAX_BATCH_SIZE = 20

/** Resolve a canonical category value to its label and top-level key from pre-loaded rows */
function resolveCategory(
  allCategories: CategoryRow[],
  value: string,
): { label: string; topLevel: string } | null {
  const row = allCategories.find((c) => c.value === value)
  if (!row) return null
  return { label: row.label, topLevel: row.top_level }
}

/**
 * POST /api/admin/categories/ai-match-batch
 * Batch AI-match: resolves category details from the tree, then calls the
 * single ai-match logic for each. Max 20 per request.
 *
 * Body: { categoryValues: string[], platform: string }
 * Returns: { results: BatchResultItem[] }
 */
export const POST = withAdminAuth(async (req, user) => {
  const { success } = await checkRateLimit(`ai-match-batch:${user.id}`, 5)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  let body: BatchRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { categoryValues, platform } = body

  if (!Array.isArray(categoryValues) || categoryValues.length === 0) {
    return NextResponse.json({ error: 'categoryValues must be a non-empty array' }, { status: 400 })
  }
  if (categoryValues.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Max ${MAX_BATCH_SIZE} categories per batch request` },
      { status: 400 }
    )
  }
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
      { status: 400 }
    )
  }

  // Load categories from DB once for the batch
  const allCategories = await getAllCategories()

  // Build the internal URL for the single ai-match endpoint
  const origin = req.nextUrl.origin

  const results: BatchResultItem[] = []

  // Process sequentially to avoid hammering OpenAI rate limits
  for (const categoryValue of categoryValues) {
    const resolved = resolveCategory(allCategories, categoryValue)
    if (!resolved) {
      results.push({
        categoryValue,
        categoryLabel: '',
        topLevel: '',
        suggestion: null,
        reasoning: '',
        error: `Category "${categoryValue}" not found in CATEGORY_TREE`,
      })
      continue
    }

    try {
      const response = await fetch(`${origin}/api/admin/categories/ai-match`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Forward auth headers so withAdminAuth passes
          'Cookie': req.headers.get('cookie') ?? '',
          'Authorization': req.headers.get('authorization') ?? '',
        },
        body: JSON.stringify({
          categoryLabel: resolved.label,
          categoryValue,
          topLevel: resolved.topLevel,
          platform,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
        results.push({
          categoryValue,
          categoryLabel: resolved.label,
          topLevel: resolved.topLevel,
          suggestion: null,
          reasoning: '',
          error: (errData as { error?: string }).error ?? `HTTP ${response.status}`,
        })
        continue
      }

      const data = await response.json() as {
        suggestion: BatchResultItem['suggestion']
        reasoning: string
      }
      results.push({
        categoryValue,
        categoryLabel: resolved.label,
        topLevel: resolved.topLevel,
        suggestion: data.suggestion,
        reasoning: data.reasoning,
      })
    } catch (error) {
      results.push({
        categoryValue,
        categoryLabel: resolved.label,
        topLevel: resolved.topLevel,
        suggestion: null,
        reasoning: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({ results })
})
