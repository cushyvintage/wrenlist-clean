/**
 * Database-backed category helpers (server-side only).
 *
 * Replaces direct imports from '@/data/marketplace-category-map' in API routes
 * and server-side utility files. Uses createSupabaseServerClient() to query the
 * `categories` table.
 *
 * For client components, use the `useCategoryTree()` hook instead.
 */

import { createSupabaseServerClient } from '@/lib/supabase-server'
import type { CategoryFieldDef } from '@/types/categories'

// ---------------------------------------------------------------------------
// Core row type (matches DB columns we SELECT)
// ---------------------------------------------------------------------------
export interface CategoryRow {
  value: string
  label: string
  top_level: string
  parent_group: string | null
  platforms: Record<string, { id?: string; name?: string; path?: string }>
  sort_order: number
  legacy_values: string[] | null
}

// ---------------------------------------------------------------------------
// Single-category helpers
// ---------------------------------------------------------------------------

/** Fetch a category row by its canonical value */
export async function getCategoryFromDb(value: string): Promise<CategoryRow | null> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('categories')
    .select('value, label, top_level, parent_group, platforms, sort_order, legacy_values')
    .eq('value', value)
    .single()
  return (data as CategoryRow | null) ?? null
}

/** Get a category label, falling back to humanised slug */
export async function getCategoryLabelFromDb(value: string): Promise<string> {
  const row = await getCategoryFromDb(value)
  if (row) return row.label
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Get the platform-specific category ID */
export async function getPlatformCategoryIdFromDb(
  value: string,
  platform: string,
): Promise<string | undefined> {
  const cat = await getCategoryFromDb(value)
  return cat?.platforms?.[platform]?.id
}

/** Get the top-level key for a canonical value */
export async function getTopLevelFromDb(value: string): Promise<string> {
  const cat = await getCategoryFromDb(value)
  if (cat) return cat.top_level
  // Fallback: derive from the value string (matches TS const behaviour)
  const parts = value.split('_')
  return parts[0] ?? value
}

/**
 * Resolve a legacy category value to its current canonical value.
 * The `categories` table stores an array of `legacy_values` per row.
 */
export async function resolveLegacyCategory(value: string): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('categories')
    .select('value')
    .contains('legacy_values', [value])
    .limit(1)
    .single()
  return data?.value ?? value
}

// ---------------------------------------------------------------------------
// Reverse lookups (Vinted ID → category)
// ---------------------------------------------------------------------------

/**
 * Look up a canonical leaf category value from a Vinted catalog ID.
 * Scans the `platforms` JSONB for a vinted id match.
 */
export async function getLeafCategoryByVintedIdFromDb(
  vintedId: string,
): Promise<string | undefined> {
  const supabase = await createSupabaseServerClient()

  // Use JSONB containment: platforms @> '{"vinted": {"id": "1234"}}'
  const { data } = await supabase
    .from('categories')
    .select('value')
    .contains('platforms', { vinted: { id: vintedId } })
    .limit(1)
    .single()

  if (data?.value) return data.value

  // Fallback: check the hardcoded fallback map (parent/sibling Vinted IDs
  // that don't appear as direct leaf IDs in the tree)
  const VINTED_FALLBACK_ID_TO_LEAF: Record<string, string> = {
    '2997': 'books_media_books',
    '2993': 'books_media_movies',
    '2995': 'electronics_video_games_and_consoles',
    '1934': 'home_garden_general',
    '3822': 'home_garden_home_decor',
    '1920': 'home_garden_kitchen_and_dining',
    '3154': 'home_garden_furniture',
    '3816': 'home_garden_bedding',
    '3832': 'home_garden_bath',
    '3512': 'home_garden_appliances',
    '3823': 'collectibles_general',
    '4': 'clothing_womenswear_general',
    '2050': 'clothing_menswear_general',
    '1187': 'craft_supplies_general',
    '1499': 'toys_games_general',
    '3847': 'art_paintings',
    '3849': 'art_posters_and_prints',
    '1193': 'baby_toddler_general',
    '5196': 'pet_supplies_general',
    '1960': 'home_garden_kitchen_and_dining',
    '1959': 'home_garden_kitchen_and_dining',
    '3856': 'home_garden_kitchen_and_dining', // Vinted: Tableware > Serveware > Coffee pots & teapots
    '3857': 'home_garden_kitchen_and_dining', // Vinted: Tableware > Serveware > Jugs
    '2005': 'home_garden_kitchen_and_dining', // Vinted: Tableware > Drinkware
  }

  return VINTED_FALLBACK_ID_TO_LEAF[vintedId]
}

// ---------------------------------------------------------------------------
// Bulk helpers (for AI routes that need the full tree)
// ---------------------------------------------------------------------------

/** Fetch all categories, optionally filtered to one top-level */
export async function getAllCategories(topLevel?: string): Promise<CategoryRow[]> {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from('categories')
    .select('value, label, top_level, parent_group, platforms, sort_order, legacy_values')
    .order('sort_order')

  if (topLevel) {
    query = query.eq('top_level', topLevel)
  }

  const { data } = await query
  return (data as CategoryRow[] | null) ?? []
}

/** Get all distinct top-level keys */
export async function getTopLevelKeys(): Promise<string[]> {
  const all = await getAllCategories()
  const keys = new Set<string>()
  for (const row of all) keys.add(row.top_level)
  return [...keys].sort()
}

/**
 * Build a CATEGORY_TREE-like structure from the DB.
 * Returns Record<topLevel, Record<slug, CategoryRow>>
 * where slug is the portion after the top_level prefix.
 */
export async function getCategoryTree(): Promise<Record<string, Record<string, CategoryRow>>> {
  const all = await getAllCategories()
  const tree: Record<string, Record<string, CategoryRow>> = {}
  for (const row of all) {
    if (!tree[row.top_level]) tree[row.top_level] = {}
    // Use the leaf part of the value as the key (same as the TS const)
    const prefix = row.top_level + '_'
    const slug = row.value.startsWith(prefix)
      ? row.value.slice(prefix.length)
      : row.value
    tree[row.top_level]![slug] = row
  }
  return tree
}

/**
 * Build a flat lookup: canonical value → { label, topLevel }
 * Equivalent to the old CATEGORY_MAP export.
 */
export async function getCategoryMap(): Promise<Record<string, { label: string; topLevel: string }>> {
  const all = await getAllCategories()
  const map: Record<string, { label: string; topLevel: string }> = {}
  for (const row of all) {
    map[row.value] = { label: row.label, topLevel: row.top_level }
  }
  return map
}

/**
 * Build the LEGACY_CATEGORY_MAP equivalent from DB (legacy_values → value).
 */
export async function getLegacyCategoryMap(): Promise<Record<string, string>> {
  const all = await getAllCategories()
  const map: Record<string, string> = {}
  for (const row of all) {
    if (row.legacy_values) {
      for (const lv of row.legacy_values) {
        map[lv] = row.value
      }
    }
  }
  return map
}

// ---------------------------------------------------------------------------
// Field requirements (replaces category-field-requirements.ts for server use)
// ---------------------------------------------------------------------------

/**
 * Get field requirements for a category + marketplace from DB.
 * Falls back to empty array if no row found.
 */
export async function getCategoryFieldsFromDb(
  category: string,
  marketplace: string,
): Promise<CategoryFieldDef[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('category_field_requirements')
    .select('fields')
    .eq('category_value', category)
    .eq('platform', marketplace)
    .single()

  if (data?.fields && Array.isArray(data.fields)) {
    return data.fields as CategoryFieldDef[]
  }
  return []
}
