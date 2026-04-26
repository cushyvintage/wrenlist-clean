import { z } from 'zod'

/**
 * Validation schemas for Wrenlist API endpoints
 */

export const FindStatusEnum = z.enum(['draft', 'listed', 'on_hold', 'sold'])
export const ConditionEnum = z.enum(['new_with_tags', 'new_without_tags', 'very_good', 'good', 'fair', 'poor'])
export const SourceTypeEnum = z.enum(['house_clearance', 'charity_shop', 'car_boot', 'online_haul', 'flea_market', 'other'])
export const PlatformEnum = z.enum(['vinted', 'ebay', 'etsy', 'shopify', 'depop', 'poshmark', 'mercari', 'facebook', 'whatnot', 'grailed'])

// ============================================================================
// FINDS (Products)
// ============================================================================

// Caps mirror the UI counters on /add-find ("0/255" for title, "0/12000"
// for description). Without these the API would happily accept a 1MB
// string and the row would render fine in the table but break things like
// CSV export and search indexes.
export const CreateFindSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(255, 'Title too long (max 255 chars)'),
  category: z.string().max(100).optional().nullable(),
  brand: z.string().max(120).optional().nullable(),
  size: z.string().max(60).optional().nullable(),
  colour: z.string().max(60).optional().nullable(),
  condition: ConditionEnum.optional().nullable(),
  description: z.string().max(12000, 'Description too long (max 12000 chars)').optional().nullable(),
  source_type: SourceTypeEnum.optional().default('other'),
  source_name: z.string().optional().nullable(),
  sourced_at: z.string().optional().nullable(),
  cost_gbp: z.number().nonnegative().optional().nullable(),
  asking_price_gbp: z.number().nonnegative().optional().nullable(),
  status: FindStatusEnum.optional().default('draft'),
  sold_price_gbp: z.number().nonnegative().optional().nullable(),
  sold_at: z.string().datetime().optional().nullable(),
  photos: z.array(z.string()).optional().default([]),
  sku: z.string().optional().nullable(),
  platform_fields: z.record(z.unknown()).optional().default({}),
  color_ids: z.array(z.number()).optional().default([]),
  selected_marketplaces: z.array(z.string()).optional().default(['vinted']),
  sourcing_trip_id: z.string().uuid().optional().nullable(),
  stash_id: z.string().uuid().optional().nullable(),
  // Shipping fields for marketplace publishing
  shipping_weight_grams: z.number().nonnegative().optional().nullable(),
  shipping_length_cm: z.number().nonnegative().optional().nullable(),
  shipping_width_cm: z.number().nonnegative().optional().nullable(),
  shipping_height_cm: z.number().nonnegative().optional().nullable(),
})
// Note: platform_fields accepts nested objects (JSONB)

export const UpdateFindSchema = CreateFindSchema.partial()

export type CreateFindInput = z.infer<typeof CreateFindSchema>
export type UpdateFindInput = z.infer<typeof UpdateFindSchema>

// ============================================================================
// EXPENSES
// ============================================================================

// Category is now DB-driven (expense_categories table) — validate as non-empty string
export const ExpenseCategoryEnum = z.string().min(1, 'Category is required')

export const CreateExpenseSchema = z.object({
  category: ExpenseCategoryEnum,
  amount_gbp: z.number().positive('Amount must be positive'),
  description: z.string().optional().nullable(),
  date: z.string().date().optional(),
  vat_amount_gbp: z.number().nonnegative().optional().nullable(),
  find_id: z.string().uuid().optional().nullable(),
})

export const UpdateExpenseSchema = CreateExpenseSchema.partial()

export type CreateExpenseInput = z.infer<typeof CreateExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof UpdateExpenseSchema>

// ============================================================================
// MILEAGE
// ============================================================================

export const MileagePurposeEnum = z.enum(['car_boot', 'charity_shop', 'house_clearance', 'sourcing', 'delivery', 'other'])
export const VehicleTypeEnum = z.enum(['car', 'van', 'motorcycle', 'bicycle'])

export const CreateMileageSchema = z.object({
  date: z.string().date().optional(),
  miles: z.number().positive('Miles must be positive'),
  purpose: MileagePurposeEnum.optional().default('sourcing'),
  from_location: z.string().optional().nullable(),
  to_location: z.string().optional().nullable(),
  vehicle: z.string().min(1, 'Vehicle is required'),
  vehicle_type: VehicleTypeEnum.optional().default('car'),
})

export const UpdateMileageSchema = CreateMileageSchema.partial()

export type CreateMileageInput = z.infer<typeof CreateMileageSchema>
export type UpdateMileageInput = z.infer<typeof UpdateMileageSchema>

// ============================================================================
// LISTING TEMPLATES
// ============================================================================

export const CreateListingTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  category: z.string().optional().nullable(),
  condition: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  platform_fields: z.record(z.unknown()).optional().default({}),
  marketplaces: z.array(z.string()).optional().default([]),
  default_price: z.number().nonnegative().optional().nullable(),
})

export const UpdateListingTemplateSchema = CreateListingTemplateSchema.partial()

export type CreateListingTemplateInput = z.infer<typeof CreateListingTemplateSchema>
export type UpdateListingTemplateInput = z.infer<typeof UpdateListingTemplateSchema>

// ============================================================================
// PROFILE
// ============================================================================

// Phone: digits, spaces, +, (), - allowed; 7-20 chars. Permissive on purpose
// — sellers paste numbers in many formats and we don't dial them.
const PhoneSchema = z.string().regex(/^[\d +()-]{7,20}$/, 'Phone format looks invalid')

export const UpdateProfileSchema = z.object({
  full_name: z.string().min(1, 'Name cannot be empty').max(200, 'Name too long').optional().nullable(),
  business_name: z.string().max(200, 'Business name too long').optional().nullable(),
  phone: PhoneSchema.optional().nullable(),
  address: z.string().max(500, 'Address too long').optional().nullable(),
  // Avatar is uploaded via Supabase Storage; the URL must be a valid http(s)
  // URL but we don't lock it to a specific host because storage may move.
  avatar_url: z.string().url('Avatar URL must be a valid URL').optional().nullable(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

// ============================================================================
// SOURCING TRIPS
// ============================================================================

export const CreateSourcingSchema = z.object({
  name: z.string().min(1, 'Trip name is required').max(120, 'Trip name too long'),
  type: z.string().min(1, 'Trip type is required'),
  date: z.string().date('Date must be YYYY-MM-DD'),
  location: z.string().max(200).optional().nullable(),
  miles: z.number().nonnegative('Miles must be zero or positive').optional().nullable(),
  entry_fee_gbp: z.number().nonnegative('Entry fee must be zero or positive').optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export type CreateSourcingInput = z.infer<typeof CreateSourcingSchema>

// ============================================================================
// SUPPLIERS
// ============================================================================

// SupplierType matches the CHECK constraint in the suppliers table.
// Keep these in sync — the API returns 400 if the client sends anything else.
export const SupplierTypeEnum = z.enum([
  'house_clearance', 'charity_shop', 'car_boot', 'flea_market', 'online', 'other',
])

export const CreateSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200),
  type: SupplierTypeEnum,
  location: z.string().max(200).optional().nullable(),
  contact_name: z.string().max(200).optional().nullable(),
  phone: PhoneSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
})

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely validate request body
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      return { success: false, error: message }
    }
    return { success: false, error: 'Validation failed' }
  }
}
