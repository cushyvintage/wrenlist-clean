/**
 * Converts a category slug to a human-readable display label.
 * e.g. `clothing_womenswear_womens_tops_and_blouses` → `Clothing Womenswear Womens Tops And Blouses`
 */
export function formatCategory(slug: string | null | undefined): string {
  if (!slug) return ''
  return slug
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
