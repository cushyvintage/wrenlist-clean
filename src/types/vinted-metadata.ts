/**
 * TypeScript interface for stored Vinted metadata
 * Mirrors what the extension serializes into platform_fields.vinted.vintedMetadata
 */

export interface VintedItemAttribute {
  code: string
  ids: number[]
}

export interface VintedShipping {
  weight_grams?: number
  package_size_id?: number
}

export interface VintedStoredMetadata {
  catalog_id?: number
  brand_id?: number
  brand_title?: string
  color_ids?: number[]
  color_titles?: string[]
  size_id?: number
  size_title?: string
  package_size_id?: number
  shipping?: VintedShipping
  isbn?: string
  item_attributes?: VintedItemAttribute[]
  status_id?: number
  is_draft?: boolean
}
