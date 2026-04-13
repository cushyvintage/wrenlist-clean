/**
 * Fix Depop 2-segment IDs -> 3-segment where possible.
 * Run: npx tsx scripts/fix-depop-leaf-nodes.ts
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

interface DepopGroup {
  department: string
  group?: string
  name?: string
  productTypes?: Array<{ name?: string; slug?: string } | string>
  product_types?: Array<{ name?: string; slug?: string } | string>
}

const depopData = JSON.parse(
  readFileSync(resolve(__dirname, '../src/data/marketplace/depop-categories.json'), 'utf-8')
)

// Build group-name -> best product type map (case-insensitive, ignoring department prefix)
const groupToLeaf: Record<string, string> = {} // normalised group name -> best product type name

for (const group of (depopData.groups ?? []) as DepopGroup[]) {
  const gname = (group.group ?? group.name ?? '').toLowerCase().replace(/[- ]/g, '')
  const ptypes = group.productTypes ?? group.product_types ?? []
  if (!ptypes.length) continue

  let best: string | null = null
  for (const pt of ptypes) {
    const ptName = typeof pt === 'string' ? pt : (pt.name ?? pt.slug ?? '')
    if (/other/i.test(ptName)) { best = ptName; break }
  }
  if (!best) {
    const first = ptypes[0]!
    best = typeof first === 'string' ? first : (first.name ?? first.slug ?? '')
  }
  groupToLeaf[gname] = best
}

console.log(`Group -> leaf map: ${Object.keys(groupToLeaf).length} entries`)
for (const [k, v] of Object.entries(groupToLeaf)) {
  console.log(`  ${k} -> ${v}`)
}

async function main() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('value, platforms')

  if (error || !categories) {
    console.error('Failed:', error?.message)
    process.exit(1)
  }

  let fixes = 0
  let skipped = 0
  const updates: Array<{ value: string; platforms: Record<string, unknown> }> = []

  for (const cat of categories) {
    const platforms = (cat.platforms ?? {}) as Record<string, { id?: string; name?: string; path?: string }>
    const depop = platforms.depop
    if (!depop?.id) continue

    const pipeCount = (depop.id.match(/\|/g) ?? []).length
    if (pipeCount !== 1) continue // already 3-segment or other

    // Extract group name from 2-segment ID (e.g. "everything-else|toys" -> "toys")
    const groupPart = depop.id.split('|')[1] ?? ''
    const normalised = groupPart.toLowerCase().replace(/[- ]/g, '')
    const leaf = groupToLeaf[normalised]

    if (leaf) {
      const newId = `${depop.id}|${leaf}`.toLowerCase()
      platforms.depop = { id: newId, name: leaf, path: depop.path ?? '' }
      updates.push({ value: cat.value, platforms })
      fixes++
    } else {
      skipped++
      // These groups genuinely have no subtypes on Depop
    }
  }

  console.log(`\nDepop fixes: ${fixes} resolved, ${skipped} skipped (no subtypes exist)`)

  let applied = 0
  for (const upd of updates) {
    const { error } = await supabase
      .from('categories')
      .update({ platforms: upd.platforms, updated_at: new Date().toISOString() })
      .eq('value', upd.value)

    if (error) {
      console.error(`  Failed ${upd.value}:`, error.message)
    } else {
      applied++
    }
  }

  console.log(`Applied ${applied}/${fixes} updates`)

  // Verify
  const { data: post } = await supabase.from('categories').select('platforms')
  let remaining = 0
  for (const cat of post ?? []) {
    const p = cat.platforms as Record<string, { id?: string }>
    if (p.depop?.id && (p.depop.id.match(/\|/g) ?? []).length === 1) remaining++
  }
  console.log(`Remaining 2-segment Depop IDs: ${remaining} (these genuinely have no subtypes)`)
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1) })
