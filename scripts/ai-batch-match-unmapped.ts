/**
 * One-time script: AI-match all unmapped categories across platforms.
 * Uses GPT-4o-mini to suggest best matches from platform taxonomies.
 * Saves suggestions to the categories table.
 *
 * Run: npx tsx scripts/ai-batch-match-unmapped.ts
 * Optional: npx tsx scripts/ai-batch-match-unmapped.ts --platform vinted --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'
import { createHash } from 'crypto'

config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

// Parse args
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const platformFilter = args.includes('--platform') ? args[args.indexOf('--platform') + 1] : null
const PLATFORMS = platformFilter ? [platformFilter] : ['vinted', 'shopify', 'depop', 'ebay']

// Load taxonomy data (same as taxonomy-search route)
interface TaxItem { id: string; name: string; path: string; is_leaf: boolean }

function loadTaxonomy(platform: string): TaxItem[] {
  const base = resolve(__dirname, '../src/data/marketplace')
  switch (platform) {
    case 'vinted': {
      const data = JSON.parse(readFileSync(resolve(base, 'vinted-categories.json'), 'utf-8'))
      const items: TaxItem[] = []
      function walkV(nodes: any[]) {
        for (const n of nodes) {
          items.push({ id: String(n.id), name: n.name ?? '', path: n.full_path ?? '', is_leaf: n.is_leaf ?? !n.children?.length })
          if (n.children?.length) walkV(n.children)
        }
      }
      walkV(data)
      return items
    }
    case 'ebay': {
      const data = JSON.parse(readFileSync(resolve(base, 'ebay-uk-categories.json'), 'utf-8'))
      const items: TaxItem[] = []
      for (const [topName, topData] of Object.entries(data.topLevel ?? {}) as [string, any][]) {
        items.push({ id: String(topData.id ?? ''), name: topName, path: topName, is_leaf: false })
        for (const child of topData.children ?? []) {
          items.push({ id: String(child.id ?? ''), name: child.name ?? '', path: `${topName} > ${child.name ?? ''}`, is_leaf: true })
        }
      }
      return items
    }
    case 'shopify': {
      const data = JSON.parse(readFileSync(resolve(base, 'shopify-categories.json'), 'utf-8'))
      const items: TaxItem[] = []
      for (const vert of data.verticals ?? []) {
        for (const cat of vert.categories ?? []) {
          items.push({ id: cat.id ?? '', name: cat.name ?? '', path: cat.full_name ?? cat.name ?? '', is_leaf: !cat.children?.length })
        }
      }
      return items
    }
    case 'depop': {
      const data = JSON.parse(readFileSync(resolve(base, 'depop-categories.json'), 'utf-8'))
      const items: TaxItem[] = []
      for (const group of data.groups ?? []) {
        const dept = group.department ?? ''
        const gname = group.group ?? group.name ?? ''
        const ptypes = group.productTypes ?? group.product_types ?? []
        for (const pt of ptypes) {
          const ptName = typeof pt === 'string' ? pt : (pt.name ?? pt.slug ?? '')
          items.push({ id: `${dept}|${gname}|${ptName}`.toLowerCase(), name: ptName, path: `${dept} > ${gname} > ${ptName}`, is_leaf: true })
        }
      }
      return items
    }
    default: return []
  }
}

function preFilterCandidates(taxonomy: TaxItem[], label: string, topLevel: string): TaxItem[] {
  const words = label.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 2)
  const scored = taxonomy.map(item => {
    const nameLower = item.name.toLowerCase()
    const pathLower = item.path.toLowerCase()
    let score = 0
    for (const w of words) {
      if (nameLower.includes(w)) score += 10
      if (pathLower.includes(w)) score += 3
    }
    if (item.is_leaf) score += 5
    return { ...item, score }
  }).filter(i => i.score > 0).sort((a, b) => b.score - a.score)
  return scored.slice(0, 40)
}

async function aiMatch(
  label: string, value: string, topLevel: string, platform: string, candidates: TaxItem[]
): Promise<{ id: string; name: string; path: string; is_leaf: boolean; confidence: string; reasoning: string } | null> {
  if (candidates.length === 0) return null

  const candidateList = candidates.map((c, i) =>
    `${i + 1}. "${c.name}" (ID: ${c.id}, leaf: ${c.is_leaf}) — ${c.path}`
  ).join('\n')

  const prompt = `You are matching a product category to a ${platform} marketplace taxonomy.

Category to match: "${label}" (slug: ${value}, top-level: ${topLevel})

Available ${platform} categories (best pre-filtered candidates):
${candidateList}

Pick the SINGLE best match. Prefer leaf nodes over parent nodes. Reply with ONLY valid JSON:
{"pick": <number 1-${candidates.length}>, "confidence": "high"|"medium"|"low", "reasoning": "<one sentence>"}`

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 150,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      console.error(`  OpenAI error: ${res.status}`)
      return null
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }> }
    const raw = data.choices[0]?.message?.content ?? ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0]) as { pick: number; confidence: string; reasoning: string }
    const picked = candidates[parsed.pick - 1]
    if (!picked) return null

    return {
      id: picked.id,
      name: picked.name,
      path: picked.path,
      is_leaf: picked.is_leaf,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
    }
  } catch (err) {
    console.error(`  AI error: ${(err as Error).message}`)
    return null
  }
}

async function main() {
  console.log(`AI Batch Match — ${dryRun ? 'DRY RUN' : 'LIVE'}\n`)

  // Fetch all categories
  const { data: categories } = await supabase.from('categories').select('value, label, top_level, platforms').order('sort_order')
  if (!categories) { console.error('Failed to fetch categories'); process.exit(1) }

  let totalMatched = 0
  let totalSkipped = 0
  let totalFailed = 0

  for (const platform of PLATFORMS) {
    const taxonomy = loadTaxonomy(platform)
    if (!taxonomy.length) { console.log(`\n⚠ No taxonomy for ${platform}`); continue }

    const unmapped = categories.filter(c => {
      const p = (c.platforms as Record<string, unknown>) ?? {}
      return !p[platform]
    })

    console.log(`\n=== ${platform.toUpperCase()} — ${unmapped.length} unmapped ===`)
    if (unmapped.length === 0) continue

    let matched = 0, skipped = 0, failed = 0

    for (let i = 0; i < unmapped.length; i++) {
      const cat = unmapped[i]!
      const candidates = preFilterCandidates(taxonomy, cat.label, cat.top_level)

      if (candidates.length === 0) {
        skipped++
        continue
      }

      // Rate limit: 1 request per 200ms
      if (i > 0) await new Promise(r => setTimeout(r, 200))

      const result = await aiMatch(cat.label, cat.value, cat.top_level, platform, candidates)

      if (result) {
        const isGoodMatch = result.confidence === 'high' || result.confidence === 'medium'
        const icon = isGoodMatch ? '✓' : '✗'
        console.log(`  ${icon} ${cat.label} → ${result.name} (${result.confidence}) [${result.is_leaf ? 'leaf' : 'parent'}]${!isGoodMatch ? ' — SKIPPED (low confidence)' : ''}`)

        if (!isGoodMatch) {
          skipped++
          continue
        }

        if (!dryRun) {
          // Update the category's platforms jsonb
          const platforms = (cat.platforms as Record<string, unknown>) ?? {}
          platforms[platform] = { id: result.id, name: result.name, path: result.path }
          await supabase.from('categories').update({ platforms, updated_at: new Date().toISOString() }).eq('value', cat.value)
        }
        matched++
      } else {
        failed++
      }

      // Progress
      if ((i + 1) % 10 === 0) {
        console.log(`  ... ${i + 1}/${unmapped.length} processed`)
      }
    }

    console.log(`  Result: ${matched} matched, ${skipped} no candidates, ${failed} AI failed`)
    totalMatched += matched
    totalSkipped += skipped
    totalFailed += failed
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`  Matched: ${totalMatched}`)
  console.log(`  Skipped: ${totalSkipped} (no candidates in taxonomy)`)
  console.log(`  Failed:  ${totalFailed} (AI error or no pick)`)
  console.log(`  Mode:    ${dryRun ? 'DRY RUN (no DB changes)' : 'LIVE (DB updated)'}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
