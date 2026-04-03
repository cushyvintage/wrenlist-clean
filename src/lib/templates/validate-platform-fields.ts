/**
 * Platform field validation & resilience
 * Drops unknown fields, preserves known typed fields
 */

import type { PlatformFieldsData } from '@/types/listing-form'
import type { Platform } from '@/types'

/**
 * Allowlisted keys for each marketplace's platform fields
 */
const ALLOWED_KEYS: Record<Platform, Set<string>> = {
  vinted: new Set([
    'primaryColor',
    'secondaryColor',
    'conditionDescription',
    'material',
    'author',
    'isbn',
    'language',
  ]),
  ebay: new Set([
    'acceptOffers',
    'isAuction',
    'author',
    'isbn',
    'language',
  ]),
  etsy: new Set([]),
  shopify: new Set([]),
}

/**
 * Validate and clean platform fields for a specific marketplace
 * Silently drops unknown keys, preserves only known typed fields
 *
 * @param raw - Raw field data from template (likely Record<string, unknown>)
 * @param marketplace - Target marketplace (vinted | ebay)
 * @returns Cleaned platform fields object with only allowlisted keys
 */
export function validatePlatformFields(
  raw: Record<string, unknown> | null | undefined,
  marketplace: Platform
): Record<string, unknown> {
  if (!raw) return {}

  const allowed = ALLOWED_KEYS[marketplace]
  const cleaned: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(raw)) {
    if (allowed.has(key)) {
      cleaned[key] = value
    }
    // Unknown keys are silently dropped
  }

  return cleaned
}
