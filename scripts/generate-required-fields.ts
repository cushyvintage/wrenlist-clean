#!/usr/bin/env npx tsx
/**
 * Generate marketplace-required-fields.ts from raw data sources.
 *
 * Sources:
 *   1. ebay-uk-aspects.json — direct eBay Taxonomy API (authoritative)
 *   2. marketplace-category-map.ts exported as JSON (130 leaves with eBay IDs)
 *   3. Sensible defaults per category group for non-eBay platforms
 *
 * Run: npx tsx scripts/generate-required-fields.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Types ────────────────────────────────────────────────────────────────

interface FieldReq {
  show: boolean
  required?: boolean
  options?: string[]
  type?: 'text' | 'select' | 'multiselect'
}

type FieldMap = Record<string, FieldReq>
type Platform = 'ebay' | 'vinted' | 'shopify' | 'etsy' | 'depop' | 'facebook'

interface EbayAspect {
  name: string
  required: boolean
  mode: string
  sampleValues: string[]
}

interface EbayCat {
  name: string
  totalAspects: number
  required?: string[]
  recommended?: string[]
  allAspects?: EbayAspect[]
}

// ── Read data ────────────────────────────────────────────────────────────

const root = path.resolve(__dirname, '..')

const ebayAspects: { categories: Record<string, EbayCat> } = JSON.parse(
  fs.readFileSync(path.join(root, 'src/data/marketplace/ebay-uk-aspects.json'), 'utf8')
)

// Parse the category tree TS file to extract leaf values + eBay IDs + top-level group
const catMapSrc = fs.readFileSync(
  path.join(root, 'src/data/marketplace-category-map.ts'),
  'utf8'
)

interface LeafInfo {
  value: string
  label: string
  ebayId: string | null
  group: string // top-level category name (e.g. 'ceramics', 'glassware')
}

function extractLeaves(src: string): LeafInfo[] {
  const leaves: LeafInfo[] = []
  let currentGroup = ''

  // Match group headers: "ceramics: {" at top level of CATEGORY_TREE
  const lines = src.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Match top-level group: "  ceramics: {"
    const groupMatch = line.match(/^\s{2}(\w+):\s*\{/)
    if (groupMatch && !line.includes('value:') && !line.includes('platforms:')) {
      currentGroup = groupMatch[1]
      continue
    }

    // Match leaf value
    const valueMatch = line.match(/value:\s*'([^']+)'/)
    if (valueMatch && currentGroup) {
      const value = valueMatch[1]

      // Look ahead for label
      let label = ''
      for (let j = i; j < Math.min(i + 3, lines.length); j++) {
        const labelMatch = lines[j].match(/label:\s*'([^']+)'/)
        if (labelMatch) { label = labelMatch[1]; break }
      }

      // Look ahead for eBay ID
      let ebayId: string | null = null
      for (let j = i; j < Math.min(i + 10, lines.length); j++) {
        const ebayMatch = lines[j].match(/ebay:\s*\{\s*id:\s*'(\d+)'/)
        if (ebayMatch) { ebayId = ebayMatch[1]; break }
      }

      leaves.push({ value, label, ebayId, group: currentGroup })
    }
  }
  return leaves
}

const leaves = extractLeaves(catMapSrc)
console.log(`Found ${leaves.length} leaf categories`)

// ── eBay field normalization ─────────────────────────────────────────────

/** Map eBay aspect names to our form field keys */
const EBAY_FIELD_MAP: Record<string, string> = {
  'Brand': 'brand',
  'Material': 'material',
  'Colour': 'colour',
  'Color': 'colour',
  'Type': 'type',
  'Style': 'style',
  'Size': 'size',
  'Pattern': 'pattern',
  'Author': 'author',
  'Language': 'language',
  'ISBN': 'isbn',
  'Publisher': 'publisher',
  'Department': 'department',
  'Condition Description': 'condition_description',
  'Features': 'features',
  'Theme': 'theme',
  'Shape': 'shape',
  'Origin': 'origin',
  'Vintage': 'vintage',
  'Handmade': 'handmade',
}

function buildEbayFields(cat: EbayCat): FieldMap {
  const fields: FieldMap = {}
  if (!cat.allAspects) return fields

  for (const aspect of cat.allAspects) {
    const key = EBAY_FIELD_MAP[aspect.name]
    if (!key) continue // Skip unmapped eBay-specific fields (MPN, PAS Number, etc.)

    fields[key] = {
      show: true,
      required: aspect.required || false,
      type: aspect.mode === 'SELECTION_ONLY' ? 'select' : 'text',
    }
    if (aspect.sampleValues && aspect.sampleValues.length > 0 && aspect.mode === 'SELECTION_ONLY') {
      fields[key].options = aspect.sampleValues.slice(0, 20) // Cap at 20 options
    }
  }

  // Always show condition_description for eBay
  if (!fields.condition_description) {
    fields.condition_description = { show: true }
  }

  return fields
}

// Build eBay fields from direct API data
const ebayFieldsByCategory: Record<string, FieldMap> = {}
for (const [id, cat] of Object.entries(ebayAspects.categories)) {
  if (cat.totalAspects > 0 && cat.allAspects) {
    ebayFieldsByCategory[id] = buildEbayFields(cat)
  }
}

console.log(`eBay aspects data covers ${Object.keys(ebayFieldsByCategory).length} categories`)

// ── Group-level defaults ─────────────────────────────────────────────────

const EBAY_GROUP_DEFAULTS: Record<string, FieldMap> = {
  ceramics: {
    brand: { show: true, required: true },
    material: { show: true, required: true },
    type: { show: true, required: true },
    colour: { show: true },
    condition_description: { show: true },
    vintage: { show: true, type: 'select', options: ['Yes', 'No'] },
  },
  glassware: {
    colour: { show: true, required: true },
    type: { show: true, required: true },
    brand: { show: true },
    material: { show: true },
    condition_description: { show: true },
    vintage: { show: true, type: 'select', options: ['Yes', 'No'] },
  },
  books: {
    author: { show: true },
    isbn: { show: true },
    language: { show: true },
    publisher: { show: true },
    condition_description: { show: true },
  },
  jewellery: {
    brand: { show: true },
    material: { show: true },
    colour: { show: true },
    type: { show: true },
    style: { show: true },
    condition_description: { show: true },
  },
  clothing: {
    brand: { show: true },
    colour: { show: true },
    size: { show: true },
    material: { show: true },
    style: { show: true },
    department: { show: true },
    condition_description: { show: true },
  },
  homeware: {
    brand: { show: true },
    colour: { show: true },
    material: { show: true },
    type: { show: true },
    condition_description: { show: true },
  },
  furniture: {
    brand: { show: true },
    colour: { show: true },
    material: { show: true },
    style: { show: true },
    condition_description: { show: true },
  },
  toys: {
    brand: { show: true },
    type: { show: true },
    condition_description: { show: true },
  },
  collectibles: {
    brand: { show: true },
    type: { show: true },
    theme: { show: true },
    condition_description: { show: true },
  },
  art: {
    type: { show: true },
    style: { show: true },
    origin: { show: true },
    condition_description: { show: true },
  },
  antiques: {
    type: { show: true },
    material: { show: true },
    origin: { show: true },
    condition_description: { show: true },
    vintage: { show: true, type: 'select', options: ['Yes', 'No'] },
  },
  electronics: {
    brand: { show: true },
    type: { show: true },
    colour: { show: true },
    condition_description: { show: true },
  },
  sports: {
    brand: { show: true },
    type: { show: true },
    size: { show: true },
    colour: { show: true },
    condition_description: { show: true },
  },
  musicMedia: {
    type: { show: true },
    condition_description: { show: true },
  },
  craftSupplies: {
    brand: { show: true },
    type: { show: true },
    material: { show: true },
    colour: { show: true },
    condition_description: { show: true },
  },
  healthBeauty: {
    brand: { show: true },
    type: { show: true },
    condition_description: { show: true },
  },
  other: {
    brand: { show: true },
    colour: { show: true },
    condition_description: { show: true },
  },
}

const VINTED_GROUP_DEFAULTS: Record<string, FieldMap> = {
  ceramics: {
    colour: { show: true, required: true },
    condition_description: { show: true },
    material: { show: true },
  },
  glassware: {
    colour: { show: true, required: true },
    condition_description: { show: true },
  },
  books: {
    author: { show: true, required: true },
    isbn: { show: true },
    language: { show: true },
    condition_description: { show: true },
  },
  jewellery: {
    colour: { show: true, required: true },
    material: { show: true },
    brand: { show: true },
    condition_description: { show: true },
  },
  clothing: {
    colour: { show: true, required: true },
    size: { show: true, required: true },
    brand: { show: true },
    material: { show: true },
    condition_description: { show: true },
  },
  homeware: {
    colour: { show: true, required: true },
    condition_description: { show: true },
  },
  furniture: {
    colour: { show: true },
    condition_description: { show: true },
  },
  toys: {
    colour: { show: true },
    brand: { show: true },
    condition_description: { show: true },
  },
  collectibles: {
    colour: { show: true },
    condition_description: { show: true },
  },
  art: {
    colour: { show: true },
    condition_description: { show: true },
  },
  antiques: {
    colour: { show: true },
    condition_description: { show: true },
  },
  electronics: {
    colour: { show: true },
    brand: { show: true },
    condition_description: { show: true },
  },
  sports: {
    colour: { show: true },
    size: { show: true },
    brand: { show: true },
    condition_description: { show: true },
  },
  musicMedia: {
    condition_description: { show: true },
  },
  craftSupplies: {
    colour: { show: true },
    condition_description: { show: true },
  },
  healthBeauty: {
    brand: { show: true },
    condition_description: { show: true },
  },
  other: {
    colour: { show: true },
    condition_description: { show: true },
  },
}

// Depop: no mandatory fields, but vary shown fields by group
const DEPOP_GROUP_DEFAULTS: Record<string, FieldMap> = {
  ceramics: { colour: { show: true }, brand: { show: true }, material: { show: true }, condition_description: { show: true } },
  glassware: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  books: { author: { show: true }, isbn: { show: true }, condition_description: { show: true } },
  jewellery: { colour: { show: true }, brand: { show: true }, material: { show: true }, style: { show: true }, condition_description: { show: true } },
  clothing: { colour: { show: true }, size: { show: true }, brand: { show: true }, style: { show: true }, condition_description: { show: true } },
  homeware: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  furniture: { colour: { show: true }, brand: { show: true }, style: { show: true }, condition_description: { show: true } },
  toys: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  collectibles: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  art: { colour: { show: true }, style: { show: true }, condition_description: { show: true } },
  antiques: { colour: { show: true }, style: { show: true }, condition_description: { show: true } },
  electronics: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  sports: { colour: { show: true }, size: { show: true }, brand: { show: true }, condition_description: { show: true } },
  musicMedia: { condition_description: { show: true } },
  craftSupplies: { colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  healthBeauty: { brand: { show: true }, condition_description: { show: true } },
  other: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
}

// Shopify: vary by group (books get author/isbn, clothing gets size, etc.)
const SHOPIFY_GROUP_DEFAULTS: Record<string, FieldMap> = {
  ceramics: { brand: { show: true }, colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  glassware: { brand: { show: true }, colour: { show: true }, condition_description: { show: true } },
  books: { author: { show: true }, isbn: { show: true }, language: { show: true }, condition_description: { show: true } },
  jewellery: { brand: { show: true }, colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  clothing: { brand: { show: true }, colour: { show: true }, size: { show: true }, material: { show: true }, condition_description: { show: true } },
  homeware: { brand: { show: true }, colour: { show: true }, condition_description: { show: true } },
  furniture: { brand: { show: true }, colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  toys: { brand: { show: true }, colour: { show: true }, condition_description: { show: true } },
  collectibles: { brand: { show: true }, colour: { show: true }, condition_description: { show: true } },
  art: { colour: { show: true }, style: { show: true }, condition_description: { show: true } },
  antiques: { colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  electronics: { brand: { show: true }, colour: { show: true }, condition_description: { show: true } },
  sports: { brand: { show: true }, colour: { show: true }, size: { show: true }, condition_description: { show: true } },
  musicMedia: { brand: { show: true }, condition_description: { show: true } },
  craftSupplies: { brand: { show: true }, colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  healthBeauty: { brand: { show: true }, condition_description: { show: true } },
  other: { brand: { show: true }, colour: { show: true }, condition_description: { show: true } },
}

// Etsy: vary by group
const ETSY_GROUP_DEFAULTS: Record<string, FieldMap> = {
  ceramics: { colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  glassware: { colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  books: { author: { show: true }, isbn: { show: true }, language: { show: true }, condition_description: { show: true } },
  jewellery: { colour: { show: true }, material: { show: true }, style: { show: true }, condition_description: { show: true } },
  clothing: { colour: { show: true }, size: { show: true }, material: { show: true }, condition_description: { show: true } },
  homeware: { colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  furniture: { colour: { show: true }, material: { show: true }, style: { show: true }, condition_description: { show: true } },
  toys: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  collectibles: { colour: { show: true }, condition_description: { show: true } },
  art: { colour: { show: true }, style: { show: true }, condition_description: { show: true } },
  antiques: { colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  electronics: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  sports: { colour: { show: true }, size: { show: true }, condition_description: { show: true } },
  musicMedia: { condition_description: { show: true } },
  craftSupplies: { colour: { show: true }, material: { show: true }, condition_description: { show: true } },
  healthBeauty: { brand: { show: true }, condition_description: { show: true } },
  other: { colour: { show: true }, condition_description: { show: true } },
}

// Facebook Marketplace: minimal fields (title, price, category, condition handled by form)
const FACEBOOK_GROUP_DEFAULTS: Record<string, FieldMap> = {
  ceramics: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  glassware: { colour: { show: true }, condition_description: { show: true } },
  books: { author: { show: true }, condition_description: { show: true } },
  jewellery: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  clothing: { colour: { show: true }, size: { show: true }, brand: { show: true }, condition_description: { show: true } },
  homeware: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  furniture: { colour: { show: true }, condition_description: { show: true } },
  toys: { brand: { show: true }, condition_description: { show: true } },
  collectibles: { brand: { show: true }, condition_description: { show: true } },
  art: { condition_description: { show: true } },
  antiques: { condition_description: { show: true } },
  electronics: { brand: { show: true }, colour: { show: true }, condition_description: { show: true } },
  sports: { brand: { show: true }, colour: { show: true }, condition_description: { show: true } },
  musicMedia: { condition_description: { show: true } },
  craftSupplies: { colour: { show: true }, condition_description: { show: true } },
  healthBeauty: { brand: { show: true }, condition_description: { show: true } },
  other: { colour: { show: true }, condition_description: { show: true } },
}

// ── Assemble output ──────────────────────────────────────────────────────

interface PlatformFields {
  ebay: FieldMap
  vinted: FieldMap
  shopify: FieldMap
  etsy: FieldMap
  depop: FieldMap
  facebook: FieldMap
}

const output: Record<string, PlatformFields> = {}

for (const leaf of leaves) {
  // eBay: prefer direct API data, fall back to group defaults
  let ebayFields: FieldMap
  if (leaf.ebayId && ebayFieldsByCategory[leaf.ebayId]) {
    ebayFields = ebayFieldsByCategory[leaf.ebayId]
  } else {
    ebayFields = EBAY_GROUP_DEFAULTS[leaf.group] || EBAY_GROUP_DEFAULTS.other
  }

  // Vinted: group defaults
  const vintedFields = VINTED_GROUP_DEFAULTS[leaf.group] || VINTED_GROUP_DEFAULTS.other

  // Depop/Shopify/Etsy/Facebook: group-level defaults
  const depopFields = DEPOP_GROUP_DEFAULTS[leaf.group] || DEPOP_GROUP_DEFAULTS.other
  const shopifyFields = SHOPIFY_GROUP_DEFAULTS[leaf.group] || SHOPIFY_GROUP_DEFAULTS.other
  const etsyFields = ETSY_GROUP_DEFAULTS[leaf.group] || ETSY_GROUP_DEFAULTS.other
  const facebookFields = FACEBOOK_GROUP_DEFAULTS[leaf.group] || FACEBOOK_GROUP_DEFAULTS.other

  output[leaf.value] = {
    ebay: ebayFields,
    vinted: vintedFields,
    shopify: shopifyFields,
    etsy: etsyFields,
    depop: depopFields,
    facebook: facebookFields,
  }
}

// ── Write TypeScript output ──────────────────────────────────────────────

function serializeFieldMap(fm: FieldMap, indent: string): string {
  const entries = Object.entries(fm).map(([key, val]) => {
    const parts: string[] = [`show: ${val.show}`]
    if (val.required) parts.push(`required: true`)
    if (val.type) parts.push(`type: '${val.type}'`)
    if (val.options) parts.push(`options: ${JSON.stringify(val.options)}`)
    return `${indent}  ${key}: { ${parts.join(', ')} }`
  })
  return `{\n${entries.join(',\n')}\n${indent}}`
}

function serializePlatformFields(pf: PlatformFields, indent: string): string {
  const platforms = (['ebay', 'vinted', 'shopify', 'etsy', 'depop', 'facebook'] as Platform[])
    .map((p) => `${indent}  ${p}: ${serializeFieldMap(pf[p], indent + '  ')}`)
    .join(',\n')
  return `{\n${platforms}\n${indent}}`
}

// Count coverage
let ebayApiCount = 0
let ebayDefaultCount = 0
for (const leaf of leaves) {
  if (leaf.ebayId && ebayFieldsByCategory[leaf.ebayId]) ebayApiCount++
  else ebayDefaultCount++
}

const tsOutput = `/**
 * Required fields per category x platform — AUTO-GENERATED
 *
 * Source: scripts/generate-required-fields.ts
 * Generated: ${new Date().toISOString().slice(0, 10)}
 *
 * eBay data: ${ebayApiCount} categories from Taxonomy API, ${ebayDefaultCount} from group defaults
 * Vinted: group-level defaults (colour + condition for most)
 * Depop: no mandatory fields (all optional per API)
 * Shopify/Etsy: minimal defaults (title/description/price handled by form)
 *
 * To regenerate: npx tsx scripts/generate-required-fields.ts
 */

import type { PlatformFieldMap } from '@/types/categories'

/** The 6 currently-mapped platforms — others get default fields */
type MappedPlatform = 'ebay' | 'vinted' | 'shopify' | 'etsy' | 'depop' | 'facebook'
type PlatformFieldsRecord = Record<MappedPlatform, PlatformFieldMap>

/** Required fields for every canonical category, keyed by category value then platform */
export const REQUIRED_FIELDS: Record<string, PlatformFieldsRecord> = {
${Object.entries(output).map(([key, pf]) =>
  `  '${key}': ${serializePlatformFields(pf, '  ')}`
).join(',\n')}
}

/** Default fields when category has no specific mapping */
const DEFAULT_FIELDS: PlatformFieldsRecord = {
  ebay: { colour: { show: true }, brand: { show: true }, condition_description: { show: true } },
  vinted: { colour: { show: true }, condition_description: { show: true } },
  shopify: { colour: { show: true }, condition_description: { show: true } },
  etsy: { colour: { show: true }, condition_description: { show: true } },
  depop: { colour: { show: true }, condition_description: { show: true } },
  facebook: { colour: { show: true }, condition_description: { show: true } },
}

const MAPPED_PLATFORMS = new Set<string>(['ebay', 'vinted', 'shopify', 'etsy', 'depop', 'facebook'])

/**
 * Get required fields for a category + platform.
 * Falls back to default if category or platform not mapped.
 */
export function getRequiredFields(category: string, platform: string): PlatformFieldMap {
  const entry = REQUIRED_FIELDS[category]
  const mapped = MAPPED_PLATFORMS.has(platform) ? (platform as MappedPlatform) : null
  if (entry && mapped) return entry[mapped]
  if (mapped) return DEFAULT_FIELDS[mapped]
  return DEFAULT_FIELDS.ebay
}
`

const outPath = path.join(root, 'src/data/marketplace-required-fields.ts')
fs.writeFileSync(outPath, tsOutput, 'utf8')
console.log(`\nWritten ${outPath}`)
console.log(`  ${Object.keys(output).length} categories`)
console.log(`  eBay: ${ebayApiCount} from API, ${ebayDefaultCount} from defaults`)
