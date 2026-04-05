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
 * Top-level Wrenlist categories → Etsy category search terms.
 *
 * IMPORTANT: Etsy's category typeahead returns PRODUCT categories, not
 * generic labels. "Ceramics" returns craft supplies; "Vase" returns
 * Home & Living > Home Decor > Vases. Use product-level terms.
 *
 * Subcategory values like "ceramics_plates" or "jewellery_earrings"
 * are looked up directly; if not found, the prefix before "_" is used.
 */
export const WRENLIST_TO_ETSY_CATEGORY: Record<string, string> = {
  // CATEGORY_MAP top-level keys — use product-level search terms
  ceramics: "Vase",
  glassware: "Drinking Glass",
  books: "Book",
  jewellery: "Necklace",
  clothing: "Dress",
  homeware: "Vase",
  furniture: "Table",
  toys: "Toy",
  collectibles: "Figurine",
  medals: "Medal",
  teapots: "Teapot",
  jugs: "Jug",
  other: "Vase",
  // CATEGORIES const (clothing-focused)
  denim: "Jeans",
  workwear: "Overalls",
  footwear: "Shoes",
  bags: "Bag",
  tops: "T-Shirt",
  womenswear: "Dress",
  menswear: "Shirt",
  accessories: "Scarf",
  outerwear: "Jacket",
  knitwear: "Sweater",
  vintage: "Dress",
  // CATEGORY_TREE subcategories — specific product terms
  ceramics_plates: "Plate",
  ceramics_bowls: "Bowl",
  ceramics_dinner_sets: "Dinner Set",
  ceramics_teapots: "Teapot",
  ceramics_jugs: "Jug",
  ceramics_vases: "Vase",
  ceramics_other: "Vase",
  glassware_drinkware: "Mug",
  glassware_glasses: "Wine Glass",
  glassware_tumblers: "Tumbler",
  glassware_vases: "Vase",
  glassware_other: "Drinking Glass",
  books_fiction: "Fiction Book",
  books_nonfiction: "Non-Fiction Book",
  books_academic: "Textbook",
  books_illustrated: "Art Book",
  books_other: "Book",
  jewellery_earrings: "Earrings",
  jewellery_necklaces: "Necklace",
  jewellery_bracelets: "Bracelet",
  jewellery_rings: "Ring",
  jewellery_brooches: "Brooch",
  jewellery_other: "Necklace",
  clothing_dresses: "Dress",
  clothing_tops: "T-Shirt",
  clothing_trousers: "Trousers",
  clothing_skirts: "Skirt",
  clothing_coats: "Jacket",
  clothing_other: "Dress",
  homeware_candles: "Candle",
  homeware_clocks: "Clock",
  homeware_storage: "Storage Box",
  homeware_vases: "Vase",
  homeware_other: "Vase",
  furniture_seating: "Chair",
  furniture_tables: "Table",
  furniture_storage: "Shelf",
  furniture_bedroom: "Dresser",
  furniture_other: "Table",
  toys_figures: "Figurine",
  toys_soft: "Plush Toy",
  toys_educational: "Educational Toy",
  toys_other: "Toy",
  other_collectibles: "Figurine",
  other_misc: "Vase",
};

/**
 * when_made values for the Etsy select dropdown.
 * Default to "before_2007" for vintage items (20+ years old).
 */
export const ETSY_WHEN_MADE_VINTAGE = "before_2007";
export const ETSY_WHEN_MADE_RECENT = "2020_2026";
