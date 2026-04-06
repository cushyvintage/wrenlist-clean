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
  full_name?: string | null
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
export type SupplierType = 'house_clearance' | 'charity_shop' | 'car_boot' | 'flea_market' | 'online' | 'other'
export type Platform = 'vinted' | 'ebay' | 'etsy' | 'shopify' | 'depop' | 'poshmark' | 'mercari' | 'facebook' | 'whatnot' | 'grailed'
export type MarketplaceDataStatus = 'not_listed' | 'needs_publish' | 'listed' | 'sold' | 'error' | 'delisted' | 'needs_delist'

export interface Profile {
  id: string
  full_name: string | null
  location: string | null
  plan: PlanId
  stripe_customer_id: string | null
  finds_this_month: number
  finds_reset_at: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// SUPPLIERS
// ============================================================================

export interface Supplier {
  id: string
  user_id: string
  name: string
  type: SupplierType
  location: string | null
  contact_name: string | null
  phone: string | null
  notes: string | null
  rating: number | null
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
  categoryId?: number
}

export interface VintedPlatformData {
  listingId: string
  status: 'live' | 'draft' | 'ended'
  url: string
  publishedAt: string
  // Metadata for relisting without reconfiguration
  catalogId?: number
  brandId?: number
  brandTitle?: string
  sizeId?: number
  sizeTitle?: string
  colorIds?: number[]
  colorTitles?: string[]
  materialId?: number
  packageSizeId?: number
  conditionId?: number
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
  // Shipping fields (required for Vinted/eBay publishing)
  shipping_weight_grams: number | null
  shipping_length_cm: number | null
  shipping_width_cm: number | null
  shipping_height_cm: number | null
  sourcing_trip_id: string | null
  created_at: string
  updated_at: string
}

// Legacy alias for backwards compatibility
export type Product = Find

export interface FindWithMargin extends Find {
  margin_pct: number | null
  roi_pct: number | null
}

export interface ProductMarketplaceData {
  id: string
  find_id: string
  marketplace: Platform
  platform_listing_id: string | null
  platform_listing_url: string | null
  platform_category_id: string | null
  listing_price: number | null
  fields: Record<string, any>
  status: MarketplaceDataStatus
  error_message: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

/** @deprecated Use ProductMarketplaceData — kept as alias for backwards compatibility */
export type Listing = ProductMarketplaceData

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

export type VehicleType = 'car' | 'van' | 'motorcycle' | 'bicycle'

export interface Mileage {
  id: string
  user_id: string
  date: string
  miles: number
  purpose: MileagePurpose
  from_location: string | null
  to_location: string | null
  vehicle: string
  vehicle_type: VehicleType
  tax_year: string
  deductible_value_gbp: number
  created_at: string
  updated_at: string
}

// HMRC Approved Mileage Allowance Payments (AMAPs)
// Car/Van: 45p first 10k miles per tax year, then 25p
// Motorcycle: 24p flat | Bicycle: 20p flat
export const HMRC_RATES: Record<VehicleType, { first: number; second: number | null; threshold: number | null }> = {
  car:        { first: 0.45, second: 0.25, threshold: 10000 },
  van:        { first: 0.45, second: 0.25, threshold: 10000 },
  motorcycle: { first: 0.24, second: null, threshold: null },
  bicycle:    { first: 0.20, second: null, threshold: null },
}

/** @deprecated Use HMRC_RATES instead */
export const HMRC_MILEAGE_RATE = 0.45

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Car',
  van: 'Van',
  motorcycle: 'Motorcycle',
  bicycle: 'Bicycle',
}

export const VEHICLE_TYPE_ICONS: Record<VehicleType, string> = {
  car: '🚗',
  van: '🚐',
  motorcycle: '🏍️',
  bicycle: '🚲',
}

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

// ============================================================================
// SOURCING TRIPS
// ============================================================================

export type SourcingTripType = 'car_boot' | 'charity_shop' | 'house_clearance' | 'flea_market' | 'online' | 'other'

export const SOURCING_TRIP_TYPES: Record<SourcingTripType, string> = {
  car_boot: 'Car boot',
  charity_shop: 'Charity shop',
  house_clearance: 'House clearance',
  flea_market: 'Flea market',
  online: 'Online',
  other: 'Other',
}

export interface SourcingTrip {
  id: string
  user_id: string
  name: string
  type: SourcingTripType
  location: string | null
  date: string // ISO date YYYY-MM-DD
  miles: number | null
  entry_fee_gbp: number | null
  notes: string | null
  supplier_id: string | null
  created_at: string
  updated_at: string
}

export interface SourcingTripWithStats extends SourcingTrip {
  find_count: number
  total_spent_gbp: number
  total_potential_revenue_gbp: number
  roi_multiplier: number | null
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

export const PLATFORM_LABELS: Partial<Record<Platform, string>> & Record<'vinted' | 'ebay' | 'etsy' | 'shopify', string> = {
  vinted: 'Vinted',
  ebay: 'eBay UK',
  etsy: 'Etsy',
  shopify: 'Shopify',
  depop: 'Depop',
  poshmark: 'Poshmark',
  mercari: 'Mercari',
  facebook: 'Facebook Marketplace',
  whatnot: 'Whatnot',
  grailed: 'Grailed',
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
// LISTING TEMPLATES
// ============================================================================

export interface ListingTemplate {
  id: string
  user_id: string
  name: string
  category: string | null
  condition: FindCondition | null
  brand: string | null
  platform_fields: Record<string, any>
  marketplaces: Platform[]
  default_price: number | null
  usage_count: number
  created_at: string
  updated_at: string
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
  type?: 'text' | 'select' | 'multiselect'
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
// SCAN HISTORY
// ============================================================================

export interface ScanPriceData {
  ebay_avg: string
  vinted_recent: string
  depop_avg: string
  suggested_ask: string
}

export interface ScanHistoryRecord {
  id: string
  barcode: string
  title: string | null
  category: string | null
  brand: string | null
  details: string | null
  source: 'isbn' | 'ai' | 'manual' | null
  price_data: ScanPriceData | null
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
