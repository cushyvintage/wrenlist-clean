export const ETSY_BASE_URL = "https://www.etsy.com";
export const ETSY_CREATE_LISTING_URL = "https://www.etsy.com/your/shops/me/listing-editor/create";
export const ETSY_EDIT_LISTING_URL = "https://www.etsy.com/your/shops/me/listing-editor";
export const ETSY_LISTINGS_MANAGER_URL = "https://www.etsy.com/your/shops/me/tools/listings";
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
export const WRENLIST_TO_ETSY_CATEGORY = {
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
    // CATEGORY_TREE subcategories — specific product terms for Etsy typeahead
    // Ceramics
    ceramics_plates: "Plate",
    ceramics_bowls: "Bowl",
    ceramics_dinner_sets: "Dinner Set",
    ceramics_mugs: "Mug",
    ceramics_cup_saucers: "Cup and Saucer",
    ceramics_teapots: "Teapot",
    ceramics_jugs: "Jug",
    ceramics_vases: "Vase",
    ceramics_figurines: "Figurine",
    ceramics_dishes: "Serving Dish",
    ceramics_other: "Vase",
    // Glassware
    glassware_drinkware: "Drinking Glass",
    glassware_stemmed: "Wine Glass",
    glassware_tumblers: "Tumbler",
    glassware_decanters: "Decanter",
    glassware_vases: "Vase",
    glassware_other: "Drinking Glass",
    // Books
    books_fiction: "Fiction Book",
    books_nonfiction: "Non-Fiction Book",
    books_academic: "Textbook",
    books_illustrated: "Art Book",
    books_antiquarian: "Antique Book",
    books_comics: "Comic Book",
    books_magazines: "Magazine",
    books_other: "Book",
    // Jewellery
    jewellery_earrings: "Earrings",
    jewellery_necklaces: "Necklace",
    jewellery_bracelets: "Bracelet",
    jewellery_rings: "Ring",
    jewellery_brooches: "Brooch",
    jewellery_watches: "Watch",
    jewellery_cufflinks: "Cufflinks",
    jewellery_vintage: "Vintage Jewellery",
    jewellery_other: "Necklace",
    // Clothing
    clothing_dresses: "Dress",
    clothing_tops: "Blouse",
    clothing_trousers: "Trousers",
    clothing_skirts: "Skirt",
    clothing_coats: "Jacket",
    clothing_knitwear: "Sweater",
    clothing_mens_shirts: "Shirt",
    clothing_mens_trousers: "Trousers",
    clothing_mens_coats: "Jacket",
    clothing_shoes_womens: "Shoes",
    clothing_shoes_mens: "Shoes",
    clothing_bags: "Bag",
    clothing_vintage: "Vintage Dress",
    clothing_other: "Dress",
    // Homeware
    homeware_candles: "Candle",
    homeware_clocks: "Clock",
    homeware_lighting: "Lamp",
    homeware_mirrors: "Mirror",
    homeware_cushions: "Cushion",
    homeware_rugs: "Rug",
    homeware_storage: "Storage Box",
    homeware_photo_frames: "Picture Frame",
    homeware_wall_decor: "Wall Hanging",
    homeware_bedding: "Bedding",
    homeware_other: "Vase",
    // Furniture
    furniture_seating: "Chair",
    furniture_tables: "Table",
    furniture_shelving: "Shelf",
    furniture_cabinets: "Cabinet",
    furniture_sideboards: "Sideboard",
    furniture_bedroom: "Dresser",
    furniture_sofas: "Sofa",
    furniture_other: "Table",
    // Toys
    toys_action_figures: "Action Figure",
    toys_soft: "Plush Toy",
    toys_board_games: "Board Game",
    toys_puzzles: "Puzzle",
    toys_dolls: "Doll",
    toys_educational: "Educational Toy",
    toys_lego: "Building Blocks",
    toys_vintage: "Vintage Toy",
    toys_other: "Toy",
    // Collectibles
    collectibles_decorative: "Figurine",
    collectibles_militaria: "Military Medal",
    collectibles_postcards: "Postcard",
    collectibles_coins: "Coin",
    collectibles_stamps: "Stamp",
    collectibles_trading_cards: "Trading Card",
    collectibles_breweriana: "Beer Stein",
    collectibles_other: "Collectible",
    // Art
    art_paintings: "Painting",
    art_prints: "Art Print",
    art_photographs: "Photography",
    art_sculptures: "Sculpture",
    art_drawings: "Drawing",
    art_mixed_media: "Mixed Media Art",
    art_textile: "Textile Art",
    art_other: "Art",
    // Antiques
    antiques_furniture: "Antique Furniture",
    antiques_silver: "Antique Silver",
    antiques_maps: "Antique Map",
    antiques_porcelain: "Antique Porcelain",
    antiques_clocks: "Antique Clock",
    antiques_metalware: "Antique Brass",
    antiques_other: "Antique",
    // Electronics
    electronics_cameras: "Camera",
    electronics_phones: "Phone Case",
    electronics_audio: "Headphones",
    electronics_video_games: "Video Game",
    electronics_other: "Gadget",
    // Sports
    sports_cycling: "Bicycle",
    sports_fitness: "Yoga Mat",
    sports_golf: "Golf Club",
    sports_football: "Football",
    sports_camping: "Camping",
    sports_other: "Sports",
    // Music & Media
    music_media_vinyl: "Vinyl Record",
    music_media_cds: "Music CD",
    music_media_cassettes: "Cassette Tape",
    music_media_dvds: "DVD",
    music_media_instruments: "Musical Instrument",
    music_media_other: "Vinyl Record",
    // Craft Supplies
    craft_supplies_fabric: "Fabric",
    craft_supplies_yarn: "Yarn",
    craft_supplies_beads: "Beads",
    craft_supplies_sewing: "Sewing Supplies",
    craft_supplies_other: "Craft Supplies",
    // Health & Beauty
    health_beauty_fragrance: "Perfume",
    health_beauty_makeup: "Makeup",
    health_beauty_skincare: "Skin Care",
    health_beauty_haircare: "Hair Care",
    health_beauty_other: "Beauty",
    // Other
    other_pet_supplies: "Pet Collar",
    other_baby: "Baby Clothing",
    other_stationery: "Stationery",
    other_misc: "Vase",
};
/**
 * when_made values for the Etsy select dropdown.
 * Default to "before_2007" for vintage items (20+ years old).
 */
export const ETSY_WHEN_MADE_VINTAGE = "before_2007";
export const ETSY_WHEN_MADE_RECENT = "2020_2026";
