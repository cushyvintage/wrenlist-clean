/**
 * Shared TypeScript types for Wrenlist
 */

// ============================================================================
// AUTH
// ============================================================================

export interface User {
  id: string
  email: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: Error | null
}

// ============================================================================
// DOMAIN TYPES (Design System)
// ============================================================================

export type PlanId = 'free' | 'nester' | 'forager' | 'flock'
export type FindStatus = 'draft' | 'listed' | 'on_hold' | 'sold'
export type FindCondition = 'excellent' | 'good' | 'fair'
export type SourceType = 'house_clearance' | 'charity_shop' | 'car_boot' | 'online_haul' | 'flea_market' | 'other'
export type Platform = 'vinted' | 'ebay' | 'etsy' | 'shopify'
export type ListingStatus = 'draft' | 'live' | 'sold' | 'delisted'

export interface Profile {
  id: string
  full_name: string | null
  location: string | null
  plan: PlanId
  stripe_customer_id: string | null
  finds_this_month: number
  finds_reset_at: string
  created_at: string
  updated_at: string
}

// ============================================================================
// MARKETPLACE PLATFORM FIELDS
// ============================================================================

export interface EbayPlatformData {
  listingId: string
  offerId?: string
  status: 'live' | 'draft' | 'ended'
  url: string
  publishedAt: string
}

export interface VintedPlatformData {
  listingId: string
  status: 'live' | 'draft' | 'ended'
  url: string
  publishedAt: string
}

export interface EtsyPlatformData {
  listingId: string
  status: 'live' | 'draft' | 'ended'
  url: string
  publishedAt: string
}

export interface ShopifyPlatformData {
  listingId: string
  status: 'live' | 'draft' | 'ended'
  url: string
  publishedAt: string
}

export interface PlatformFields {
  ebay?: EbayPlatformData
  vinted?: VintedPlatformData
  etsy?: EtsyPlatformData
  shopify?: ShopifyPlatformData
}

// Supabase `finds` table type
export interface Find {
  id: string
  organization_id?: string // Optional for mock data
  user_id: string
  name: string
  category: string | null
  brand: string | null
  size: string | null
  colour: string | null
  condition: FindCondition | null
  description: string | null
  cost_gbp: number | null
  asking_price_gbp: number | null
  source_type: SourceType | null
  source_name: string | null
  sourced_at: string | null
  status: FindStatus
  sold_price_gbp: number | null
  sold_at: string | null
  photos: string[]
  sku: string | null
  platform_fields: PlatformFields | null
  ai_generated_description: string | null
  ai_suggested_price_low: number | null
  ai_suggested_price_high: number | null
  created_at: string
  updated_at: string
}

// Legacy alias for backwards compatibility
export type Product = Find

export interface FindWithMargin extends Find {
  margin_pct: number | null
  roi_pct: number | null
}

export interface Listing {
  id: string
  find_id: string
  user_id: string
  platform: Platform
  platform_listing_id: string | null
  status: ListingStatus
  listed_at: string | null
  delisted_at: string | null
  views: number
  created_at: string
  updated_at: string
}

export interface FindWithListings extends FindWithMargin {
  listings: Listing[]
}

// ============================================================================
// EXPENSES & MILEAGE (Phase 4 - Operations & Tax)
// ============================================================================

export type ExpenseCategory = 'packaging' | 'postage' | 'platform_fees' | 'supplies' | 'vehicle' | 'other'

export interface Expense {
  id: string
  user_id: string
  category: ExpenseCategory
  amount_gbp: number
  vat_amount_gbp: number | null
  description: string | null
  receipt_url: string | null
  date: string
  find_id: string | null
  created_at: string
  updated_at: string
}

export type MileagePurpose = 'car_boot' | 'charity_shop' | 'house_clearance' | 'sourcing' | 'delivery' | 'other'

export interface Mileage {
  id: string
  user_id: string
  date: string
  miles: number
  purpose: MileagePurpose
  from_location: string | null
  to_location: string | null
  vehicle: string
  deductible_value_gbp: number // Calculated as miles * HMRC_RATE
  created_at: string
  updated_at: string
}

export const HMRC_MILEAGE_RATE = 0.45 // £0.45 per mile

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  packaging: 'Packaging',
  postage: 'Postage',
  platform_fees: 'Platform fees',
  supplies: 'Supplies',
  vehicle: 'Vehicle',
  other: 'Other',
}

export const MILEAGE_PURPOSE_LABELS: Record<MileagePurpose, string> = {
  car_boot: 'Car boot',
  charity_shop: 'Charity shop',
  house_clearance: 'House clearance',
  sourcing: 'Sourcing',
  delivery: 'Delivery',
  other: 'Other',
}

// Display labels
export const SOURCE_LABELS: Record<SourceType, string> = {
  house_clearance: 'House clearance',
  charity_shop: 'Charity shop',
  car_boot: 'Car boot',
  online_haul: 'Online haul',
  flea_market: 'Flea market',
  other: 'Other',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  vinted: 'Vinted',
  ebay: 'eBay UK',
  etsy: 'Etsy',
  shopify: 'Shopify',
}

export const CATEGORIES = [
  'Denim',
  'Workwear',
  'Footwear',
  'Bags',
  'Tops',
  'Womenswear',
  'Menswear',
  'Accessories',
  'Outerwear',
  'Knitwear',
  'Vintage',
  'Other',
] as const

// Formatters
export function formatMargin(pct: number | null): string {
  if (pct === null) return '—'
  return `${Math.round(pct)}%`
}

export function formatGBP(amount: number | null): string {
  if (amount === null) return '—'
  return `£${amount.toFixed(2)}`
}

// ============================================================================
// MARKETPLACE
// ============================================================================

export interface MarketplaceAccount {
  id: string
  userId: string
  marketplace: 'vinted' | 'ebay' | 'etsy' | 'depop' | 'facebook'
  externalUserId: string
  username: string
  isActive: boolean
  lastSynced?: string
  createdAt: string
}

export interface MarketplaceListing {
  id: string
  productId: string
  marketplaceAccountId: string
  marketplace: string
  externalId: string
  externalUrl: string
  price: number
  currency: string
  status: 'active' | 'pending' | 'sold' | 'delisted'
  marketplaceFeePercent: number
  shippingPrice?: number
  shippingMethod?: string
  viewsCount: number
  likesCount: number
  createdAt: string
  updatedAt: string
  syncedAt?: string
}

// ============================================================================
// API RESPONSES
// ============================================================================

// ============================================================================
// MARKETPLACE CATEGORY CONFIG
// ============================================================================

export interface FieldConfig {
  show: boolean
  required?: boolean
  max?: number
  options?: string[]
}

export interface CategoryFieldConfig {
  id: string
  category: string
  marketplace: Platform
  platform_category_id: string | null
  platform_category_path: string | null
  fields: Record<string, FieldConfig>
  source: 'manual' | 'vinted_api' | 'ebay_api'
  last_updated: string
  created_at: string
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}
