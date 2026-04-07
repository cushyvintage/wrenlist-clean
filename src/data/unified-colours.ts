/**
 * Unified colour list for all marketplaces.
 * One picker → maps to Vinted (numeric ID), Depop (slug), eBay/Etsy/Shopify/Facebook (text label).
 * Superset of Vinted (31) + Depop-only "Tan" = 32 colours.
 */

export interface UnifiedColour {
  label: string
  hex: string
  vintedId: number | null
  depopSlug: string | null
}

export const UNIFIED_COLOURS: UnifiedColour[] = [
  { label: 'Black',        hex: '#000000', vintedId: 1,    depopSlug: 'black' },
  { label: 'Grey',         hex: '#808080', vintedId: 3,    depopSlug: 'grey' },
  { label: 'White',        hex: '#FFFFFF', vintedId: 4,    depopSlug: 'white' },
  { label: 'Beige',        hex: '#F5F5DC', vintedId: 5,    depopSlug: null },
  { label: 'Pink',         hex: '#FFC0CB', vintedId: 6,    depopSlug: 'pink' },
  { label: 'Red',          hex: '#FF0000', vintedId: 7,    depopSlug: 'red' },
  { label: 'Orange',       hex: '#FFA500', vintedId: 8,    depopSlug: 'orange' },
  { label: 'Yellow',       hex: '#FFFF00', vintedId: 9,    depopSlug: 'yellow' },
  { label: 'Khaki',        hex: '#C3B091', vintedId: 10,   depopSlug: 'khaki' },
  { label: 'Green',        hex: '#008000', vintedId: 11,   depopSlug: 'green' },
  { label: 'Blue',         hex: '#0000FF', vintedId: 12,   depopSlug: 'blue' },
  { label: 'Navy',         hex: '#000080', vintedId: 13,   depopSlug: 'navy' },
  { label: 'Purple',       hex: '#800080', vintedId: 14,   depopSlug: 'purple' },
  { label: 'Burgundy',     hex: '#800020', vintedId: 15,   depopSlug: 'burgundy' },
  { label: 'Brown',        hex: '#8B4513', vintedId: 16,   depopSlug: 'brown' },
  { label: 'Cream',        hex: '#FFFDD0', vintedId: 17,   depopSlug: 'cream' },
  { label: 'Gold',         hex: '#FFD700', vintedId: 18,   depopSlug: 'gold' },
  { label: 'Copper',       hex: '#B87333', vintedId: 19,   depopSlug: null },
  { label: 'Silver',       hex: '#C0C0C0', vintedId: 20,   depopSlug: 'silver' },
  { label: 'Multi-colour', hex: '#FFFFFF', vintedId: 21,   depopSlug: 'multi' },
  { label: 'Nude',         hex: '#F2D3BC', vintedId: 22,   depopSlug: null },
  { label: 'Turquoise',    hex: '#40E0D0', vintedId: 23,   depopSlug: null },
  { label: 'Teal',         hex: '#008080', vintedId: 24,   depopSlug: null },
  { label: 'Olive',        hex: '#808000', vintedId: 25,   depopSlug: null },
  { label: 'Coral',        hex: '#FF7F50', vintedId: 26,   depopSlug: null },
  { label: 'Mint',         hex: '#98FF98', vintedId: 27,   depopSlug: null },
  { label: 'Lilac',        hex: '#C8A2C8', vintedId: 28,   depopSlug: null },
  { label: 'Rose',         hex: '#FF007F', vintedId: 29,   depopSlug: null },
  { label: 'Charcoal',     hex: '#36454F', vintedId: 30,   depopSlug: null },
  { label: 'Indigo',       hex: '#4B0082', vintedId: 31,   depopSlug: null },
  { label: 'Tan',          hex: '#D2B48C', vintedId: null,  depopSlug: 'tan' },
]

/** Look up unified colour by label (case-insensitive) */
export function findColourByLabel(label: string): UnifiedColour | undefined {
  return UNIFIED_COLOURS.find(c => c.label.toLowerCase() === label.toLowerCase())
}

/** Look up unified colour by Vinted ID */
export function findColourByVintedId(id: number): UnifiedColour | undefined {
  return UNIFIED_COLOURS.find(c => c.vintedId === id)
}

/** Etsy: Who made options */
export const ETSY_WHO_MADE = [
  { value: 'i_did', label: 'I did' },
  { value: 'collective', label: 'A member of my shop' },
  { value: 'someone_else', label: 'Another company or person' },
] as const

/** Etsy: When made options */
export const ETSY_WHEN_MADE = [
  { value: 'made_to_order', label: 'Made to order' },
  { value: '2020_2026', label: '2020-2026' },
  { value: '2010_2019', label: '2010-2019' },
  { value: '2000_2009', label: '2000-2009' },
  { value: '1990s', label: '1990s' },
  { value: '1980s', label: '1980s' },
  { value: '1970s', label: '1970s' },
  { value: '1960s', label: '1960s' },
  { value: '1950s', label: '1950s' },
  { value: '1940s', label: '1940s' },
  { value: '1930s', label: '1930s' },
  { value: '1920s', label: '1920s' },
  { value: 'before_1920', label: 'Before 1920s' },
] as const

/** Depop: Source options (max 2) */
export const DEPOP_SOURCES = [
  { value: 'vintage', label: 'Vintage' },
  { value: 'preloved', label: 'Preloved' },
  { value: 'reworked', label: 'Reworked / Upcycled' },
  { value: 'custom', label: 'Custom' },
  { value: 'handmade', label: 'Handmade' },
  { value: 'deadstock', label: 'Deadstock' },
  { value: 'designer', label: 'Designer' },
  { value: 'repaired', label: 'Repaired' },
] as const

/** Depop: Age/era options (max 1) */
export const DEPOP_AGES = [
  { value: 'modern', label: 'Modern' },
  { value: 'y2k', label: '00s' },
  { value: '90s', label: '90s' },
  { value: '80s', label: '80s' },
  { value: '70s', label: '70s' },
  { value: '60s', label: '60s' },
  { value: '50s', label: '50s' },
  { value: 'antique', label: 'Antique' },
] as const

/** Depop: Style tags (max 3) */
export const DEPOP_STYLE_TAGS = [
  'Streetwear', 'Sportswear', 'Loungewear', 'Goth', 'Retro', 'Trap', 'Boho',
  'Western', 'Indie', 'Skater', 'Cute', 'Chic', 'Rave', 'Pastel', 'Bright',
  'Costume', 'Cosplay', 'Grunge', 'Party', 'Funky', 'Emo', 'Minimalist',
  'Preppy', 'Avant Garde', 'Punk', 'Glam', 'Regency', 'Casual', 'Utility',
  'Futuristic', 'Cottage', 'Fairy', 'Kidcore', 'Y2K', 'Biker', 'Gorpcore',
  'Twee', 'Coquette', 'Whimsygoth',
] as const

/** Title char limits per platform (use min of selected) */
export const PLATFORM_TITLE_LIMITS: Record<string, number> = {
  ebay: 80,
  vinted: 100,
  facebook: 99,
  etsy: 140,
  depop: 255,
  shopify: 255,
}

/** Description char limits per platform (use min of selected) */
export const PLATFORM_DESCRIPTION_LIMITS: Record<string, number> = {
  depop: 1000,
  vinted: 2000,
  shopify: 5000,
  facebook: 9999,
  ebay: 12000,
  etsy: 12000,
}

/**
 * Vinted materials — numeric IDs from Vinted API (/api/v2/materials)
 * Used for the material multi-select (max 3) when Vinted is selected.
 * Last verified: 2026-04-07
 */
export const VINTED_MATERIALS = [
  { id: 1, label: 'Cotton' },
  { id: 2, label: 'Linen' },
  { id: 3, label: 'Silk' },
  { id: 4, label: 'Cashmere' },
  { id: 5, label: 'Wool' },
  { id: 6, label: 'Synthetic' },
  { id: 7, label: 'Denim' },
  { id: 8, label: 'Leather' },
  { id: 9, label: 'Suede' },
  { id: 10, label: 'Velvet' },
  { id: 11, label: 'Corduroy' },
  { id: 12, label: 'Faux leather' },
  { id: 13, label: 'Satin' },
  { id: 14, label: 'Chiffon' },
  { id: 15, label: 'Lace' },
  { id: 16, label: 'Knit' },
  { id: 17, label: 'Fleece' },
  { id: 18, label: 'Tweed' },
  { id: 19, label: 'Nylon' },
  { id: 20, label: 'Polyester' },
  { id: 21, label: 'Acrylic' },
  { id: 22, label: 'Viscose' },
  { id: 23, label: 'Elastane' },
  { id: 24, label: 'Metal' },
  { id: 25, label: 'Plastic' },
  { id: 26, label: 'Rubber' },
  { id: 27, label: 'Wood' },
  { id: 28, label: 'Glass' },
  { id: 29, label: 'Ceramic' },
  { id: 30, label: 'Porcelain' },
  { id: 31, label: 'Stone' },
  { id: 32, label: 'Paper' },
  { id: 33, label: 'Canvas' },
  { id: 34, label: 'Fur' },
  { id: 35, label: 'Faux fur' },
  { id: 36, label: 'Down' },
  { id: 37, label: 'Gore-Tex' },
  { id: 38, label: 'Lycra' },
  { id: 39, label: 'Bamboo' },
  { id: 40, label: 'Hemp' },
  { id: 41, label: 'Mohair' },
  { id: 42, label: 'Angora' },
  { id: 43, label: 'Organza' },
  { id: 44, label: 'Tulle' },
  { id: 45, label: 'Taffeta' },
  { id: 46, label: 'Jersey' },
  { id: 47, label: 'Other' },
] as const
