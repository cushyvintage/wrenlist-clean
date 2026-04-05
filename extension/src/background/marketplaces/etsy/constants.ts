export const ETSY_BASE_URL = "https://www.etsy.com";
export const ETSY_CREATE_LISTING_URL =
  "https://www.etsy.com/your/shops/me/listing-editor/create";
export const ETSY_EDIT_LISTING_URL =
  "https://www.etsy.com/your/shops/me/listing-editor";
export const ETSY_LISTINGS_MANAGER_URL =
  "https://www.etsy.com/your/shops/me/tools/listings";
export const ETSY_SESSION_COOKIE = "uaid";

/**
 * Wrenlist category → Etsy category search terms.
 * The Etsy listing form uses a search typeahead at #category-field-search.
 * We type the search term and pick the first suggestion.
 */
/**
 * Top-level Wrenlist categories → Etsy search terms.
 * Covers CATEGORY_MAP keys and CATEGORIES const values.
 *
 * Subcategory values like "ceramics_plates" or "jewellery_earrings"
 * are resolved by extracting the prefix before "_" and looking up here.
 * See resolveEtsyCategory() in client.ts.
 */
export const WRENLIST_TO_ETSY_CATEGORY: Record<string, string> = {
  // CATEGORY_MAP top-level keys (src/data/marketplace-category-map.ts)
  ceramics: "Ceramics & Pottery",
  glassware: "Glass",
  books: "Books",
  jewellery: "Jewellery",
  clothing: "Clothing",
  homeware: "Home Décor",
  furniture: "Furniture",
  toys: "Toys",
  collectibles: "Collectibles",
  medals: "Medals & Badges",
  teapots: "Teapots",
  jugs: "Jugs & Pitchers",
  other: "Craft Supplies",
  // CATEGORIES const (clothing-focused labels, lowercased)
  denim: "Denim Clothing",
  workwear: "Workwear",
  footwear: "Shoes",
  bags: "Bags & Purses",
  tops: "Tops & Tees",
  womenswear: "Women's Clothing",
  menswear: "Men's Clothing",
  accessories: "Accessories",
  outerwear: "Jackets & Coats",
  knitwear: "Knitwear",
  vintage: "Vintage",
  // CATEGORY_TREE subcategory refinements (more specific Etsy search terms)
  ceramics_plates: "Ceramic Plates",
  ceramics_bowls: "Ceramic Bowls",
  ceramics_dinner_sets: "Dinner Sets",
  ceramics_teapots: "Teapots",
  ceramics_jugs: "Ceramic Jugs",
  ceramics_vases: "Ceramic Vases",
  ceramics_other: "Ceramics & Pottery",
  glassware_drinkware: "Glass Cups & Mugs",
  glassware_glasses: "Stemmed Glasses",
  glassware_tumblers: "Glass Tumblers",
  glassware_vases: "Glass Vases",
  glassware_other: "Glass",
  books_fiction: "Fiction Books",
  books_nonfiction: "Non-Fiction Books",
  books_academic: "Academic Books",
  books_illustrated: "Art Books",
  books_other: "Books",
  jewellery_earrings: "Earrings",
  jewellery_necklaces: "Necklaces",
  jewellery_bracelets: "Bracelets",
  jewellery_rings: "Rings",
  jewellery_brooches: "Brooches",
  jewellery_other: "Jewellery",
  clothing_dresses: "Dresses",
  clothing_tops: "Tops & Shirts",
  clothing_trousers: "Trousers",
  clothing_skirts: "Skirts",
  clothing_coats: "Coats & Jackets",
  clothing_other: "Clothing",
  homeware_candles: "Candles",
  homeware_clocks: "Clocks",
  homeware_storage: "Storage & Organization",
  homeware_vases: "Vases",
  homeware_other: "Home Décor",
  furniture_seating: "Chairs & Seating",
  furniture_tables: "Tables",
  furniture_storage: "Shelving",
  furniture_bedroom: "Bedroom Furniture",
  furniture_other: "Furniture",
  toys_figures: "Toy Figures",
  toys_soft: "Plush Toys",
  toys_educational: "Educational Toys",
  toys_other: "Toys",
  other_collectibles: "Collectibles",
  other_misc: "Craft Supplies",
};

/**
 * when_made values for the Etsy select dropdown.
 * Default to "before_2007" for vintage items (20+ years old).
 */
export const ETSY_WHEN_MADE_VINTAGE = "before_2007";
export const ETSY_WHEN_MADE_RECENT = "2020_2026";
