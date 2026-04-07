import type { Find } from '@/types'

/**
 * Maps wrenlist category slugs → Vinted UK catalog IDs
 * Derived from the reverse map in /api/vinted/import/route.ts
 * Use the most general/default catalog ID per category for publishing
 */
const CATEGORY_TO_VINTED_CATALOG_ID: Record<string, number> = {
  // Phase 3 top-level categories
  antiques: 3823,
  art: 1934,
  baby_toddler: 1499,
  books_media: 2997,
  clothing: 4,
  craft_supplies: 1934,
  collectibles: 3823,
  electronics: 1934,
  health_beauty: 956,
  home_garden: 1934,
  musical_instruments: 1934,
  pet_supplies: 1934,
  sports_outdoors: 1934,
  toys_games: 1499,
  vehicles_parts: 1934,
  other: 1934,
  // Legacy (backward compat)
  ceramics: 1960,
  teapots: 3856,
  jugs: 3857,
  glassware: 2005,
  books: 2997,
  jewellery: 21,
  homeware: 1934,
  medals: 167,
  toys: 1499,
  furniture: 3154,
}

const CATEGORY_TO_EBAY_CATEGORY_ID: Record<string, number> = {
  // Phase 3 top-level categories
  antiques: 20081,
  art: 550,
  baby_toddler: 2984,
  books_media: 267,
  clothing: 15724,
  craft_supplies: 14339,
  collectibles: 1,
  electronics: 293,
  health_beauty: 26395,
  home_garden: 11700,
  musical_instruments: 619,
  pet_supplies: 1281,
  sports_outdoors: 888,
  toys_games: 220,
  vehicles_parts: 6000,
  other: 99,
  // Legacy (backward compat)
  ceramics: 163531,
  glassware: 870,
  books: 267,
  jewellery: 281,
  homeware: 20444,
  medals: 4702,
  furniture: 20091,
}

// For now, we'll define Condition mapping locally since the extension has its own Condition enum
type ProductCondition = 'NewWithTags' | 'NewWithoutTags' | 'VeryGood' | 'Good' | 'Fair' | 'Poor'

interface ShippingInfo {
  domesticShipping?: number
  worldwideShipping?: number
  sellerPays?: boolean
  shippingType?: string
  allowLocalPickup?: boolean
  doorPickup?: boolean
  doorDropoff?: boolean
  shippingWeight?: {
    value: number
    unit: string
    inOunces?: number
    inGrams?: number
  }
  shippingHeight?: number
  shippingWidth?: number
  shippingLength?: number
  preferredCarrier?: string
  shippingAddress?: {
    street?: string
    address2?: string
    city?: string
    region?: string
    zipCode?: string
    country?: string
    lat?: number
    lng?: number
  }
}

interface ExtensionProduct {
  id: string
  marketPlaceId?: string
  marketplaceId?: string
  marketplaceUrl?: string
  title: string
  description: string
  price: number
  condition: ProductCondition
  category: string[]
  size?: string[]
  tags?: string
  color?: string
  color2?: string
  brand?: string
  sku?: string
  barcode?: string
  images?: string[]
  styleTags?: string[]
  whenMade?: string
  quantity?: number
  originalPrice?: number
  availability?: string
  acceptOffers?: boolean
  smartPricing?: boolean
  smartPricingPrice?: number
  dynamicProperties: Record<string, string>
  shipping: ShippingInfo & Record<string, unknown>
}

/**
 * Convert a Find (from wrenlist platform) to ExtensionProduct format
 * for use by the Vinted/eBay extension
 */
export function findToExtensionProduct(find: Find): ExtensionProduct {
  // Map FindCondition to ProductCondition enum
  const conditionMap: Record<string, ProductCondition> = {
    excellent: 'VeryGood',
    good: 'Good',
    fair: 'Fair',
  }

  const condition: ProductCondition = find.condition ? (conditionMap[find.condition] || 'Good') : 'Good'

  // Build shipping info from find fields
  const shipping: ShippingInfo = {
    shippingType: 'Prepaid',
    shippingWeight: find.shipping_weight_grams
      ? {
          value: find.shipping_weight_grams,
          unit: 'grams',
          inGrams: find.shipping_weight_grams,
        }
      : undefined,
    shippingHeight: find.shipping_height_cm || undefined,
    shippingWidth: find.shipping_width_cm || undefined,
    shippingLength: find.shipping_length_cm || undefined,
  }

  // Extract Vinted & eBay metadata from platform_fields if available
  const vintedMetadata = find.platform_fields?.vinted
  const ebayMetadata = find.platform_fields?.ebay

  // Resolve Vinted catalog ID: prefer stored value, fall back to category mapping
  const resolvedCatalogId: number | undefined =
    vintedMetadata?.catalogId ??
    (find.category ? (CATEGORY_TO_VINTED_CATALOG_ID[find.category.toLowerCase()] ?? CATEGORY_TO_VINTED_CATALOG_ID['other']) : undefined)

  // Resolve eBay category ID: prefer stored value, fall back to category mapping
  const resolvedEbayCategoryId: number | undefined =
    ebayMetadata?.categoryId ??
    (find.category ? (CATEGORY_TO_EBAY_CATEGORY_ID[find.category.toLowerCase()] ?? CATEGORY_TO_EBAY_CATEGORY_ID['other']) : undefined)

  return {
    id: find.id,
    title: find.name,
    description: find.description || '',
    price: find.asking_price_gbp || 0,
    condition,
    category: find.category ? [find.category] : [],
    size: find.size ? [find.size] : undefined,
    color: find.colour || undefined,
    brand: find.brand || undefined,
    sku: find.sku || undefined,
    images: find.photos || [],
    quantity: 1,
    shipping: shipping as ShippingInfo & Record<string, unknown>,
    dynamicProperties: {
      ...(resolvedCatalogId && { vintedCatalogId: String(resolvedCatalogId) }),
      ...(resolvedEbayCategoryId && { ebayCategoryId: String(resolvedEbayCategoryId) }),
      ...(vintedMetadata?.packageSizeId && { packageSizeId: String(vintedMetadata.packageSizeId) }),
      ...(vintedMetadata?.colorIds && { colorIds: vintedMetadata.colorIds.map(String).join(',') }),
      ...(vintedMetadata?.materialId && { materialId: String(vintedMetadata.materialId) }),
    },
  }
}
