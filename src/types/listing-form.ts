/**
 * Shared types for listing forms across add-find and inventory pages
 */

import type { FindCondition, Platform } from './index'

export interface PlatformFieldsData {
  /** Shared marketplace fields (colour text, type, style, etc.) — platform-agnostic input values */
  shared?: Record<string, string | string[] | boolean | undefined>
  vinted?: {
    primaryColor?: number
    secondaryColor?: number
    conditionDescription?: string
    material?: number[]
    author?: string
    isbn?: string
    language?: string
  }
  ebay?: {
    acceptOffers?: boolean
    isAuction?: boolean
    author?: string
    isbn?: string
    language?: string
  }
}

export interface ListingFormData {
  // Canonical fields
  title: string
  description: string
  category: string
  price: number | null
  brand: string
  condition: FindCondition
  quantity: number

  // Photos
  photos: File[]
  photoPreviews: string[]

  // Platform selection
  selectedPlatforms: Platform[]

  // Platform-specific fields
  platformFields: PlatformFieldsData

  // Shipping
  shippingWeight: number | null
  shippingDimensions: {
    length: number | null
    width: number | null
    height: number | null
  }

  // Internal fields
  sku: string
  costPrice: number | null
  internalNote: string

  // Pricing overrides
  platformPrices: Partial<Record<Platform, number | null>>
}

export const DEFAULT_FORM_DATA: ListingFormData = {
  title: '',
  description: '',
  category: '',
  price: null,
  brand: '',
  condition: 'good',
  quantity: 1,
  photos: [],
  photoPreviews: [],
  selectedPlatforms: [],
  platformFields: {},
  shippingWeight: null,
  shippingDimensions: { length: null, width: null, height: null },
  sku: '',
  costPrice: null,
  internalNote: '',
  platformPrices: { vinted: null, ebay: null, etsy: null, shopify: null },
}
