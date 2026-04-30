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
  avatar_url?: string | null
  /** Identity providers linked to this account (e.g. ['google'], ['email']). */
  providers?: string[]
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
export type FindCondition = 'new_with_tags' | 'new_without_tags' | 'very_good' | 'good' | 'fair' | 'poor'
export type SourceType = 'house_clearance' | 'charity_shop' | 'car_boot' | 'online_haul' | 'flea_market' | 'other'
export type SupplierType = 'house_clearance' | 'charity_shop' | 'car_boot' | 'flea_market' | 'online' | 'other'
export type Platform = 'vinted' | 'ebay' | 'etsy' | 'shopify' | 'depop' | 'poshmark' | 'mercari' | 'facebook' | 'whatnot' | 'grailed'
export type MarketplaceDataStatus = 'not_listed' | 'needs_publish' | 'draft' | 'hidden' | 'listed' | 'sold' | 'error' | 'delisted' | 'needs_delist'

// ============================================================================
// JOB QUEUE
// ============================================================================

export type JobAction = 'publish' | 'delist' | 'update'
export type JobStatus = 'pending' | 'claimed' | 'running' | 'completed' | 'failed' | 'cancelled'
export type StalePolicy = 'run_if_late' | 'skip_if_late'

export interface PublishJob {
  id: string
  user_id: string
  find_id: string
  platform: Platform
  action: JobAction
  scheduled_for: string | null
  stale_policy: StalePolicy
  status: JobStatus
  claimed_at: string | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  attempts: number
  max_attempts: number
  payload: Record<string, unknown>
  result: Record<string, unknown>
  created_at: string
  updated_at: string
}

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
// PACKAGING MATERIALS
// ============================================================================

export type PackagingCategory =
  | 'mailers'
  | 'boxes'
  | 'protection'
  | 'presentation'
  | 'branding'
  | 'tape'
  | 'labels'
  | 'other'

export interface PackagingMaterial {
  id: string
  user_id: string
  name: string
  sku: string | null
  category: PackagingCategory
  cost_per_unit_gbp: number | null
  stock_qty: number
  min_stock_qty: number
  supplier: string | null
  notes: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// MARKETPLACE PLATFORM FIELDS
// ============================================================================

/**
 * eBay item-specific aspects (a.k.a. "item specifics") that the seller
 * provides per-find to satisfy the category's required attributes. eBay's
 * required set varies per leaf category — Department for clothing, Author
 * for books, Model for electronics, etc.
 *
 * Wrenlist accepts these aspects in TWO equivalent shapes inside
 * platform_fields.ebay. The publish endpoint reads both:
 *
 *   1. Nested under .aspects (preferred — clearer intent):
 *      platform_fields.ebay.aspects.Department = "Unisex"
 *
 *   2. Flat on platform_fields.ebay (legacy):
 *      platform_fields.ebay.Department = "Unisex"
 *
 * Use the nested form for new code. The flat form is preserved so existing
 * imports / extension payloads keep working without migration.
 */
export interface EbayAspects {
  Department?: string
  Brand?: string
  Type?: string
  Style?: string
  Material?: string
  Colour?: string
  Size?: string
  MPN?: string
  EAN?: string
  Author?: string
  ISBN?: string
  Language?: string
  Model?: string
  // Any other eBay aspect can be passed as a free-form string. Required
  // aspects vary per leaf category — see eBay's getItemAspectsForCategory.
  [aspectName: string]: string | undefined
}

export interface EbayPlatformData {
  // Publish-state fields (set by the publish handler after a successful list)
  listingId?: string
  offerId?: string
  status?: 'live' | 'draft' | 'ended'
  url?: string
  publishedAt?: string
  categoryId?: number
  // Pre-publish form inputs
  acceptOffers?: boolean
  /** Preferred home for item-specific aspects (Department, Brand, etc.). */
  aspects?: EbayAspects
  // Legacy flat-key form. The publish endpoint still iterates these for
  // back-compat with existing imports and the extension payload.
  [legacyAspectKey: string]: unknown
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
  selected_marketplaces?: string[] | null
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
  stash_id: string | null
  stash?: Stash | null
  created_at: string
  updated_at: string
}

// ============================================================================
// STASHES (physical storage locations)
// ============================================================================

export interface Stash {
  id: string
  user_id: string
  name: string
  note: string | null
  capacity: number | null
  archived_at: string | null
  parent_stash_id: string | null
  created_at: string
  updated_at: string
}

export interface StashWithCount extends Stash {
  item_count: number
}

export interface StashActivity {
  id: string
  user_id: string
  stash_id: string | null
  find_id: string | null
  action: 'added' | 'removed' | 'moved' | 'merged'
  note: string | null
  created_at: string
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
  customer_id: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// DEDUP
// ============================================================================

export interface DedupFindSummary {
  id: string
  name: string
  photos: string[]
  brand: string | null
  selectedMarketplaces: string[]
  status: string
  description: string | null
  category?: string
  createdAt?: string
}

export interface DedupCandidate {
  findA: DedupFindSummary
  findB: DedupFindSummary
  similarityScore: number
}

// ============================================================================
// CUSTOMERS (CRM)
// ============================================================================

export interface Customer {
  id: string
  user_id: string
  marketplace: Platform
  marketplace_user_id: string | null
  username: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postcode: string | null
  country: string | null
  total_orders: number
  total_spent_gbp: number
  first_order_at: string | null
  last_order_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/** @deprecated Use ProductMarketplaceData — kept as alias for backwards compatibility */
export type Listing = ProductMarketplaceData

// ============================================================================
// EXPENSES & MILEAGE (Phase 4 - Operations & Tax)
// ============================================================================

/** @deprecated Use useExpenseCategories() hook for DB-driven categories */
export type ExpenseCategory = string

export interface Expense {
  id: string
  user_id: string
  category: string
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

// HMRC rate structure — used for DB rows and in-memory fallback
export interface MileageRate {
  first: number        // pounds per mile, first tier (e.g. 0.45)
  second: number | null // pounds per mile, second tier (e.g. 0.25), null for flat
  threshold: number | null // miles before second tier kicks in (e.g. 10000), null for flat
}

// HMRC Approved Mileage Allowance Payments (AMAPs)
// Fallback constant — used for form previews and when DB row not found
// Source of truth is hmrc_mileage_rates table (keyed by tax_year + vehicle_type)
export const HMRC_RATES: Record<VehicleType, MileageRate> = {
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

/** @deprecated Use useExpenseCategories() hook for DB-driven labels */
export const EXPENSE_LABELS: Record<string, string> = {
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
  /** Which platforms require this field (e.g. ['vinted', 'ebay']) */
  requiredBy?: string[]
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
// CATEGORIES (DB source of truth)
// ============================================================================

export interface CategoryRow {
  id: string
  value: string
  label: string
  top_level: string
  parent_group: string | null
  platforms: Record<string, { id: string; name: string; path?: string }>
  sort_order: number
  legacy_values: string[] | null
  created_at: string
  updated_at: string
}

export interface CategoryFieldRequirementRow {
  id: string
  category_value: string
  platform: string
  fields: Array<{
    name: string
    label: string
    type: 'text' | 'select'
    required: boolean
    highlighted?: boolean
    options?: string[]
  }>
  created_at: string
  updated_at: string
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

export interface PriceResearchRecord {
  id: string
  query: string
  title: string | null
  description: string | null
  suggested_price: number | null
  best_platform: string | null
  ebay_avg: number | null
  vinted_avg: number | null
  source: 'text' | 'image' | null
  image_url: string | null
  raw_response: Record<string, unknown> | null
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

// ============================================================================
// TEST TRACKER
// ============================================================================

export type TestRunStatus = 'pending' | 'running' | 'passed' | 'failed'
export type TestResultStatus = 'pending' | 'passed' | 'failed' | 'skipped'
export type TestPhase =
  | 'auth'
  | 'onboarding'
  | 'dashboard'
  | 'draft'
  | 'edge-case'
  | 'finds-crud'
  | 'platform-connect'
  | 'publish'
  | 'data-flow'
  | 'listings'
  | 'sold-customers'
  | 'expenses-mileage'
  | 'sourcing'
  | 'analytics'
  | 'settings-billing'
  | 'marketing'
  | 'ux-audit'
export type TestSeverity = 'P0' | 'P1' | 'P2' | 'P3'

export interface TestRun {
  id: string
  user_id: string
  name: string
  status: TestRunStatus
  total_tests: number
  passed_count: number
  failed_count: number
  skipped_count: number
  notes: string | null
  created_at: string
  completed_at: string | null
}

export interface TestResult {
  id: string
  run_id: string
  user_id: string
  test_name: string
  phase: TestPhase
  status: TestResultStatus
  severity: TestSeverity | null
  expected: string | null
  actual: string | null
  db_snapshot: Record<string, unknown> | null
  screenshot_url: string | null
  notes: string | null
  created_at: string
}

export interface TestRunWithResults extends TestRun {
  results: TestResult[]
}

// ============================================================================
// ROADMAP
// ============================================================================

export type RoadmapStatus =
  | 'under_consideration'
  | 'planned'
  | 'in_progress'
  | 'released'
  | 'rejected'

export interface RoadmapItemDTO {
  id: string
  title: string
  description: string
  tag: string
  status: RoadmapStatus
  featured: boolean
  vote_count: number
  voted_by_me: boolean
  created_at: string
}
