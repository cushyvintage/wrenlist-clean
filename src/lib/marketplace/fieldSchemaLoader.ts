import fieldSchemasData from '@/data/marketplace/crosslist-field-schemas.json'
import categoryMappingsData from '@/data/marketplace/category-mappings.json'

// Types based on schema structure
export interface FieldDefinition {
  n: string // Name
  l: string // Label
  t: 'SelectList' | 'TextBox' | 'TextArea' | 'Checkbox' | 'YearSelectList' | 'NestedSelectList'
  r: 0 | 1 // Required
  h: 0 | 1 // Hint/Wren-suggested
  ms: number | null // Max selections
  mp: string[] // Marketplaces
}

export interface FieldSet {
  id: number
  fields: FieldDefinition[]
}

export interface CategoryMapping {
  id: string
  label: string
  emoji?: string
  vinted?: any
  ebay?: any
  etsy?: any
}

// Transform field types from schema to component types
export function transformFieldType(
  schemaType: FieldDefinition['t']
): 'text' | 'textarea' | 'select' | 'checkbox' | 'year' {
  switch (schemaType) {
    case 'TextBox':
      return 'text'
    case 'TextArea':
      return 'textarea'
    case 'SelectList':
    case 'NestedSelectList':
      return 'select'
    case 'Checkbox':
      return 'checkbox'
    case 'YearSelectList':
      return 'year'
    default:
      return 'text'
  }
}

/**
 * Get field set for a category (by category UUID)
 */
export function getFieldSetForCategory(categoryUuid: string): FieldSet | null {
  const catToFieldSet = (fieldSchemasData as any).catToFieldSet || {}
  const fieldSetId = catToFieldSet[categoryUuid]

  if (fieldSetId === undefined) {
    return null
  }

  const fieldSets = (fieldSchemasData as any).fieldSets || []
  return fieldSets[fieldSetId] || null
}

/**
 * Get fields for specific marketplaces
 */
export function getFieldsForMarketplaces(
  fieldSet: FieldSet | null,
  marketplaces: string[]
): FieldDefinition[] {
  if (!fieldSet) return []

  return fieldSet.fields.filter((field) =>
    field.mp.some((mp) => marketplaces.includes(mp))
  )
}

/**
 * Get all category mappings
 */
export function getAllCategories(): CategoryMapping[] {
  const categories = (categoryMappingsData as any).categories || []
  return categories
}

/**
 * Get field count for a marketplace
 */
export function getFieldCountForFields(fields: FieldDefinition[]): {
  total: number
  filled: number
  required: number
} {
  return {
    total: fields.length,
    filled: 0,
    required: fields.filter((f) => f.r === 1).length,
  }
}

/**
 * Transform a field definition to component-ready format
 */
export interface ComponentField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'year'
  required: boolean
  isWrenSuggested: boolean
  platforms: string[]
  value: string
  options?: string[] // For select types, fetched from API
}

export function transformField(field: FieldDefinition, value: string = ''): ComponentField {
  return {
    name: field.n,
    label: field.l,
    type: transformFieldType(field.t),
    required: field.r === 1,
    isWrenSuggested: field.h === 1,
    platforms: field.mp,
    value: value,
    options: field.t === 'SelectList' ? [] : undefined, // Will be fetched live
  }
}
