import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { loadTaxonomy } from '@/lib/ai-category-match'

/**
 * GET /api/admin/categories/taxonomy-search?platform=vinted&q=brass
 * Search a platform's taxonomy tree. Returns top 30 matches.
 */
export const GET = withAdminAuth(async (req) => {
  const params = req.nextUrl.searchParams
  const platform = params.get('platform')
  const query = params.get('q')?.toLowerCase().trim()

  if (!platform) {
    return NextResponse.json({ error: 'platform is required' }, { status: 400 })
  }
  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'q must be at least 2 characters' }, { status: 400 })
  }

  const taxonomy = loadTaxonomy(platform)
  if (!taxonomy.length) {
    return NextResponse.json({ error: `No taxonomy data for ${platform}` }, { status: 404 })
  }

  // Score and rank matches
  const scored = taxonomy
    .map((item) => {
      const nameLower = item.name.toLowerCase()
      const pathLower = item.path.toLowerCase()
      let score = 0
      if (nameLower === query) score = 100 // exact name match
      else if (nameLower.startsWith(query)) score = 80
      else if (nameLower.includes(query)) score = 60
      else if (pathLower.includes(query)) score = 30
      else if (item.id.toLowerCase().includes(query)) score = 20
      // Boost leaf nodes
      if (score > 0 && item.is_leaf) score += 10
      return { ...item, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 30)

  return NextResponse.json({
    platform,
    query,
    total: taxonomy.length,
    results: scored.map(({ score, ...rest }) => rest),
  })
})
