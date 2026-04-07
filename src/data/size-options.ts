/**
 * Size options for the add-find form.
 *
 * Sizes are category-dependent. We define common size groups and map
 * top-level Wrenlist categories to the appropriate group. The extension
 * resolves size text to platform-specific IDs at publish time (Vinted
 * looks up size_id via its API, Depop uses variantSetId, eBay/Etsy
 * accept free text).
 *
 * Vinted size IDs are included where known. For categories without a
 * known ID mapping, the text value is stored and the extension resolves
 * at publish time.
 */

export interface SizeOption {
  label: string
  vintedId?: number // Vinted size_id if known
}

export interface SizeGroup {
  id: string
  label: string
  sizes: SizeOption[]
}

// ── Common size groups ──

export const SIZE_GROUPS: Record<string, SizeGroup> = {
  clothing_letter: {
    id: 'clothing_letter',
    label: 'Clothing (letter)',
    sizes: [
      { label: 'XXS', vintedId: 206 },
      { label: 'XS', vintedId: 207 },
      { label: 'S', vintedId: 208 },
      { label: 'M', vintedId: 209 },
      { label: 'L', vintedId: 210 },
      { label: 'XL', vintedId: 211 },
      { label: 'XXL', vintedId: 212 },
      { label: '3XL', vintedId: 213 },
      { label: '4XL', vintedId: 214 },
      { label: '5XL', vintedId: 215 },
    ],
  },
  clothing_uk_number: {
    id: 'clothing_uk_number',
    label: 'Clothing (UK number)',
    sizes: [
      { label: 'UK 4', vintedId: 776 },
      { label: 'UK 6', vintedId: 777 },
      { label: 'UK 8', vintedId: 778 },
      { label: 'UK 10', vintedId: 779 },
      { label: 'UK 12', vintedId: 780 },
      { label: 'UK 14', vintedId: 781 },
      { label: 'UK 16', vintedId: 782 },
      { label: 'UK 18', vintedId: 783 },
      { label: 'UK 20', vintedId: 784 },
      { label: 'UK 22', vintedId: 785 },
      { label: 'UK 24', vintedId: 786 },
      { label: 'UK 26', vintedId: 787 },
      { label: 'UK 28', vintedId: 788 },
      { label: 'UK 30', vintedId: 789 },
      { label: 'UK 32', vintedId: 790 },
    ],
  },
  shoes_uk: {
    id: 'shoes_uk',
    label: 'Shoes (UK)',
    sizes: [
      { label: 'UK 3', vintedId: 55 },
      { label: 'UK 3.5', vintedId: 1195 },
      { label: 'UK 4', vintedId: 56 },
      { label: 'UK 4.5', vintedId: 1196 },
      { label: 'UK 5', vintedId: 57 },
      { label: 'UK 5.5', vintedId: 1197 },
      { label: 'UK 6', vintedId: 58 },
      { label: 'UK 6.5', vintedId: 1198 },
      { label: 'UK 7', vintedId: 59 },
      { label: 'UK 7.5', vintedId: 1199 },
      { label: 'UK 8', vintedId: 60 },
      { label: 'UK 8.5', vintedId: 1200 },
      { label: 'UK 9', vintedId: 61 },
      { label: 'UK 9.5', vintedId: 1201 },
      { label: 'UK 10', vintedId: 62 },
      { label: 'UK 10.5', vintedId: 1202 },
      { label: 'UK 11', vintedId: 63 },
      { label: 'UK 11.5', vintedId: 1203 },
      { label: 'UK 12', vintedId: 64 },
      { label: 'UK 13', vintedId: 65 },
    ],
  },
  jeans_waist: {
    id: 'jeans_waist',
    label: 'Jeans (waist)',
    sizes: [
      { label: 'W26' }, { label: 'W27' }, { label: 'W28' }, { label: 'W29' },
      { label: 'W30' }, { label: 'W31' }, { label: 'W32' }, { label: 'W33' },
      { label: 'W34' }, { label: 'W36' }, { label: 'W38' }, { label: 'W40' },
      { label: 'W42' }, { label: 'W44' },
    ],
  },
  one_size: {
    id: 'one_size',
    label: 'One size',
    sizes: [
      { label: 'One size', vintedId: 205 },
    ],
  },
  none: {
    id: 'none',
    label: 'No standard sizes',
    sizes: [],
  },
}

/**
 * Map top-level Wrenlist category to default size group.
 * Falls back to 'none' for categories where sizes don't apply.
 */
export const CATEGORY_SIZE_MAP: Record<string, string> = {
  clothing: 'clothing_letter',
  sports_outdoors: 'clothing_letter',
  baby_toddler: 'clothing_letter',
  // Categories where size is uncommon
  antiques: 'none',
  art: 'none',
  books_media: 'none',
  collectibles: 'none',
  craft_supplies: 'none',
  electronics: 'none',
  health_beauty: 'none',
  home_garden: 'none',
  musical_instruments: 'none',
  other: 'none',
  pet_supplies: 'none',
  toys_games: 'none',
  vehicles_parts: 'none',
}

/** Get the size group for a category, with subcategory overrides */
export function getSizeGroupForCategory(category: string): SizeGroup {
  if (!category) return SIZE_GROUPS.none!

  // Check for shoe subcategories
  const lower = category.toLowerCase()
  if (lower.includes('shoe') || lower.includes('boot') || lower.includes('trainer') || lower.includes('sneaker') || lower.includes('footwear')) {
    return SIZE_GROUPS.shoes_uk!
  }
  if (lower.includes('jean') || lower.includes('trouser') || lower.includes('pant')) {
    return SIZE_GROUPS.jeans_waist!
  }
  if (lower.includes('hat') || lower.includes('scarf') || lower.includes('glove') || lower.includes('belt') || lower.includes('bag') || lower.includes('wallet') || lower.includes('jewel') || lower.includes('watch') || lower.includes('sunglasses')) {
    return SIZE_GROUPS.one_size!
  }

  // Top-level category lookup
  const topLevel = category.split('_')[0]!
  const groupId = CATEGORY_SIZE_MAP[topLevel] || CATEGORY_SIZE_MAP[category] || 'none'
  return SIZE_GROUPS[groupId] || SIZE_GROUPS.none!
}

/** All size groups for the "change size type" dropdown */
export const ALL_SIZE_GROUPS = Object.values(SIZE_GROUPS).filter(g => g.id !== 'none')
