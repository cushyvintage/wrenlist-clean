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
 * Wrenlist category → Etsy category search terms (Phase 3).
 *
 * IMPORTANT: Etsy's category typeahead returns PRODUCT categories, not
 * generic labels. "Ceramics" returns craft supplies; "Vase" returns
 * Home & Living > Home Decor > Vases. Use product-level terms.
 *
 * Lookup: exact match → resolveFromMap() progressively shorter prefixes.
 * So top-level keys catch all unmatched subcategories.
 */
export const WRENLIST_TO_ETSY_CATEGORY: Record<string, string> = {
  // === Phase 3 top-level keys (16 categories) ===
  antiques: "Antique",
  art: "Art Print",
  baby_toddler: "Baby Clothing",
  books_media: "Vintage Book",
  clothing: "Vintage Dress",
  craft_supplies: "Craft Supplies",
  collectibles: "Vintage Collectible",
  electronics: "Gadget",
  health_beauty: "Perfume",
  home_garden: "Vintage Home Decor",
  musical_instruments: "Musical Instrument",
  pet_supplies: "Pet Collar",
  sports_outdoors: "Sports",
  toys_games: "Vintage Toy",
  vehicles_parts: "Auto Parts",
  other: "Vintage",

  // === Phase 3 subcategory overrides (key subcategories) ===
  // Clothing — women
  clothing_womenswear_womens_dresses: "Vintage Dress",
  clothing_womenswear_womens_tops_and_blouses: "Vintage Blouse",
  clothing_womenswear_womens_outerwear: "Vintage Jacket",
  clothing_womenswear_womens_shoes: "Vintage Shoes",
  clothing_womenswear_womens_bags: "Vintage Bag",
  clothing_womenswear_womens_jewelry: "Vintage Jewellery",
  clothing_womenswear_womens_accessories: "Vintage Scarf",
  clothing_womenswear_womens_sweaters: "Vintage Sweater",
  clothing_womenswear_womens_skirts: "Vintage Skirt",
  clothing_womenswear_womens_pants: "Vintage Trousers",
  clothing_womenswear_womens_jeans: "Vintage Jeans",
  // Clothing — men
  clothing_menswear_mens_tops_and_shirts: "Vintage Shirt",
  clothing_menswear_mens_outerwear: "Vintage Jacket",
  clothing_menswear_mens_shoes: "Vintage Shoes",
  clothing_menswear_mens_accessories: "Vintage Cufflinks",
  // Home & Garden
  home_garden_kitchen_and_dining: "Vintage Kitchen",
  home_garden_home_decor: "Vintage Home Decor",
  home_garden_furniture: "Vintage Furniture",
  home_garden_bedding: "Vintage Bedding",
  home_garden_bath: "Vintage Bathroom",
  home_garden_storage_and_organization: "Vintage Storage Box",
  // Art
  art_paintings: "Painting",
  art_posters_and_prints: "Art Print",
  art_photographs: "Photography",
  art_sculptures: "Sculpture",
  art_drawings_and_illustrations: "Drawing",
  art_mixed_media: "Mixed Media Art",
  art_fiber_and_textile_art: "Textile Art",
  art_ceramic_art: "Ceramic Art",
  art_glass_art: "Glass Art",
  // Antiques
  antiques_antique_furniture: "Antique Furniture",
  antiques_antique_decor: "Antique Decor",
  antiques_antique_electronics: "Antique Radio",
  // Books & Media
  books_media_books: "Vintage Book",
  books_media_music: "Vinyl Record",
  books_media_movies: "Vintage DVD",
  books_media_magazines: "Vintage Magazine",
  // Collectibles
  collectibles_militaria_general: "Military Medal",
  collectibles_stamps_general: "Vintage Stamp",
  collectibles_coins_and_money_general: "Vintage Coin",
  collectibles_trading_cards: "Trading Card",
  collectibles_advertising_general: "Vintage Advertising",
  // Toys
  toys_games_action_figures_and_accessories: "Action Figure",
  toys_games_dolls_and_bears: "Vintage Doll",
  toys_games_board_games_and_role_playing: "Board Game",
  toys_games_puzzles: "Vintage Puzzle",

  // === Legacy keys (backward compat for stale queue items / pre-backfill DB) ===
  ceramics: "Vase",
  glassware: "Drinking Glass",
  books: "Book",
  jewellery: "Necklace",
  homeware: "Vase",
  furniture: "Table",
  toys: "Toy",
  medals: "Medal",
  teapots: "Teapot",
  jugs: "Jug",
  music_media: "Vinyl Record",
  sports: "Sports",
};

/**
 * when_made values for the Etsy select dropdown.
 * Default to "before_2007" for vintage items (20+ years old).
 */
export const ETSY_WHEN_MADE_VINTAGE = "before_2007";
export const ETSY_WHEN_MADE_RECENT = "2020_2026";
