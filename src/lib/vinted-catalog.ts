/** Resolve Vinted catalog ID from category tree DB mappings, walking up the category hierarchy */
export function getVintedCatalogId(
  category: string,
  getPlatformId: (value: string, platform: string) => string | undefined
): number | null {
  // Try exact category match
  const mapped = getPlatformId(category, 'vinted')
  if (mapped) return Number(mapped)

  // Try parent segment (e.g. clothing_womenswear_womens_dresses -> clothing_womenswear)
  const parts = category.split('_')
  if (parts.length > 2) {
    const parent = parts.slice(0, 2).join('_')
    const parentId = getPlatformId(parent, 'vinted')
    if (parentId) return Number(parentId)
  }

  // Try top-level (e.g. clothing)
  const topLevel = parts[0]
  if (parts.length > 1 && topLevel) {
    const topId = getPlatformId(topLevel, 'vinted')
    if (topId) return Number(topId)
  }

  return null
}
