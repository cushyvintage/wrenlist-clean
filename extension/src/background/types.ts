import type { Condition } from "./shared/enums.js";

// ============================================================================
// Vinted Import Metadata
// Comprehensive metadata captured during Vinted import for relisting
// ============================================================================

export interface VintedImportMetadata {
  // Vinted IDs (for relisting without reconfiguration)
  catalog_id: number;
  brand_id?: number;
  brand_title?: string;
  size_id?: number;
  size_title?: string;
  color_ids?: number[];
  color_titles?: string[];
  material_id?: number;
  package_size_id?: number;
  status_id?: number;

  // Dynamic attributes (ISBN, language, platform, etc.)
  isbn?: string;
  item_attributes?: Array<{ code: string; ids?: number[]; value?: string }>;

  // Pricing
  original_price?: number;
  currency: string;
  is_offerable?: boolean;

  // Tags/search
  tags?: string[];

  // Inventory
  sku?: string;
  barcode?: string;
  quantity?: number;

  // Shipping (full detail)
  shipping?: {
    package_size_id?: number;
    weight_grams?: number;
    dimensions?: { length?: number; width?: number; height?: number };
    carrier?: string;
    domestic_price?: number;
    international_price?: number;
  };

  // Photos with thumbnails for faster UI loading
  photos?: Array<{
    id: number;
    url: string;
    full_size_url: string;
    thumbnail_url?: string;
  }>;

  // Analytics
  view_count?: number;
  favourite_count?: number;

  // Status flags
  is_sold?: boolean;
  is_reserved?: boolean;
  is_hidden?: boolean;
  is_closed?: boolean;
  is_draft?: boolean;

  // Timestamps (Unix)
  created_at_ts?: number;
  updated_at_ts?: number;

  // Seller info
  user?: {
    id: number;
    login?: string;
    feedback_reputation?: number;
    is_verified?: boolean;
  };

  // Import metadata
  imported_at?: string;
}

// ============================================================================
// Shipping Info
// ============================================================================

export interface ShippingInfo {
  domesticShipping?: number;
  worldwideShipping?: number;
  sellerPays?: boolean;
  shippingType?: string;
  allowLocalPickup?: boolean;
  doorPickup?: boolean;
  doorDropoff?: boolean;
  shippingWeight?: {
    value: number;
    unit: string;
    inOunces?: number;
    inGrams?: number;
  };
  shippingHeight?: number;
  shippingWidth?: number;
  shippingLength?: number;
  preferredCarrier?: string;
  shippingAddress?: {
    street?: string;
    address2?: string;
    city?: string;
    region?: string;
    zipCode?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };
}

export interface Product {
  id: string;
  marketPlaceId?: string;
  marketplaceId?: string;
  marketplaceUrl?: string;
  title: string;
  description: string;
  price: number;
  condition: Condition;
  category: string[];
  size?: string[];
  tags?: string;
  color?: string;
  color2?: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  images?: string[];
  styleTags?: string[];
  whenMade?: string;
  quantity?: number;
  originalPrice?: number;
  availability?: string;
  acceptOffers?: boolean;
  smartPricing?: boolean;
  smartPricingPrice?: number;
  dynamicProperties: Record<string, string>;
  shipping: ShippingInfo & Record<string, unknown>;
  isAuction?: boolean;
  auctionStartingPrice?: number;

  // Source marketplace metadata (for cross-listing)
  vintedMetadata?: VintedImportMetadata;
  // Future: mercariMetadata, poshmarkMetadata, depopMetadata

  [key: string]: unknown;
}

export interface MarketplaceListingSummary {
  marketplaceId: string;
  title: string | null;
  price: string | number | null;
  coverImage: string | null;
  created: string | null;
  marketplaceUrl: string;
  // Status flags (optional, mainly for Vinted)
  isSold?: boolean;
  isReserved?: boolean;
  isHidden?: boolean;
}

export interface MarketplaceListingResult {
  products: MarketplaceListingSummary[];
  nextPage: string | null;
  username?: string | number | null;
  pagination?: {
    current_page: number;
    total_pages: number;
    total_entries: number;
    per_page?: number;
  };
}

