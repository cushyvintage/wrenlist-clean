import { readFileSync } from 'fs'
import { resolve } from 'path'
import { modelFor } from '@/lib/ai/router'

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export interface TaxonomyItem {
  id: string
  name: string
  path: string
  is_leaf: boolean
}

export interface AiMatchSuggestion {
  id: string
  name: string
  path: string
  is_leaf: boolean
  confidence: 'high' | 'medium' | 'low'
}

export interface AiMatchResponse {
  suggestion: AiMatchSuggestion | null
  reasoning: string
}

// ------------------------------------------------------------------
// Platform taxonomy loaders (mirrors taxonomy-search logic)
// ------------------------------------------------------------------

const taxonomyCache: Record<string, TaxonomyItem[]> = {}

export function loadTaxonomy(platform: string): TaxonomyItem[] {
  if (taxonomyCache[platform]) return taxonomyCache[platform]!

  const base = resolve(process.cwd(), 'src/data/marketplace')
  let results: TaxonomyItem[] = []

  switch (platform) {
    case 'vinted': {
      const data = JSON.parse(readFileSync(resolve(base, 'vinted-categories.json'), 'utf-8'))
      function walkVinted(nodes: Record<string, unknown>[]) {
        for (const node of nodes) {
          results.push({
            id: String(node.id),
            name: (node.name as string) ?? '',
            path: (node.full_path as string) ?? '',
            is_leaf: (node.is_leaf as boolean) ?? !(node.children as unknown[])?.length,
          })
          if ((node.children as unknown[])?.length) walkVinted(node.children as Record<string, unknown>[])
        }
      }
      walkVinted(data)
      break
    }
    case 'ebay': {
      const data = JSON.parse(readFileSync(resolve(base, 'ebay-uk-categories.json'), 'utf-8'))
      const topLevel = (data.topLevel ?? {}) as Record<string, Record<string, unknown>>
      for (const [topName, topData] of Object.entries(topLevel)) {
        const topId = String(topData.id ?? '')
        results.push({ id: topId, name: topName, path: topName, is_leaf: false })
        for (const child of (topData.children as Record<string, unknown>[]) ?? []) {
          const childId = String(child.id ?? '')
          const childName = (child.name as string) ?? ''
          results.push({
            id: childId,
            name: childName,
            path: `${topName} > ${childName}`,
            is_leaf: (child.leafCount as number ?? 0) === 0 || !(child.children as unknown[])?.length,
          })
        }
      }
      break
    }
    case 'shopify': {
      const data = JSON.parse(readFileSync(resolve(base, 'shopify-categories.json'), 'utf-8'))
      for (const vert of (data.verticals ?? []) as Record<string, unknown>[]) {
        for (const cat of ((vert.categories ?? []) as Record<string, unknown>[])) {
          results.push({
            id: (cat.id as string) ?? '',
            name: (cat.name as string) ?? '',
            path: (cat.full_name as string) ?? (cat.name as string) ?? '',
            is_leaf: !(cat.children as unknown[])?.length,
          })
        }
      }
      break
    }
    case 'depop': {
      const data = JSON.parse(readFileSync(resolve(base, 'depop-categories.json'), 'utf-8'))
      for (const group of (data.groups ?? []) as Record<string, unknown>[]) {
        const dept = (group.department as string) ?? ''
        const gname = (group.group as string) ?? (group.name as string) ?? ''
        const ptypes = (group.productTypes ?? group.product_types ?? []) as (string | Record<string, unknown>)[]
        results.push({
          id: `${dept}|${gname}`.toLowerCase(),
          name: gname,
          path: `${dept} > ${gname}`,
          is_leaf: ptypes.length === 0,
        })
        for (const pt of ptypes) {
          const ptName = typeof pt === 'string' ? pt : ((pt.name as string) ?? (pt.slug as string) ?? '')
          results.push({
            id: `${dept}|${gname}|${ptName}`.toLowerCase(),
            name: ptName,
            path: `${dept} > ${gname} > ${ptName}`,
            is_leaf: true,
          })
        }
      }
      break
    }
    case 'etsy': {
      const data = JSON.parse(readFileSync(resolve(base, 'etsy-categories.json'), 'utf-8'))
      for (const cat of (data.categories ?? []) as Record<string, unknown>[]) {
        const catName = (cat.name as string) ?? ''
        const catId = cat.taxonomy_id ? String(cat.taxonomy_id) : catName.toLowerCase()
        const children = (cat.children ?? cat.subcategories ?? []) as Record<string, unknown>[]
        results.push({ id: catId, name: catName, path: catName, is_leaf: children.length === 0 })
        for (const sub of children) {
          const subName = (sub.name as string) ?? ''
          const subId = sub.taxonomy_id ? String(sub.taxonomy_id) : `${catName.toLowerCase()}/${subName.toLowerCase()}`
          results.push({ id: subId, name: subName, path: `${catName} > ${subName}`, is_leaf: true })
        }
      }
      break
    }
    default:
      return []
  }

  taxonomyCache[platform] = results
  return results
}

// ------------------------------------------------------------------
// Pre-filter: find the most relevant candidates via text scoring
// ------------------------------------------------------------------

export function preFilterCandidates(
  taxonomy: TaxonomyItem[],
  categoryLabel: string,
  topLevel: string,
  limit: number = 50
): TaxonomyItem[] {
  const labelLower = categoryLabel.toLowerCase()
  // Extract keywords (split on spaces, remove very short words)
  const keywords = labelLower
    .replace(/[&,/()-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)

  const scored = taxonomy.map((item) => {
    const nameLower = item.name.toLowerCase()
    const pathLower = item.path.toLowerCase()
    let score = 0

    // Exact name match
    if (nameLower === labelLower) score += 100
    // Name starts with query
    else if (nameLower.startsWith(labelLower)) score += 80
    // Name contains full query
    else if (nameLower.includes(labelLower)) score += 60
    // Path contains full query
    else if (pathLower.includes(labelLower)) score += 40

    // Keyword matching
    for (const kw of keywords) {
      if (nameLower.includes(kw)) score += 15
      else if (pathLower.includes(kw)) score += 8
    }

    // Top-level keyword boost (e.g. "antique" for antiques top level)
    const topKw = topLevel.replace(/_/g, ' ').toLowerCase()
    if (pathLower.includes(topKw)) score += 10

    // Leaf node boost
    if (score > 0 && item.is_leaf) score += 5

    return { item, score }
  })

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.item)
}

// ------------------------------------------------------------------
// OpenAI call
// ------------------------------------------------------------------

export async function callOpenAI(
  categoryLabel: string,
  categoryValue: string,
  topLevel: string,
  platform: string,
  candidates: TaxonomyItem[]
): Promise<AiMatchResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const candidateList = candidates
    .map((c, i) => `${i + 1}. ID: "${c.id}" | Name: "${c.name}" | Path: "${c.path}" | Leaf: ${c.is_leaf}`)
    .join('\n')

  const systemPrompt = `You are an expert at matching product categories across e-commerce marketplaces.
Given a Wrenlist canonical category, pick the BEST match from the ${platform} taxonomy candidates below.

Rules:
- Prefer leaf categories (is_leaf=true) over parent categories
- Consider semantic meaning, not just keyword overlap
- "Antique books & incunabulas" should match a Books/Antiquarian category, not just any book category
- If no candidate is a good match, say so and set confidence to "low"
- Return EXACTLY one JSON object`

  const userPrompt = `Wrenlist category to match:
- Label: "${categoryLabel}"
- Value: "${categoryValue}"
- Top-level: "${topLevel}"

Target platform: ${platform}

Candidate ${platform} categories (ranked by text similarity, best first):
${candidateList}

Respond with ONLY a JSON object:
{
  "matched_index": <1-based index from list above, or null if no good match>,
  "confidence": "high" | "medium" | "low",
  "reasoning": "<1-2 sentence explanation>"
}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelFor('category_match'),
      max_tokens: 200,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${errText}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
  }
  const raw = data.choices[0]?.message?.content?.trim() ?? ''

  // Parse JSON from response (strip markdown fences if present)
  const jsonStr = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()
  let parsed: { matched_index: number | null; confidence: string; reasoning: string }
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    return { suggestion: null, reasoning: `Failed to parse AI response: ${raw.slice(0, 200)}` }
  }

  const confidence = (['high', 'medium', 'low'].includes(parsed.confidence)
    ? parsed.confidence
    : 'low') as 'high' | 'medium' | 'low'

  if (parsed.matched_index == null || parsed.matched_index < 1 || parsed.matched_index > candidates.length) {
    return { suggestion: null, reasoning: parsed.reasoning ?? 'No suitable match found' }
  }

  const matched = candidates[parsed.matched_index - 1]!
  return {
    suggestion: {
      id: matched.id,
      name: matched.name,
      path: matched.path,
      is_leaf: matched.is_leaf,
      confidence,
    },
    reasoning: parsed.reasoning ?? '',
  }
}
