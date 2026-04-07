import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import brandsData from '@/data/brands.json'

const brands = brandsData as string[]

/**
 * GET /api/brands?q=burb&limit=10
 * Searchable brand typeahead — returns matching brand names.
 * Uses substring match (case-insensitive), sorted by relevance (starts-with first).
 */
export const GET = withAuth(async (req: NextRequest) => {
  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() ?? ''
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '10'), 50)

  if (!q || q.length < 2) {
    return NextResponse.json({ brands: [] })
  }

  // Partition: starts-with matches first, then contains matches
  const startsWith: string[] = []
  const contains: string[] = []

  for (const name of brands) {
    const lower = name.toLowerCase()
    if (lower.startsWith(q)) {
      startsWith.push(name)
    } else if (lower.includes(q)) {
      contains.push(name)
    }
    if (startsWith.length + contains.length >= limit * 2) break
  }

  const results = [...startsWith, ...contains].slice(0, limit)
  return NextResponse.json({ brands: results })
})
