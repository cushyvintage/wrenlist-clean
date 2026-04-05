/**
 * eBay UK category mappings for Wrenlist
 * Maps Wrenlist category names (from find.category) to eBay UK category IDs
 * 
 * Based on PRD research (2026-03-30 Vendoo observation) + PRD-LISTING-WIZARD.md
 * To find eBay category IDs: https://www.ebay.co.uk/sch/ → browse categories
 */
export const EBAY_CATEGORY_MAP: Record<string, string> = {
  // Dom's primary stock (from SOUL.md)
  ceramics: '262392',       // Decorative Pottery, Ceramics & Glass Collector Plates (leaf)
  glassware: '262393',      // Decorative Glass → Vases (leaf under Pottery, Ceramics & Glass)
  books: '171228',          // Antiquarian & Collectable Books (leaf)
  jewellery: '10968',       // Vintage & Antique Jewellery (leaf)
  jewelry: '10968',         // US spelling alias
  clothing: '175759',       // Vintage Clothing (leaf)
  homeware: '20697',        // Decorative Ornaments & Figures (leaf)
  home: '20697',
  collectibles: '262392',   // Decorative Collector Plates (leaf) — default for collectibles
  medals: '4003',           // Medals & Ribbons (leaf under Militaria)
  toys: '19016',            // Vintage & Classic Toys (leaf)
  furniture: '20091',       // Antique Furniture (leaf)
  // Fallback — eBay "Other" under Collectables
  other: '562',             // Other Collectables (leaf)
  default: '562',
}
