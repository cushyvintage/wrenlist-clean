/**
 * Template application with schema drift resilience
 * Merges template fields into form data, validates platform-specific fields,
 * and identifies incomplete required fields
 */

import type { ListingFormData } from '@/types/listing-form'
import type { ListingTemplate } from '@/types'
import { validatePlatformFields } from './validate-platform-fields'

export interface ApplyTemplateResult {
  merged: ListingFormData
  incompleteRequiredFields: string[]
}

/**
 * Canonical required fields that must be filled to publish
 */
const REQUIRED_CANONICAL_FIELDS = ['title', 'description', 'category', 'price', 'condition'] as const

/**
 * Apply a template to current form data, handling schema drift gracefully
 *
 * Rules:
 * - Merge canonical fields: category, condition, brand, default_price → price
 * - Merge marketplaces → selectedPlatforms
 * - For platform_fields: validate & clean each marketplace's data (drop unknowns)
 * - Identify incomplete required fields after merge
 * - Return merged form + list of incomplete required field keys
 *
 * @param template - The ListingTemplate to apply
 * @param currentFormData - Current form state (template will merge into this)
 * @returns { merged, incompleteRequiredFields }
 */
export function applyTemplate(
  template: ListingTemplate,
  currentFormData: ListingFormData
): ApplyTemplateResult {
  // Start with current form data
  const merged = { ...currentFormData }

  // Merge canonical top-level fields
  if (template.category) {
    merged.category = template.category
  }
  if (template.condition) {
    merged.condition = template.condition
  }
  if (template.brand) {
    merged.brand = template.brand
  }
  if (template.default_price !== null && template.default_price !== undefined) {
    merged.price = template.default_price
  }

  // Merge marketplaces → selectedPlatforms
  if (template.marketplaces && template.marketplaces.length > 0) {
    merged.selectedPlatforms = [...new Set([...merged.selectedPlatforms, ...template.marketplaces])]
  }

  // Merge platform fields with validation (drop unknowns per marketplace)
  if (template.platform_fields && typeof template.platform_fields === 'object') {
    const cleanedPlatformFields = { ...merged.platformFields }

    for (const [marketplaceKey, fieldData] of Object.entries(template.platform_fields)) {
      if (marketplaceKey === 'vinted' || marketplaceKey === 'ebay') {
        // Validate & clean platform-specific fields
        const validated = validatePlatformFields(
          fieldData as Record<string, unknown>,
          marketplaceKey
        )

        if (Object.keys(validated).length > 0) {
          cleanedPlatformFields[marketplaceKey] = validated
        }
      }
      // Unknown marketplace keys are silently dropped
    }

    merged.platformFields = cleanedPlatformFields
  }

  // Identify incomplete required canonical fields
  const incompleteRequiredFields: string[] = []

  for (const field of REQUIRED_CANONICAL_FIELDS) {
    const value = merged[field as keyof typeof merged]
    if (value === null || value === undefined || value === '') {
      incompleteRequiredFields.push(field)
    }
  }

  // Check for incomplete platform-specific fields
  // If a marketplace is selected but has no platform_fields entry, flag it
  for (const platform of merged.selectedPlatforms) {
    const platformFields = merged.platformFields[platform as keyof typeof merged.platformFields]
    const fieldsObj = platformFields as Record<string, any> | undefined
    if (!fieldsObj || Object.keys(fieldsObj).length === 0) {
      incompleteRequiredFields.push(`platformFields.${platform}`)
    }
  }

  return {
    merged,
    incompleteRequiredFields,
  }
}
