#!/usr/bin/env npx tsx
/**
 * refresh-taxonomy.ts
 *
 * Checksums local marketplace taxonomy JSON files and compares against
 * the latest version in category_taxonomy_versions. If a file has changed,
 * logs a diff summary and inserts a new version record.
 *
 * This does NOT fetch new data from platform APIs — it only tracks
 * changes to the local JSON files already on disk.
 *
 * Usage:
 *   npx tsx scripts/refresh-taxonomy.ts
 *   npx tsx scripts/refresh-taxonomy.ts --platform vinted
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// ── Load env ────────────────────────────────────────────────────────
config({ path: resolve(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Platform config ─────────────────────────────────────────────────
interface PlatformConfig {
  platform: string
  file: string
  sourceUrl: string
}

const PLATFORMS: PlatformConfig[] = [
  {
    platform: 'vinted',
    file: 'src/data/marketplace/vinted-categories.json',
    sourceUrl: 'https://www.vinted.co.uk/api/v2/catalogs',
  },
  {
    platform: 'ebay',
    file: 'src/data/marketplace/ebay-uk-categories.json',
    sourceUrl: 'https://api.ebay.com/commerce/taxonomy/v1/category_tree/3',
  },
  {
    platform: 'shopify',
    file: 'src/data/marketplace/shopify-categories.json',
    sourceUrl: 'https://raw.githubusercontent.com/Shopify/product-taxonomy/main/dist/en/categories.json',
  },
  {
    platform: 'depop',
    file: 'src/data/marketplace/depop-categories.json',
    sourceUrl: 'https://webapi.depop.com/api/v3/attributes/',
  },
  {
    platform: 'etsy',
    file: 'src/data/marketplace/etsy-categories.json',
    sourceUrl: 'https://openapi.etsy.com/v3/application/seller-taxonomy/nodes',
  },
]

// ── Category name extractors (per-platform JSON structure) ──────────

interface CategoryInfo {
  names: string[]
  totalCount: number
  leafCount: number
}

function extractVinted(data: any): CategoryInfo {
  const names: string[] = []
  let leafCount = 0
  function walk(nodes: any[]) {
    for (const node of nodes) {
      names.push(node.full_path ?? node.name ?? '')
      if (node.is_leaf || !node.children?.length) leafCount++
      if (node.children?.length) walk(node.children)
    }
  }
  walk(data)
  return { names, totalCount: names.length, leafCount }
}

function extractEbay(data: any): CategoryInfo {
  const names: string[] = []
  let leafCount = 0
  const topLevel = data.topLevel ?? {}
  for (const [topName, topData] of Object.entries(topLevel) as [string, any][]) {
    names.push(topName)
    for (const child of topData.children ?? []) {
      const childName = child.name ?? ''
      names.push(`${topName} > ${childName}`)
      const isLeaf = (child.leafCount ?? 0) === 0 || !child.children?.length
      if (isLeaf) leafCount++
    }
  }
  // Use metadata counts if available (more accurate than our 2-level parse)
  const totalCount = data.totalCategories ?? names.length
  leafCount = data.leafCategories ?? leafCount
  return { names, totalCount, leafCount }
}

function extractShopify(data: any): CategoryInfo {
  const names: string[] = []
  let leafCount = 0
  for (const vert of data.verticals ?? []) {
    for (const cat of vert.categories ?? []) {
      names.push(cat.full_name ?? cat.name ?? '')
      if (!cat.children?.length) leafCount++
    }
  }
  return { names, totalCount: names.length, leafCount }
}

function extractDepop(data: any): CategoryInfo {
  const names: string[] = []
  let leafCount = 0
  // Departments
  for (const dept of data.departments ?? []) {
    names.push(dept.name ?? dept.id ?? '')
  }
  // Groups + product types
  for (const group of data.groups ?? []) {
    const dept = group.department ?? group.departments?.[0] ?? ''
    const gname = group.name ?? group.group ?? ''
    names.push(`${dept} > ${gname}`)
    const ptypes = group.productTypes ?? group.product_types ?? []
    if (ptypes.length === 0) leafCount++
    for (const pt of ptypes) {
      const ptName = typeof pt === 'string' ? pt : (pt.name ?? pt.slug ?? '')
      names.push(`${dept} > ${gname} > ${ptName}`)
      leafCount++
    }
  }
  return { names, totalCount: names.length, leafCount }
}

function extractEtsy(data: any): CategoryInfo {
  const names: string[] = []
  let leafCount = 0
  for (const cat of data.categories ?? []) {
    const catName = cat.name ?? ''
    const children = cat.children ?? cat.subcategories ?? []
    names.push(catName)
    if (children.length === 0) leafCount++
    for (const sub of children) {
      names.push(`${catName} > ${sub.name ?? ''}`)
      leafCount++
    }
  }
  return { names, totalCount: names.length, leafCount }
}

function extractCategories(platform: string, data: any): CategoryInfo {
  switch (platform) {
    case 'vinted': return extractVinted(data)
    case 'ebay': return extractEbay(data)
    case 'shopify': return extractShopify(data)
    case 'depop': return extractDepop(data)
    case 'etsy': return extractEtsy(data)
    default: return { names: [], totalCount: 0, leafCount: 0 }
  }
}

// ── Diff helper ─────────────────────────────────────────────────────

function diffNames(oldNames: string[], newNames: string[]): { added: string[]; removed: string[] } {
  const oldSet = new Set(oldNames)
  const newSet = new Set(newNames)
  const added = newNames.filter((n) => !oldSet.has(n))
  const removed = oldNames.filter((n) => !newSet.has(n))
  return { added, removed }
}

// ── Main ────────────────────────────────────────────────────────────

interface ResultRow {
  platform: string
  categories: number
  leaves: number
  status: string
  lastChecked: string
}

async function main() {
  const filterPlatform = process.argv.find((a) => a.startsWith('--platform='))?.split('=')[1]
    ?? (process.argv.includes('--platform') ? process.argv[process.argv.indexOf('--platform') + 1] : undefined)

  const platforms = filterPlatform
    ? PLATFORMS.filter((p) => p.platform === filterPlatform)
    : PLATFORMS

  if (platforms.length === 0) {
    console.error(`Unknown platform: ${filterPlatform}`)
    console.error(`Valid platforms: ${PLATFORMS.map((p) => p.platform).join(', ')}`)
    process.exit(1)
  }

  console.log(`\nRefreshing taxonomy checksums for ${platforms.length} platform(s)...\n`)

  const results: ResultRow[] = []

  for (const cfg of platforms) {
    const filePath = resolve(process.cwd(), cfg.file)
    let raw: string
    try {
      raw = readFileSync(filePath, 'utf-8')
    } catch {
      console.warn(`  [${cfg.platform}] File not found: ${cfg.file} — skipping`)
      results.push({ platform: cfg.platform, categories: 0, leaves: 0, status: 'FILE MISSING', lastChecked: '-' })
      continue
    }

    // Compute checksum
    const checksum = createHash('md5').update(raw).digest('hex')

    // Parse and extract category info
    let data: any
    try {
      data = JSON.parse(raw)
    } catch {
      console.warn(`  [${cfg.platform}] Invalid JSON in ${cfg.file} — skipping`)
      results.push({ platform: cfg.platform, categories: 0, leaves: 0, status: 'INVALID JSON', lastChecked: '-' })
      continue
    }

    const info = extractCategories(cfg.platform, data)

    // Fetch latest DB record for this platform
    const { data: existing } = await supabase
      .from('category_taxonomy_versions')
      .select('*')
      .eq('platform', cfg.platform)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()

    const prevChecksum = existing?.checksum ?? null
    const prevFetchedAt = existing?.fetched_at ?? null
    const now = new Date().toISOString()

    if (prevChecksum === checksum) {
      // Unchanged — optionally update fetched_at on existing row
      console.log(`  [${cfg.platform}] No changes (checksum: ${checksum.slice(0, 8)}...)`)

      const daysAgo = prevFetchedAt
        ? Math.floor((Date.now() - new Date(prevFetchedAt).getTime()) / 86_400_000)
        : null

      results.push({
        platform: cfg.platform,
        categories: info.totalCount,
        leaves: info.leafCount,
        status: 'unchanged',
        lastChecked: daysAgo !== null ? `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago` : '-',
      })
      continue
    }

    // Changed — compute diff if we can reconstruct old names
    console.log(`  [${cfg.platform}] CHANGED (old: ${prevChecksum?.slice(0, 8) ?? 'none'}... → new: ${checksum.slice(0, 8)}...)`)

    // We can't reconstruct old names from the DB (we only store counts),
    // so we just report the count changes
    const oldCatCount = existing?.category_count ?? 0
    const oldLeafCount = existing?.leaf_count ?? 0
    const catDelta = info.totalCount - oldCatCount
    const leafDelta = info.leafCount - oldLeafCount

    if (catDelta !== 0 || leafDelta !== 0) {
      console.log(`    Categories: ${oldCatCount} → ${info.totalCount} (${catDelta >= 0 ? '+' : ''}${catDelta})`)
      console.log(`    Leaves: ${oldLeafCount} → ${info.leafCount} (${leafDelta >= 0 ? '+' : ''}${leafDelta})`)
    }

    // Insert new version record
    const { error } = await supabase
      .from('category_taxonomy_versions')
      .insert({
        platform: cfg.platform,
        fetched_at: now,
        category_count: info.totalCount,
        leaf_count: info.leafCount,
        checksum,
        source_url: cfg.sourceUrl,
        notes: `Checksum refresh: ${catDelta >= 0 ? '+' : ''}${catDelta} categories, ${leafDelta >= 0 ? '+' : ''}${leafDelta} leaves`,
      })

    if (error) {
      console.error(`    DB insert failed: ${error.message}`)
      results.push({ platform: cfg.platform, categories: info.totalCount, leaves: info.leafCount, status: 'DB ERROR', lastChecked: '-' })
    } else {
      console.log(`    Inserted new version record`)
      results.push({ platform: cfg.platform, categories: info.totalCount, leaves: info.leafCount, status: 'UPDATED', lastChecked: 'just now' })
    }
  }

  // ── Summary table ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(70))
  console.log('  Taxonomy Freshness Summary')
  console.log('='.repeat(70))

  const col = { platform: 10, cats: 12, leaves: 8, status: 12, checked: 14 }
  const header = [
    'Platform'.padEnd(col.platform),
    'Categories'.padEnd(col.cats),
    'Leaves'.padEnd(col.leaves),
    'Status'.padEnd(col.status),
    'Last checked'.padEnd(col.checked),
  ].join(' | ')

  const divider = [
    '-'.repeat(col.platform),
    '-'.repeat(col.cats),
    '-'.repeat(col.leaves),
    '-'.repeat(col.status),
    '-'.repeat(col.checked),
  ].join('-|-')

  console.log(`  ${header}`)
  console.log(`  ${divider}`)

  for (const r of results) {
    const row = [
      r.platform.padEnd(col.platform),
      String(r.categories).padEnd(col.cats),
      String(r.leaves).padEnd(col.leaves),
      r.status.padEnd(col.status),
      r.lastChecked.padEnd(col.checked),
    ].join(' | ')
    console.log(`  ${row}`)
  }

  console.log('='.repeat(70))
  console.log()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
