'use client'

// Client-only loader for large JSON files
// This module is ONLY imported on the client side to avoid SSR bundle bloat

let fieldSchemasData: any = null
let categoryMappingsData: any = null

export async function loadFieldSchemas() {
  if (fieldSchemasData) return fieldSchemasData
  const module = await import('@/data/marketplace/crosslist-field-schemas.json')
  fieldSchemasData = module.default
  return fieldSchemasData
}

export async function loadCategoryMappings() {
  if (categoryMappingsData) return categoryMappingsData
  const module = await import('@/data/marketplace/category-mappings.json')
  categoryMappingsData = module.default
  return categoryMappingsData
}

export function getFieldSchemasSync(): any {
  return fieldSchemasData
}

export function getCategoryMappingsSync(): any {
  return categoryMappingsData
}
