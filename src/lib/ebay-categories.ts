/**
 * eBay UK category mappings for Wrenlist
 * Maps Wrenlist category names (from find.category) to eBay UK category IDs
 * 
 * Based on PRD research (2026-03-30 Vendoo observation) + PRD-LISTING-WIZARD.md
 * To find eBay category IDs: https://www.ebay.co.uk/sch/ → browse categories
 */
export const EBAY_CATEGORY_MAP: Record<string, string> = {
  // Dom's primary stock (from SOUL.md)
  // Verified eBay UK leaf categories (from Sell > Category selection)
  ceramics: '38277',        // Pottery, Ceramics & Glass > Plates (leaf)
  glassware: '38228',       // Pottery, Ceramics & Glass > Glass > Vases (leaf)
  books: '29223',           // Books, Comics & Magazines > Antiquarian & Collectable (leaf)
  jewellery: '10968',       // Jewellery & Watches > Vintage & Antique Jewellery (leaf)
  jewelry: '10968',         // US spelling alias
  clothing: '175759',       // Clothes, Shoes & Accessories > Vintage (leaf)
  homeware: '20697',        // Collectables > Decorative Ornaments & Figures (leaf)
  home: '20697',
  collectibles: '38277',    // Default collectibles to Pottery Plates (Dom's primary stock)
  medals: '4003',           // Collectables > Militaria > Medals (leaf)
  toys: '19016',            // Toys & Games > Vintage & Classic Toys (leaf)
  furniture: '20091',       // Antiques > Antique Furniture (leaf)
  // Fallback
  other: '562',             // Collectables > Other Collectables (leaf)
  default: '562',
}
