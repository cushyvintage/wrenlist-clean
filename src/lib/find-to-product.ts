import type { Find } from '@/types'

/**
 * Maps wrenlist category slugs → Vinted UK catalog IDs
 * Derived from the reverse map in /api/vinted/import/route.ts
 * Use the most general/default catalog ID per category for publishing
 */
const CATEGORY_TO_VINTED_CATALOG_ID: Record<string, number> = {
  ceramics: 1960,     // Home > Tableware & Crockery > General
  teapots: 3856,      // Home > Tableware > Teapots
  jugs: 3857,         // Home > Tableware > Jugs & Pitchers
  glassware: 2005,    // Home > Glassware > General
  books: 2997,        // Books > General
  jewellery: 21,      // Accessories > Jewellery > General
  clothing: 4,        // Women > Clothing (generic fallback)
  homeware: 1934,     // Home > Home Decor
  collectibles: 3823, // Antiques > Collectibles
  medals: 167,        // Antiques > Medals
  toys: 1499,         // Toys & Games > General
  furniture: 3154,    // Home > Furniture
  other: 1934,        // fallback → Home & Decor
}

const CATEGORY_TO_EBAY_CATEGORY_ID: Record<string, number> = {
  ceramics: 163531,
  glassware: 870,
  books: 267,
  jewellery: 281,
  clothing: 15724,
  homeware: 20444,
  collectibles: 1,
  medals: 4702,
  toys: 19016,
  furniture: 20091,
  other: 99,
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
