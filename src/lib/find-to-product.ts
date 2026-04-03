import type { Find } from '@/types'

// For now, we'll define Condition mapping locally since the extension has its own Condition enum
type CrosslistCondition = 'NewWithTags' | 'NewWithoutTags' | 'VeryGood' | 'Good' | 'Fair' | 'Poor'

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

interface CrosslistProduct {
  id: string
  marketPlaceId?: string
  marketplaceId?: string
  marketplaceUrl?: string
  title: string
  description: string
  price: number
  condition: CrosslistCondition
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
 * Convert a Find (from wrenlist platform) to CrosslistProduct format
 * for use by the Vinted/eBay extension
 */
export function findToCrosslistProduct(find: Find): CrosslistProduct {
  // Map FindCondition to CrosslistCondition enum
  const conditionMap: Record<string, CrosslistCondition> = {
    excellent: 'VeryGood',
    good: 'Good',
    fair: 'Fair',
  }

  const condition: CrosslistCondition = find.condition ? (conditionMap[find.condition] || 'Good') : 'Good'

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

  // Extract Vinted metadata from platform_fields if available
  const vintedMetadata = find.platform_fields?.vinted

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
      ...(vintedMetadata?.catalogId && { vintedCatalogId: String(vintedMetadata.catalogId) }),
      ...(vintedMetadata?.packageSizeId && { packageSizeId: String(vintedMetadata.packageSizeId) }),
      ...(vintedMetadata?.colorIds && { colorIds: vintedMetadata.colorIds.map(String).join(',') }),
      ...(vintedMetadata?.materialId && { materialId: String(vintedMetadata.materialId) }),
    },
  }
}
