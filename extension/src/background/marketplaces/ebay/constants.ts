/**
 * eBay Seller Hub constants for SSR scraping.
 */

export const EBAY_SELLER_HUB_BASE = "https://www.ebay.co.uk";
export const EBAY_ORDERS_PATH = "/sh/ord/";
export const EBAY_ORDERS_PER_PAGE = 50;

/** Timerange filter values matching eBay Seller Hub URL params */
export const EBAY_TIMERANGES = {
  LAST_90_DAYS: "LAST90DAYS",
  THIS_YEAR: "THISYEAR",
  LAST_YEAR: "PREVIOUSYEAR",
} as const;

export type EbayTimerange = (typeof EBAY_TIMERANGES)[keyof typeof EBAY_TIMERANGES];

/**
 * Build eBay Seller Hub orders URL with filters.
 */
export function buildOrdersUrl(
  timerange: EbayTimerange = EBAY_TIMERANGES.LAST_YEAR,
  offset = 0
): string {
  const filter = `status:ALL_ORDERS,timerange:${timerange}`;
  const params = new URLSearchParams({
    filter,
    limit: String(EBAY_ORDERS_PER_PAGE),
  });
  if (offset > 0) params.set("offset", String(offset));
  return `${EBAY_SELLER_HUB_BASE}${EBAY_ORDERS_PATH}?${params.toString()}`;
}
