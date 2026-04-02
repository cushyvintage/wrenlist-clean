/**
 * Maps Wrenlist canonical categories to platform category IDs and names
 * Used for auto-mapping when user selects a marketplace
 *
 * Vinted category IDs (vintedId) — fetch full tree once logged in:
 *   GET https://www.vinted.co.uk/api/v2/catalog?page=1&per_page=100 (requires session cookie)
 * Store result in src/data/vinted-categories.json and import here.
 * Current IDs are approximate — verify against live API before launch.
 */
export const CATEGORY_MAP: Record<
  string,
  {
    ebayId: string
    ebayName: string
    vintedId: number | null
    vintedName: string | null
  }
> = {
  ceramics: {
    ebayId: '870',
    ebayName: 'Pottery & China',
    vintedId: null,
    vintedName: null,
  },
  glassware: {
    ebayId: '11700',
    ebayName: 'Glass',
    vintedId: null,
    vintedName: null,
  },
  books: {
    ebayId: '267',
    ebayName: 'Books',
    vintedId: 28,
    vintedName: 'Books & Comics',
  },
  jewellery: {
    ebayId: '281',
    ebayName: 'Jewellery & Watches',
    vintedId: 54,
    vintedName: 'Jewellery & Accessories',
  },
  jewelry: {
    ebayId: '281',
    ebayName: 'Jewellery & Watches',
    vintedId: 54,
    vintedName: 'Jewellery & Accessories',
  },
  clothing: {
    ebayId: '11450',
    ebayName: 'Clothes, Shoes & Accessories',
    vintedId: 4,
    vintedName: "Women's clothing",
  },
  homeware: {
    ebayId: '11700',
    ebayName: 'Home, Furniture & DIY',
    vintedId: 12,
    vintedName: 'Home & Garden',
  },
  home: {
    ebayId: '11700',
    ebayName: 'Home, Furniture & DIY',
    vintedId: 12,
    vintedName: 'Home & Garden',
  },
  collectibles: {
    ebayId: '11116',
    ebayName: 'Collectables',
    vintedId: null,
    vintedName: null,
  },
  medals: {
    ebayId: '15273',
    ebayName: 'Medals',
    vintedId: null,
    vintedName: null,
  },
  toys: {
    ebayId: '220',
    ebayName: 'Toys & Games',
    vintedId: null,
    vintedName: null,
  },
  furniture: {
    ebayId: '3197',
    ebayName: 'Furniture',
    vintedId: 12,
    vintedName: 'Home & Garden',
  },
  other: {
    ebayId: '99',
    ebayName: 'Everything Else',
    vintedId: null,
    vintedName: null,
  },
}
