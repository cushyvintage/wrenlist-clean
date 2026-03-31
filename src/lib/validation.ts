import { z } from 'zod'

/**
 * Validation schemas for Wrenlist API endpoints
 */

export const FindStatusEnum = z.enum(['draft', 'listed', 'on_hold', 'sold'])
export const ConditionEnum = z.enum(['excellent', 'good', 'fair', 'poor'])
export const SourceTypeEnum = z.enum(['house_clearance', 'charity_shop', 'car_boot', 'online_haul', 'flea_market', 'other'])
export const PlatformEnum = z.enum(['vinted', 'ebay', 'etsy', 'shopify'])
export const ListingStatusEnum = z.enum(['draft', 'live', 'sold', 'delisted'])

// ============================================================================
// FINDS (Products)
// ============================================================================

export const CreateFindSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  category: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  colour: z.string().optional().nullable(),
  condition: ConditionEnum.optional().nullable(),
  description: z.string().optional().nullable(),
  source_type: SourceTypeEnum,
  source_name: z.string().optional().nullable(),
  sourced_at: z.string().optional().nullable(),
  cost_gbp: z.number().nonnegative().optional().nullable(),
  asking_price_gbp: z.number().nonnegative().optional().nullable(),
  status: FindStatusEnum.optional().default('draft'),
  sold_price_gbp: z.number().nonnegative().optional().nullable(),
  sold_at: z.string().datetime().optional().nullable(),
  photos: z.array(z.string()).optional().default([]),
  sku: z.string().optional().nullable(),
  platform_fields: z.record(z.string()).optional().default({}),
})

export const UpdateFindSchema = CreateFindSchema.partial()

export type CreateFindInput = z.infer<typeof CreateFindSchema>
export type UpdateFindInput = z.infer<typeof UpdateFindSchema>

// ============================================================================
// LISTINGS
// ============================================================================

export const CreateListingSchema = z.object({
  find_id: z.string().uuid('Invalid find ID'),
  platform: PlatformEnum,
  platform_listing_id: z.string().optional().nullable(),
  platform_url: z.string().url().optional().nullable(),
  status: ListingStatusEnum.optional().default('draft'),
  listed_at: z.string().datetime().optional().nullable(),
  views: z.number().nonnegative().optional().default(0),
  likes: z.number().nonnegative().optional().default(0),
  messages: z.number().nonnegative().optional().default(0),
})

export const UpdateListingSchema = CreateListingSchema.partial()

export type CreateListingInput = z.infer<typeof CreateListingSchema>
export type UpdateListingInput = z.infer<typeof UpdateListingSchema>

// ============================================================================
// EXPENSES
// ============================================================================

export const ExpenseCategoryEnum = z.enum(['packaging', 'postage', 'platform_fees', 'supplies', 'vehicle', 'other'])

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

export const CreateMileageSchema = z.object({
  date: z.string().date().optional(),
  miles: z.number().positive('Miles must be positive'),
  purpose: MileagePurposeEnum.optional().default('sourcing'),
  from_location: z.string().optional().nullable(),
  to_location: z.string().optional().nullable(),
  vehicle: z.string().min(1, 'Vehicle is required'),
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
  platform_fields: z.record(z.string()).optional().default({}),
  marketplaces: z.array(z.string()).optional().default([]),
  default_price: z.number().nonnegative().optional().nullable(),
})

export const UpdateListingTemplateSchema = CreateListingTemplateSchema.partial()

export type CreateListingTemplateInput = z.infer<typeof CreateListingTemplateSchema>
export type UpdateListingTemplateInput = z.infer<typeof UpdateListingTemplateSchema>

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
