/**
 * One-time seed script: reads CATEGORY_TREE and CATEGORY_FIELD_REQUIREMENTS
 * from TypeScript constants and inserts into the new DB tables.
 *
 * Run: npx tsx scripts/seed-categories-from-ts.ts
 *
 * Prerequisites:
 *   - Tables `categories` and `category_field_requirements` must exist
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load env
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

// Import the TS data
import { CATEGORY_TREE, LEGACY_CATEGORY_MAP } from '../src/data/marketplace-category-map'
import { CATEGORY_FIELD_REQUIREMENTS } from '../src/data/marketplace/category-field-requirements'

interface CategoryRow {
  value: string
  label: string
  top_level: string
  parent_group: string | null
  platforms: Record<string, unknown>
  sort_order: number
  legacy_values: string[] | null
}

interface FieldReqRow {
  category_value: string
  platform: string
  fields: unknown[]
}

async function seedCategories() {
  console.log('=== Seeding categories ===')

  // Build legacy reverse map: new_value → [old_value1, old_value2, ...]
  const legacyReverse: Record<string, string[]> = {}
  for (const [oldVal, newVal] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (!legacyReverse[newVal]) legacyReverse[newVal] = []
    legacyReverse[newVal].push(oldVal)
  }

  const rows: CategoryRow[] = []
  let sortOrder = 0

  for (const [topLevel, subcats] of Object.entries(CATEGORY_TREE)) {
    for (const [subKey, node] of Object.entries(subcats)) {
      // Extract parent_group: first segment of subKey if multi-segment
      const parts = subKey.split('_')
      const parentGroup = parts.length > 1 ? parts[0]! : null

      rows.push({
        value: node.value,
        label: node.label,
        top_level: topLevel,
        parent_group: parentGroup,
        platforms: node.platforms as Record<string, unknown>,
        sort_order: sortOrder++,
        legacy_values: legacyReverse[node.value] ?? null,
      })
    }
  }

  console.log(`  Prepared ${rows.length} category rows`)

  // Insert in batches of 100
  const batchSize = 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('categories')
      .upsert(batch, { onConflict: 'value' })

    if (error) {
      console.error(`  Error inserting batch at offset ${i}:`, error.message)
      process.exit(1)
    }
    inserted += batch.length
    console.log(`  Inserted ${inserted}/${rows.length}`)
  }

  console.log(`  Done: ${inserted} categories seeded`)
  return inserted
}

async function seedFieldRequirements() {
  console.log('\n=== Seeding category field requirements ===')

  const rows: FieldReqRow[] = []

  for (const [categoryValue, platformFields] of Object.entries(CATEGORY_FIELD_REQUIREMENTS)) {
    if (platformFields.ebay && platformFields.ebay.length > 0) {
      rows.push({
        category_value: categoryValue,
        platform: 'ebay',
        fields: platformFields.ebay,
      })
    }
    if (platformFields.vinted && platformFields.vinted.length > 0) {
      rows.push({
        category_value: categoryValue,
        platform: 'vinted',
        fields: platformFields.vinted,
      })
    }
  }

  console.log(`  Prepared ${rows.length} field requirement rows`)

  // Insert in batches of 100
  const batchSize = 100
  let inserted = 0
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('category_field_requirements')
      .upsert(batch, { onConflict: 'category_value,platform' })

    if (error) {
      console.error(`  Error inserting batch at offset ${i}:`, error.message)
      // Log the problematic values for debugging
      const vals = batch.map(r => r.category_value)
      console.error(`  Category values in batch:`, vals.slice(0, 5).join(', '), '...')
      process.exit(1)
    }
    inserted += batch.length
    console.log(`  Inserted ${inserted}/${rows.length}`)
  }

  console.log(`  Done: ${inserted} field requirements seeded`)
  return inserted
}

async function main() {
  console.log('Seeding category data from TypeScript constants into Supabase...\n')

  const catCount = await seedCategories()
  const fieldCount = await seedFieldRequirements()

  console.log('\n=== Summary ===')
  console.log(`  Categories:         ${catCount}`)
  console.log(`  Field requirements: ${fieldCount}`)
  console.log('\nSeed complete!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
