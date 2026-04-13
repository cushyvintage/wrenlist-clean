import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/with-auth'
import { readFileSync } from 'fs'
import { resolve } from 'path'

interface TaxonomyResult {
  id: string
  name: string
  path: string
  is_leaf: boolean
  depth: number
}

// In-memory cache per platform (loaded once per cold start)
const cache: Record<string, TaxonomyResult[]> = {}

function loadVinted(): TaxonomyResult[] {
  const data = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/data/marketplace/vinted-categories.json'), 'utf-8')
  )
  interface VNode { id: number; name?: string; full_path?: string; is_leaf?: boolean; depth?: number; children?: VNode[] }
  const results: TaxonomyResult[] = []
  function walk(nodes: VNode[]) {
    for (const node of nodes) {
      results.push({
        id: String(node.id),
        name: node.name ?? '',
        path: node.full_path ?? '',
        is_leaf: node.is_leaf ?? !node.children?.length,
        depth: node.depth ?? 0,
      })
      if (node.children?.length) walk(node.children)
    }
  }
  walk(data as VNode[])
  return results
}

function loadEbay(): TaxonomyResult[] {
  const data = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/data/marketplace/ebay-uk-categories.json'), 'utf-8')
  )
  const results: TaxonomyResult[] = []
  const topLevel = data.topLevel ?? {}
  for (const [topName, topData] of Object.entries(topLevel) as [string, any][]) {
    const topId = String(topData.id ?? '')
    results.push({ id: topId, name: topName, path: topName, is_leaf: false, depth: 0 })
    for (const child of topData.children ?? []) {
      const childId = String(child.id ?? '')
      const childName = child.name ?? ''
      const childPath = `${topName} > ${childName}`
      const isLeaf = (child.leafCount ?? 0) === 0 || !child.children?.length
      results.push({ id: childId, name: childName, path: childPath, is_leaf: isLeaf, depth: 1 })
      // eBay JSON only has 2 levels in our summary
    }
  }
  return results
}

function loadShopify(): TaxonomyResult[] {
  const data = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/data/marketplace/shopify-categories.json'), 'utf-8')
  )
  const results: TaxonomyResult[] = []
  const verticals = data.verticals ?? []
  for (const vert of verticals) {
    for (const cat of vert.categories ?? []) {
      results.push({
        id: cat.id ?? '',
        name: cat.name ?? '',
        path: cat.full_name ?? cat.name ?? '',
        is_leaf: !cat.children?.length,
        depth: cat.level ?? 0,
      })
    }
  }
  return results
}

function loadDepop(): TaxonomyResult[] {
  const data = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/data/marketplace/depop-categories.json'), 'utf-8')
  )
  const results: TaxonomyResult[] = []
  // Departments
  const depts = data.departments ?? {}
  for (const [deptName, deptGroups] of Object.entries(depts) as [string, any][]) {
    results.push({
      id: deptName.toLowerCase(),
      name: deptName,
      path: deptName,
      is_leaf: false,
      depth: 0,
    })
  }
  // Groups with product types
  for (const group of data.groups ?? []) {
    const dept = group.department ?? ''
    const gname = group.group ?? group.name ?? ''
    const groupId = `${dept}|${gname}`.toLowerCase()
    const ptypes = group.productTypes ?? group.product_types ?? []
    results.push({
      id: groupId,
      name: gname,
      path: `${dept} > ${gname}`,
      is_leaf: ptypes.length === 0,
      depth: 1,
    })
    for (const pt of ptypes) {
      const ptName = typeof pt === 'string' ? pt : (pt.name ?? pt.slug ?? '')
      const ptId = `${dept}|${gname}|${ptName}`.toLowerCase()
      results.push({
        id: ptId,
        name: ptName,
        path: `${dept} > ${gname} > ${ptName}`,
        is_leaf: true,
        depth: 2,
      })
    }
  }
  return results
}

function loadEtsy(): TaxonomyResult[] {
  const data = JSON.parse(
    readFileSync(resolve(process.cwd(), 'src/data/marketplace/etsy-categories.json'), 'utf-8')
  )
  const results: TaxonomyResult[] = []
  for (const cat of data.categories ?? []) {
    const catName = cat.name ?? ''
    const catId = cat.taxonomy_id ? String(cat.taxonomy_id) : catName.toLowerCase()
    const children = cat.children ?? cat.subcategories ?? []
    results.push({
      id: catId,
      name: catName,
      path: catName,
      is_leaf: children.length === 0,
      depth: 0,
    })
    for (const sub of children) {
      const subName = sub.name ?? ''
      const subId = sub.taxonomy_id ? String(sub.taxonomy_id) : `${catName.toLowerCase()}/${subName.toLowerCase()}`
      results.push({
        id: subId,
        name: subName,
        path: `${catName} > ${subName}`,
        is_leaf: true, // Etsy L2 is the deepest we have
        depth: 1,
      })
    }
  }
  return results
}

function getTaxonomy(platform: string): TaxonomyResult[] {
  if (cache[platform]) return cache[platform]!

  let results: TaxonomyResult[]
  switch (platform) {
    case 'vinted': results = loadVinted(); break
    case 'ebay': results = loadEbay(); break
    case 'shopify': results = loadShopify(); break
    case 'depop': results = loadDepop(); break
    case 'etsy': results = loadEtsy(); break
    default: return []
  }

  cache[platform] = results
  return results
}

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

  const taxonomy = getTaxonomy(platform)
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
