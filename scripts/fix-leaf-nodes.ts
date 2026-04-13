/**
 * One-time script: Fix non-leaf Vinted and Depop category IDs in the DB.
 * Resolves parent-level IDs to their best leaf descendant.
 *
 * Run: npx tsx scripts/fix-leaf-nodes.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { readFileSync } from 'fs'

config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Load Vinted tree
interface VintedNode {
  id: number
  name: string
  is_leaf?: boolean
  children?: VintedNode[]
}

const vintedTree: VintedNode[] = JSON.parse(
  readFileSync(resolve(__dirname, '../src/data/marketplace/vinted-categories.json'), 'utf-8')
)

// Build non-leaf -> best leaf resolution map
const vintedResolution: Record<string, { id: string; name: string; path: string }> = {}

function getAllLeaves(node: VintedNode, path: string): Array<{ id: string; name: string; path: string }> {
  const npath = path ? `${path} > ${node.name}` : node.name
  if (!node.children?.length || node.is_leaf) {
    return [{ id: String(node.id), name: node.name, path: npath }]
  }
  const leaves: Array<{ id: string; name: string; path: string }> = []
  for (const c of node.children) {
    leaves.push(...getAllLeaves(c, npath))
  }
  return leaves
}

function buildVintedResolution(nodes: VintedNode[], parentPath = '') {
  for (const node of nodes) {
    const path = parentPath ? `${parentPath} > ${node.name}` : node.name
    if (node.children?.length && !node.is_leaf) {
      const leaves = getAllLeaves(node, parentPath)
      if (leaves.length > 0) {
        // Prefer "Other" or "General" leaf, else first direct leaf child, else first leaf
        let best = leaves.find(l => /\bother\b/i.test(l.name) || /\bgeneral\b/i.test(l.name))
        if (!best) {
          for (const c of node.children) {
            if (c.is_leaf || !c.children?.length) {
              best = { id: String(c.id), name: c.name, path: `${path} > ${c.name}` }
              break
            }
          }
        }
        if (!best) best = leaves[0]!
        vintedResolution[String(node.id)] = best
      }
      buildVintedResolution(node.children, path)
    }
  }
}

buildVintedResolution(vintedTree)
console.log(`Vinted resolution map: ${Object.keys(vintedResolution).length} entries`)

// Load Depop tree
interface DepopData {
  groups: Array<{
    department: string
    group?: string
    name?: string
    productTypes?: Array<{ name?: string; slug?: string } | string>
    product_types?: Array<{ name?: string; slug?: string } | string>
  }>
}

const depopData: DepopData = JSON.parse(
  readFileSync(resolve(__dirname, '../src/data/marketplace/depop-categories.json'), 'utf-8')
)

const depopResolution: Record<string, { id: string; name: string }> = {}
for (const group of depopData.groups ?? []) {
  const dept = group.department ?? ''
  const gname = group.group ?? group.name ?? ''
  const twoSeg = `${dept}|${gname}`.toLowerCase()
  const ptypes = group.productTypes ?? group.product_types ?? []
  if (ptypes.length > 0) {
    let bestName: string | null = null
    for (const pt of ptypes) {
      const ptName = typeof pt === 'string' ? pt : (pt.name ?? pt.slug ?? '')
      if (/other/i.test(ptName)) {
        bestName = ptName
        break
      }
    }
    if (!bestName) {
      const first = ptypes[0]!
      bestName = typeof first === 'string' ? first : (first.name ?? first.slug ?? '')
    }
    depopResolution[twoSeg] = {
      id: `${dept}|${gname}|${bestName}`.toLowerCase(),
      name: bestName,
    }
  }
}
console.log(`Depop resolution map: ${Object.keys(depopResolution).length} entries`)

async function main() {
  // Fetch all categories
  const { data: categories, error } = await supabase
    .from('categories')
    .select('value, platforms')

  if (error || !categories) {
    console.error('Failed to fetch categories:', error?.message)
    process.exit(1)
  }

  console.log(`\nLoaded ${categories.length} categories from DB`)

  let vintedFixes = 0
  let depopFixes = 0
  const updates: Array<{ value: string; platforms: Record<string, unknown> }> = []

  for (const cat of categories) {
    const platforms = (cat.platforms ?? {}) as Record<string, { id?: string; name?: string; path?: string }>
    let changed = false

    // Fix Vinted non-leaf
    const vinted = platforms.vinted
    if (vinted?.id) {
      const leaf = vintedResolution[vinted.id]
      if (leaf) {
        platforms.vinted = { id: leaf.id, name: leaf.name, path: leaf.path }
        changed = true
        vintedFixes++
      }
    }

    // Fix Depop 2-segment -> 3-segment
    const depop = platforms.depop
    if (depop?.id) {
      const pipeCount = (depop.id.match(/\|/g) ?? []).length
      if (pipeCount === 1) {
        const resolved = depopResolution[depop.id.toLowerCase()]
        if (resolved) {
          platforms.depop = { id: resolved.id, name: resolved.name, path: depop.path ?? '' }
          changed = true
          depopFixes++
        } else {
          console.warn(`  No Depop resolution for "${depop.id}" (${cat.value})`)
        }
      }
    }

    if (changed) {
      updates.push({ value: cat.value, platforms })
    }
  }

  console.log(`\nFixes:`)
  console.log(`  Vinted: ${vintedFixes} non-leaf -> leaf`)
  console.log(`  Depop:  ${depopFixes} non-leaf -> leaf`)
  console.log(`  Total:  ${updates.length} categories to update`)

  // Apply
  let applied = 0
  for (const upd of updates) {
    const { error } = await supabase
      .from('categories')
      .update({ platforms: upd.platforms, updated_at: new Date().toISOString() })
      .eq('value', upd.value)

    if (error) {
      console.error(`  Failed to update ${upd.value}:`, error.message)
    } else {
      applied++
    }
  }

  console.log(`\nApplied ${applied}/${updates.length} updates`)

  // Verify
  const { data: postCheck } = await supabase.from('categories').select('platforms')
  let remainingVinted = 0
  let remainingDepop = 0
  for (const cat of postCheck ?? []) {
    const p = cat.platforms as Record<string, { id?: string }>
    if (p.vinted?.id && vintedResolution[p.vinted.id]) remainingVinted++
    if (p.depop?.id && (p.depop.id.match(/\|/g) ?? []).length === 1) remainingDepop++
  }
  console.log(`\nPost-fix verification:`)
  console.log(`  Remaining Vinted non-leaf: ${remainingVinted}`)
  console.log(`  Remaining Depop 2-segment: ${remainingDepop}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
