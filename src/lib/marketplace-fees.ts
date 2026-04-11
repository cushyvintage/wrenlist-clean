/**
 * Static seller-fee rates per marketplace (UK).
 *
 * These are approximations used by the platform-margin insight to compare
 * net margins across channels. Real fees vary by category, seller level,
 * and payment provider — the insight uses them as a directional signal,
 * not a precise accounting number. Update these if rates change.
 */

export type MarketplaceFeeSpec = {
  /** Percentage of sale price taken as commission/final-value fee (0–1). */
  pct: number
  /** Fixed per-transaction fee in GBP. */
  flat: number
}

export const MARKETPLACE_FEES: Record<string, MarketplaceFeeSpec> = {
  // Vinted: buyer pays the buyer protection fee; seller keeps 100% of listed price.
  vinted: { pct: 0, flat: 0 },

  // eBay UK private seller: 0% sell fees on most categories since 2024,
  // but include the regulated per-item buyer protection fee (~4% + 75p cap).
  // Using 4% flat as a conservative directional proxy.
  ebay: { pct: 0.04, flat: 0 },

  // Etsy: 6.5% transaction fee + ~4% payment processing = ~10.5%.
  etsy: { pct: 0.105, flat: 0.2 },

  // Depop: 10% selling fee + ~3.3% + 20p payment processing.
  depop: { pct: 0.133, flat: 0.2 },

  // Shopify: no marketplace fee; seller pays subscription + payment processing.
  // Treat as 3% for Shopify Payments.
  shopify: { pct: 0.03, flat: 0 },

  // Facebook Marketplace local: no fee.
  facebook: { pct: 0, flat: 0 },

  // Default / unknown
  other: { pct: 0.05, flat: 0 },
}

/** Fees a seller pays on a given sale on the given marketplace. */
export function calculateFees(marketplace: string, salePrice: number): number {
  const spec = MARKETPLACE_FEES[marketplace] ?? MARKETPLACE_FEES.other!
  return salePrice * spec.pct + spec.flat
}
