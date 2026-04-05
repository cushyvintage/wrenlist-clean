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
export const WRENLIST_TO_ETSY_CATEGORY = {
    // From CATEGORY_MAP in src/data/marketplace-category-map.ts
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
    // From CATEGORIES const (clothing sub-categories)
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
};
/**
 * when_made values for the Etsy select dropdown.
 * Default to "before_2007" for vintage items (20+ years old).
 */
export const ETSY_WHEN_MADE_VINTAGE = "before_2007";
export const ETSY_WHEN_MADE_RECENT = "2020_2026";
