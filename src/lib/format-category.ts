/**
 * Converts a category slug to a short human-readable label for inventory UI.
 *
 * Rules:
 * - Drop the top-level prefix (the inventory row already lives under a
 *   category filter; "Clothing Womenswear Womens Dresses" collapses to
 *   "Womenswear womens dresses" → still legible, shorter).
 * - Drop a trailing "general" filler ("home_garden_general" → "Garden").
 * - `_and_` → ` & ` so "glassware and drinkware" reads as "glassware &
 *   drinkware" (matches how humans write these).
 * - Sentence-case, not title-case — less shouty in dense tables.
 *
 * The original long version is still useful as a `title=""` tooltip on
 * hover; callers can reconstruct it with `formatCategoryLong(slug)`.
 */
export function formatCategory(slug: string | null | undefined): string {
  if (!slug) return ''
  const tokens = slug.toLowerCase().split('_')
  let rest = tokens.slice(1)
  if (rest.length > 0 && rest[rest.length - 1] === 'general') {
    rest = rest.slice(0, -1)
  }
  // If stripping top-level + "general" leaves nothing (e.g. a two-token slug
  // like "other_general"), fall back to the top-level itself.
  if (rest.length === 0) rest = tokens.slice(0, 1)
  const text = rest.join(' ').replace(/\band\b/g, '&')
  return text.length === 0 ? '' : text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Full Title Case version of the slug, for hover tooltips or detail views
 * where the extra context is worth the length.
 */
export function formatCategoryLong(slug: string | null | undefined): string {
  if (!slug) return ''
  return slug
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
