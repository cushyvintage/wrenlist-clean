import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { loadTaxonomy, preFilterCandidates, callOpenAI } from '@/lib/ai-category-match'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface AiMatchRequest {
  categoryLabel: string
  categoryValue: string
  topLevel: string
  platform: string
}

// ------------------------------------------------------------------
// Route handler
// ------------------------------------------------------------------

const VALID_PLATFORMS = ['vinted', 'ebay', 'shopify', 'depop', 'etsy']

/**
 * POST /api/admin/categories/ai-match
 * Uses AI to match a Wrenlist canonical category to the best platform category.
 */
export const POST = withAdminAuth(async (req, user) => {
  const { success } = await checkRateLimit(`ai-match:${user.id}`, 30)
  if (!success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'AI features not configured' }, { status: 503 })
  }

  let body: AiMatchRequest
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { categoryLabel, categoryValue, topLevel, platform } = body

  if (!categoryLabel || !categoryValue || !topLevel || !platform) {
    return NextResponse.json(
      { error: 'categoryLabel, categoryValue, topLevel, and platform are required' },
      { status: 400 }
    )
  }

  if (!VALID_PLATFORMS.includes(platform)) {
    return NextResponse.json(
      { error: `Invalid platform. Must be one of: ${VALID_PLATFORMS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const taxonomy = loadTaxonomy(platform)
    if (!taxonomy.length) {
      return NextResponse.json({ error: `No taxonomy data for ${platform}` }, { status: 404 })
    }

    // Pre-filter to top 50 candidates
    const candidates = preFilterCandidates(taxonomy, categoryLabel, topLevel, 50)

    if (candidates.length === 0) {
      return NextResponse.json({
        suggestion: null,
        reasoning: `No text-based candidates found in ${platform} taxonomy for "${categoryLabel}"`,
      })
    }

    const result = await callOpenAI(categoryLabel, categoryValue, topLevel, platform, candidates)
    return NextResponse.json(result)
  } catch (error) {
    console.error('AI match error:', error)
    const message = error instanceof Error ? error.message : 'AI match failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
