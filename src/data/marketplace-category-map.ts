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
  clothing: { ebayId: '11450', ebayName: 'Clothes, Shoes & Accessories', vintedId: 4, vintedName: "Women's Clothing" },
  homeware: { ebayId: '11700', ebayName: 'Home, Furniture & DIY', vintedId: 1934, vintedName: 'Home accessories' },
  collectibles: { ebayId: '11116', ebayName: 'Collectables', vintedId: 3823, vintedName: 'Decorative accessories' },
  medals: { ebayId: '15273', ebayName: 'Medals', vintedId: 167, vintedName: 'Brooches' },
  toys: { ebayId: '220', ebayName: 'Toys & Games', vintedId: 1499, vintedName: 'Toys' },
  furniture: { ebayId: '3197', ebayName: 'Furniture', vintedId: 3154, vintedName: 'Furniture' },
  teapots: { ebayId: '870', ebayName: 'Pottery & China', vintedId: 3856, vintedName: 'Coffee pots & teapots' },
  jugs: { ebayId: '870', ebayName: 'Pottery & China', vintedId: 3857, vintedName: 'Jugs' },
  other: { ebayId: '99', ebayName: 'Everything Else', vintedId: null, vintedName: null },
}

/**
 * Hierarchical category subcategories
 * Used for drill-down category picker (Crosslist-style)
 * Leaf nodes are what get stored in find.category
 */
export interface CategoryNode {
  value: string
  label: string
  ebayId: string
  ebayName: string
  vintedId: number
  vintedName: string
}

export const CATEGORY_TREE: Record<string, Record<string, CategoryNode>> = {
  // Ceramics & Tableware
  ceramics: {
    plates: {
      value: 'ceramics_plates',
      label: 'Plates',
      ebayId: '870',
      ebayName: 'Pottery & China',
      vintedId: 1960,
      vintedName: 'Dinnerware',
    },
    bowls: {
      value: 'ceramics_bowls',
      label: 'Bowls',
      ebayId: '870',
      ebayName: 'Pottery & China',
      vintedId: 1959,
      vintedName: 'Dinnerware',
    },
    dinnerSets: {
      value: 'ceramics_dinner_sets',
      label: 'Dinner Sets',
      ebayId: '870',
      ebayName: 'Pottery & China',
      vintedId: 1958,
      vintedName: 'Dinnerware',
    },
    teapots: {
      value: 'ceramics_teapots',
      label: 'Teapots & Coffee Pots',
      ebayId: '870',
      ebayName: 'Pottery & China',
      vintedId: 3856,
      vintedName: 'Coffee pots & teapots',
    },
    jugs: {
      value: 'ceramics_jugs',
      label: 'Jugs',
      ebayId: '870',
      ebayName: 'Pottery & China',
      vintedId: 3857,
      vintedName: 'Jugs',
    },
    vases: {
      value: 'ceramics_vases',
      label: 'Vases',
      ebayId: '870',
      ebayName: 'Pottery & China',
      vintedId: 1940,
      vintedName: 'Home accessories',
    },
    other: {
      value: 'ceramics_other',
      label: 'Other Ceramics',
      ebayId: '870',
      ebayName: 'Pottery & China',
      vintedId: 1920,
      vintedName: 'Tableware',
    },
  },
  // Glassware
  glassware: {
    drinkware: {
      value: 'glassware_drinkware',
      label: 'Cups & Mugs',
      ebayId: '11700',
      ebayName: 'Glass',
      vintedId: 2006,
      vintedName: 'Drinkware',
    },
    glasses: {
      value: 'glassware_glasses',
      label: 'Stemmed Glasses',
      ebayId: '11700',
      ebayName: 'Glass',
      vintedId: 2009,
      vintedName: 'Drinkware',
    },
    tumblers: {
      value: 'glassware_tumblers',
      label: 'Tumblers',
      ebayId: '11700',
      ebayName: 'Glass',
      vintedId: 2010,
      vintedName: 'Drinkware',
    },
    vases: {
      value: 'glassware_vases',
      label: 'Vases',
      ebayId: '11700',
      ebayName: 'Glass',
      vintedId: 2005,
      vintedName: 'Drinkware',
    },
    other: {
      value: 'glassware_other',
      label: 'Other Glassware',
      ebayId: '11700',
      ebayName: 'Glass',
      vintedId: 2005,
      vintedName: 'Drinkware',
    },
  },
  // Books
  books: {
    fiction: {
      value: 'books_fiction',
      label: 'Fiction',
      ebayId: '267',
      ebayName: 'Books',
      vintedId: 2997,
      vintedName: 'Books',
    },
    nonfiction: {
      value: 'books_nonfiction',
      label: 'Non-Fiction',
      ebayId: '267',
      ebayName: 'Books',
      vintedId: 2997,
      vintedName: 'Books',
    },
    academic: {
      value: 'books_academic',
      label: 'Academic',
      ebayId: '267',
      ebayName: 'Books',
      vintedId: 2997,
      vintedName: 'Books',
    },
    illustrated: {
      value: 'books_illustrated',
      label: 'Illustrated & Art',
      ebayId: '267',
      ebayName: 'Books',
      vintedId: 2997,
      vintedName: 'Books',
    },
    other: {
      value: 'books_other',
      label: 'Other Books',
      ebayId: '267',
      ebayName: 'Books',
      vintedId: 2997,
      vintedName: 'Books',
    },
  },
  // Jewellery
  jewellery: {
    earrings: {
      value: 'jewellery_earrings',
      label: 'Earrings',
      ebayId: '281',
      ebayName: 'Jewellery & Watches',
      vintedId: 163,
      vintedName: 'Jewellery',
    },
    necklaces: {
      value: 'jewellery_necklaces',
      label: 'Necklaces',
      ebayId: '281',
      ebayName: 'Jewellery & Watches',
      vintedId: 164,
      vintedName: 'Jewellery',
    },
    bracelets: {
      value: 'jewellery_bracelets',
      label: 'Bracelets',
      ebayId: '281',
      ebayName: 'Jewellery & Watches',
      vintedId: 165,
      vintedName: 'Jewellery',
    },
    rings: {
      value: 'jewellery_rings',
      label: 'Rings',
      ebayId: '281',
      ebayName: 'Jewellery & Watches',
      vintedId: 553,
      vintedName: 'Jewellery',
    },
    brooches: {
      value: 'jewellery_brooches',
      label: 'Brooches',
      ebayId: '281',
      ebayName: 'Jewellery & Watches',
      vintedId: 167,
      vintedName: 'Jewellery',
    },
    other: {
      value: 'jewellery_other',
      label: 'Other Jewellery',
      ebayId: '281',
      ebayName: 'Jewellery & Watches',
      vintedId: 21,
      vintedName: 'Jewellery',
    },
  },
  // Clothing
  clothing: {
    dresses: {
      value: 'clothing_dresses',
      label: 'Dresses',
      ebayId: '11450',
      ebayName: 'Clothes, Shoes & Accessories',
      vintedId: 4,
      vintedName: "Women's Clothing",
    },
    tops: {
      value: 'clothing_tops',
      label: 'Tops & Shirts',
      ebayId: '11450',
      ebayName: 'Clothes, Shoes & Accessories',
      vintedId: 4,
      vintedName: "Women's Clothing",
    },
    trousers: {
      value: 'clothing_trousers',
      label: 'Trousers',
      ebayId: '11450',
      ebayName: 'Clothes, Shoes & Accessories',
      vintedId: 4,
      vintedName: "Women's Clothing",
    },
    skirts: {
      value: 'clothing_skirts',
      label: 'Skirts',
      ebayId: '11450',
      ebayName: 'Clothes, Shoes & Accessories',
      vintedId: 4,
      vintedName: "Women's Clothing",
    },
    coats: {
      value: 'clothing_coats',
      label: 'Coats & Jackets',
      ebayId: '11450',
      ebayName: 'Clothes, Shoes & Accessories',
      vintedId: 4,
      vintedName: "Women's Clothing",
    },
    other: {
      value: 'clothing_other',
      label: 'Other Clothing',
      ebayId: '11450',
      ebayName: 'Clothes, Shoes & Accessories',
      vintedId: 4,
      vintedName: "Women's Clothing",
    },
  },
  // Homeware
  homeware: {
    candles: {
      value: 'homeware_candles',
      label: 'Candles',
      ebayId: '11700',
      ebayName: 'Home, Furniture & DIY',
      vintedId: 1935,
      vintedName: 'Home accessories',
    },
    clocks: {
      value: 'homeware_clocks',
      label: 'Clocks',
      ebayId: '11700',
      ebayName: 'Home, Furniture & DIY',
      vintedId: 1936,
      vintedName: 'Home accessories',
    },
    storage: {
      value: 'homeware_storage',
      label: 'Storage & Organization',
      ebayId: '11700',
      ebayName: 'Home, Furniture & DIY',
      vintedId: 1939,
      vintedName: 'Home accessories',
    },
    vases: {
      value: 'homeware_vases',
      label: 'Vases & Decorative',
      ebayId: '11700',
      ebayName: 'Home, Furniture & DIY',
      vintedId: 1940,
      vintedName: 'Home accessories',
    },
    other: {
      value: 'homeware_other',
      label: 'Other Home Accessories',
      ebayId: '11700',
      ebayName: 'Home, Furniture & DIY',
      vintedId: 1934,
      vintedName: 'Home accessories',
    },
  },
  // Furniture
  furniture: {
    seating: {
      value: 'furniture_seating',
      label: 'Seating',
      ebayId: '3197',
      ebayName: 'Furniture',
      vintedId: 3158,
      vintedName: 'Furniture',
    },
    tables: {
      value: 'furniture_tables',
      label: 'Tables',
      ebayId: '3197',
      ebayName: 'Furniture',
      vintedId: 3160,
      vintedName: 'Furniture',
    },
    storage: {
      value: 'furniture_storage',
      label: 'Storage & Shelving',
      ebayId: '3197',
      ebayName: 'Furniture',
      vintedId: 3187,
      vintedName: 'Furniture',
    },
    bedroom: {
      value: 'furniture_bedroom',
      label: 'Bedroom Furniture',
      ebayId: '3197',
      ebayName: 'Furniture',
      vintedId: 3154,
      vintedName: 'Furniture',
    },
    other: {
      value: 'furniture_other',
      label: 'Other Furniture',
      ebayId: '3197',
      ebayName: 'Furniture',
      vintedId: 3154,
      vintedName: 'Furniture',
    },
  },
  // Toys
  toys: {
    figures: {
      value: 'toys_figures',
      label: 'Toy Figures & Collectibles',
      ebayId: '220',
      ebayName: 'Toys & Games',
      vintedId: 1730,
      vintedName: 'Toys',
    },
    softToys: {
      value: 'toys_soft',
      label: 'Soft Toys & Plushes',
      ebayId: '220',
      ebayName: 'Toys & Games',
      vintedId: 1764,
      vintedName: 'Toys',
    },
    educational: {
      value: 'toys_educational',
      label: 'Educational Toys',
      ebayId: '220',
      ebayName: 'Toys & Games',
      vintedId: 1763,
      vintedName: 'Toys',
    },
    other: {
      value: 'toys_other',
      label: 'Other Toys',
      ebayId: '220',
      ebayName: 'Toys & Games',
      vintedId: 1499,
      vintedName: 'Toys',
    },
  },
  // Other (catch-all)
  other: {
    collectibles: {
      value: 'other_collectibles',
      label: 'Collectibles',
      ebayId: '11116',
      ebayName: 'Collectables',
      vintedId: 3823,
      vintedName: 'Decorative accessories',
    },
    other: {
      value: 'other_misc',
      label: 'Miscellaneous',
      ebayId: '99',
      ebayName: 'Everything Else',
      vintedId: 1934,
      vintedName: 'Home accessories',
    },
  },
}
