/**
 * Maps Wrenlist canonical categories to platform category IDs and names
 * Used for auto-mapping when user selects a marketplace
 *
 * Vinted category IDs verified from live API 2026-04-02 (GET /api/v2/item_upload/catalogs)
 * Full tree summary: src/data/vinted-categories-summary.json
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
  ceramics: { ebayId: '870', ebayName: 'Pottery & China', vintedId: 1920, vintedName: 'Tableware' },
  glassware: { ebayId: '11700', ebayName: 'Glass', vintedId: 2005, vintedName: 'Drinkware' },
  books: { ebayId: '267', ebayName: 'Books', vintedId: 2997, vintedName: 'Books' },
  jewellery: { ebayId: '281', ebayName: 'Jewellery & Watches', vintedId: 21, vintedName: 'Jewellery' },
  jewelry: { ebayId: '281', ebayName: 'Jewellery & Watches', vintedId: 21, vintedName: 'Jewellery' },
  clothing: { ebayId: '11450', ebayName: 'Clothes, Shoes & Accessories', vintedId: 4, vintedName: "Women's Clothing" },
  homeware: { ebayId: '11700', ebayName: 'Home, Furniture & DIY', vintedId: 1934, vintedName: 'Home accessories' },
  home: { ebayId: '11700', ebayName: 'Home, Furniture & DIY', vintedId: 1934, vintedName: 'Home accessories' },
  collectibles: { ebayId: '11116', ebayName: 'Collectables', vintedId: 3823, vintedName: 'Decorative accessories' },
  medals: { ebayId: '15273', ebayName: 'Medals', vintedId: 167, vintedName: 'Brooches' },
  toys: { ebayId: '220', ebayName: 'Toys & Games', vintedId: 1499, vintedName: 'Toys' },
  furniture: { ebayId: '3197', ebayName: 'Furniture', vintedId: 3154, vintedName: 'Furniture' },
  teapots: { ebayId: '870', ebayName: 'Pottery & China', vintedId: 3856, vintedName: 'Coffee pots & teapots' },
  jugs: { ebayId: '870', ebayName: 'Pottery & China', vintedId: 3857, vintedName: 'Jugs' },
  other: { ebayId: '99', ebayName: 'Everything Else', vintedId: null, vintedName: null },
}
