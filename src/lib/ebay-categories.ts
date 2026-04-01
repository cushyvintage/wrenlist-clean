/**
 * eBay UK category mappings for Wrenlist
 * Maps Wrenlist category names (from find.category) to eBay UK category IDs
 * 
 * Based on PRD research (2026-03-30 Vendoo observation) + PRD-LISTING-WIZARD.md
 * To find eBay category IDs: https://www.ebay.co.uk/sch/ → browse categories
 */
export const EBAY_CATEGORY_MAP: Record<string, string> = {
  // Dom's primary stock (from SOUL.md)
  ceramics: '870',          // Pottery & China (Antiques)
  glassware: '11700',       // Glass (Antiques)
  books: '267',             // Books, Comics & Magazines
  jewellery: '281',         // Jewellery & Watches
  jewelry: '281',           // US spelling alias
  clothing: '11450',        // Clothes, Shoes & Accessories
  homeware: '11700',        // Home, Furniture & DIY
  home: '11700',
  collectibles: '11116',    // Collectables
  medals: '15273',          // Medals
  toys: '220',              // Toys & Games
  furniture: '3197',        // Furniture (Antiques)
  // Fallback
  other: '99',
  default: '99',
}
