import type { Product, MarketplaceListingResult } from "../../types.js";
import { Condition } from "../../shared/enums.js";
import {
  ETSY_BASE_URL,
  ETSY_CREATE_LISTING_URL,
  ETSY_EDIT_LISTING_URL,
  ETSY_LISTINGS_MANAGER_URL,
  ETSY_SESSION_COOKIE,
  ETSY_WHEN_MADE_VINTAGE,
  ETSY_WHEN_MADE_RECENT,
  WRENLIST_TO_ETSY_CATEGORY,
} from "./constants.js";
import { log, wait, remoteLog } from "../../shared/api.js";

// ─── Raw SSR types (from Etsy's embedded JSON) ─────────────────────
interface RawEtsyMoney { value: number; currency_code: string; formatted_value: string | null }
interface RawEtsyCostBreakdown {
  items_cost?: RawEtsyMoney; discounted_items_cost?: RawEtsyMoney;
  shipping_cost?: RawEtsyMoney; total_cost?: RawEtsyMoney;
  tax_cost?: RawEtsyMoney; discount?: RawEtsyMoney;
  refund?: RawEtsyMoney; buyer_cost?: RawEtsyMoney;
  gift_wrap_cost?: RawEtsyMoney; adjusted_total_cost?: RawEtsyMoney;
}
interface RawEtsyPayment {
  payment_method?: string; cost_breakdown?: RawEtsyCostBreakdown;
}
interface RawEtsyBuyer {
  buyer_id: number; name?: string; username?: string; email?: string;
  profile_url?: string; is_repeat_buyer?: boolean;
}
interface RawEtsyPackageItem { transaction_id: string | number }
interface RawEtsyPackage {
  shipping_method_name?: string; tracking_code?: string; carrier_name?: string;
  shipping_cost?: RawEtsyMoney; package_items?: RawEtsyPackageItem[];
}
interface RawEtsyTransactionReview {
  type?: string; rating?: number; message?: string;
  create_date?: number; url?: string; image_url?: string | null;
}
interface RawEtsyOrderTransaction {
  transaction_id: number; listing_id: number; quantity?: number;
  cost?: RawEtsyMoney;
  product?: { title?: string; image_url_75x75?: string; is_sold_out?: boolean; product_refund_amount?: RawEtsyMoney };
  status?: { is_cancelled?: boolean; has_pending_cancellation?: boolean };
  review?: RawEtsyTransactionReview;
  variations?: Array<{ formatted_name?: string; formatted_value?: string }>;
}
interface RawEtsyOrder {
  order_id: number; order_date: number; buyer_id: number;
  transaction_ids?: number[]; transactions?: RawEtsyOrderTransaction[];
  payment?: RawEtsyPayment;
  is_canceled?: boolean; order_url?: string;
  is_gift?: boolean; is_gift_wrapped?: boolean; gift_message?: string;
  shipping_address?: Record<string, unknown>;
  fulfillment?: Record<string, unknown>;
}

/** Parsed Etsy order for use in Wrenlist sync */
export interface EtsyOrder {
  orderId: number;
  orderDate: string | null;
  orderUrl: string | null;
  isCanceled: boolean;
  transactionIds: number[];
  buyer: {
    id: string; name: string | null; username: string | null;
    email: string | null; profileUrl: string | null; isRepeatBuyer: boolean;
  } | null;
  grossAmount: number | null;
  shippingCost: number | null;
  taxAmount: number | null;
  discount: number | null;
  refundAmount: number | null;
  buyerPaid: number | null;
  netAmount: number | null;
  currency: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  deliveryStatus: string | null;
  isGift: boolean;
  giftMessage: string | null;
  shippingAddress: {
    name: string | null; firstLine: string | null; secondLine: string | null;
    city: string | null; state: string | null;
    country: string | null; zip: string | null;
  } | null;
  items: Array<{
    transactionId: string; listingId: string; title: string | null;
    imageUrl: string | null; cost: number | null; quantity: number;
    isCancelled: boolean;
    review: { rating: number; text: string | null; date: string | null; url: string | null } | null;
  }>;
  itemCount: number;
  /** Listing IDs resolved from transaction_id → listing_id mapping */
  listingIds: string[];
}

export interface EtsyShopStats {
  shopName: string | null;
  shopId: string | null;
  starSeller: {
    isStarSeller: boolean;
    responseRate: number | null;
    shippingOnTime: number | null;
    reviewScore: number | null;
    caseRate: number | null;
  } | null;
  stats: {
    visits: number | null;
    orders: number | null;
    revenue: number | null;
    conversionRate: number | null;
    dateRange: string | null;
    startDate: string | null;
    endDate: string | null;
  } | null;
  ads: {
    offsiteAdsStatus: string | null;
    offsiteFeeRate: number | null;
    shareAndSaveStats: Record<string, unknown> | null;
  } | null;
  customerInsights: Record<string, unknown> | null;
  scrapedAt: string;
  rawStats: unknown;
  rawStarSeller: unknown;
}

export interface EtsyListingQuality {
  totalOpportunities: number;
  listingsWithIssues: number;
  issues: Array<{
    component: string;
    listingCount: number;
    listingIds: number[];
    ranking: number;
  }>;
}

/** Convert Etsy money (pence/cents) to pounds/dollars */
function moneyToPounds(m: RawEtsyMoney | undefined): number | null {
  if (!m || m.value == null) return null;
  return m.value / 100;
}

interface EtsyListingSummary {
  listing_id: number;
  title: string;
  price: string;
  url: string;
  listing_images: Array<{ url: string }>;
  tags: string[];
  quantity: number;
  /** Unix timestamp (seconds) when the listing was first created */
  created_tsz?: number;
  /** Unix timestamp (seconds) for the original creation (survives relists) */
  original_creation_tsz?: number;
}

interface EtsyListingDetail {
  listing_id: number;
  title: string;
  description: string;
  price: string;
  price_int: number;
  currency_code: string;
  url: string;
  images: string[];
  listing_images: Array<{ url: string }>;
  tags: string[];
  materials: string[];
  quantity: number;
  is_vintage: boolean;
  when_made: string;
  taxonomy_name: string;
}

export type ListingActionResult = {
  success: boolean;
  message?: string;
  product?: { id: string | number; url: string };
  error?: string;
  needsLogin?: boolean;
  /** Etsy only: whether the listing was saved as draft or published live. */
  publishMode?: "draft" | "publish";
};

// ─── Shop config types (cached from listing-editor SSR) ──────────
export interface EtsyFrequentCategory {
  id: number;
  fullPathNames: string[];
  attributeIds?: number[];
}

export interface EtsyShippingProfile {
  shipping_profile_id: number;
  title: string;
  is_default?: boolean;
}

export interface EtsyReturnPolicy {
  return_policy_id: number;
  accepts_returns: boolean;
  accepts_exchanges: boolean;
}

export interface EtsyShopConfig {
  frequentCategories: EtsyFrequentCategory[];
  shippingProfiles: EtsyShippingProfile[];
  returnPolicies: EtsyReturnPolicy[];
  fetchedAt: number; // epoch ms
}

const SHOP_CONFIG_CACHE_KEY = "wrenlist_etsy_shop_config";
const SHOP_CONFIG_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Data passed into the injected form-fill script */
interface EtsyFormFillData {
  title: string;
  description: string;
  price: number;
  quantity: number;
  categorySearch: string;
  tags: string;
  imageUrls: string[];
  coverUrl: string | undefined;
  whenMade: string;
  whoMade?: string;
  sku: string;
  isVintage: boolean;
}

export class EtsyClient {
  private readonly baseUrl: string;
  private shopId: string | null = null;

  constructor() {
    this.baseUrl = ETSY_BASE_URL;
  }

  public async checkLogin(): Promise<boolean> {
    const cookie = await chrome.cookies.get({
      url: this.baseUrl,
      name: ETSY_SESSION_COOKIE,
    });
    return !!cookie;
  }

  public getProductUrl(id: string | number): string {
    return `${this.baseUrl}/listing/${id}`;
  }

  private async getShopId(): Promise<string> {
    if (this.shopId) return this.shopId;

    const html = await fetch(ETSY_LISTINGS_MANAGER_URL, {
      credentials: "include",
    }).then((r) => r.text());

    const match =
      html.match(/"shop_id"\s*:\s*(\d+)/) ??
      html.match(/\/shop\/(\d+)\//) ??
      html.match(/shops\/(\d+)/);

    if (!match?.[1]) {
      throw new Error("Could not determine Etsy shop ID.");
    }

    this.shopId = match[1];
    return this.shopId;
  }

  // ─── Import (read-only) ────────────────────────────────────────────

  /**
   * Fetch listings for a single state. Used internally by getListings() and getAllListings().
   */
  private async fetchListingsByState(
    state: string,
    offset: number,
    limit: number,
  ): Promise<{ listings: EtsyListingSummary[]; hasMore: boolean }> {
    const shopId = await this.getShopId();

    const url = new URL(
      `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/v3/search`,
    );
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("sort_field", "ending_date");
    url.searchParams.set("sort_order", "descending");
    url.searchParams.set("state", state);
    url.searchParams.set("language_id", "0");
    url.searchParams.set("query", "");
    url.searchParams.set("is_retail", "true");

    const resp = await fetch(url.toString(), {
      credentials: "include",
      headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
      throw new Error(`Etsy listings API returned ${resp.status}`);
    }

    const data = (await resp.json()) as EtsyListingSummary[];
    const listings = Array.isArray(data) ? data : [];

    return { listings, hasMore: listings.length === limit };
  }

  public async getListings(
    page?: string,
    limit = 40,
  ): Promise<MarketplaceListingResult> {
    const offset = page ? parseInt(page, 10) * limit : 0;
    const { listings, hasMore } = await this.fetchListingsByState("active", offset, limit);

    const products: MarketplaceListingResult["products"] = listings.map(
      (l) => ({
        marketplaceId: String(l.listing_id),
        title: l.title ?? null,
        price: l.price ? parseFloat(l.price) : null,
        coverImage: l.listing_images?.[0]?.url ?? null,
        created: (l.original_creation_tsz || l.created_tsz)
          ? new Date((l.original_creation_tsz || l.created_tsz)! * 1000).toISOString()
          : null,
        marketplaceUrl: l.url ?? this.getProductUrl(l.listing_id),
      }),
    );

    const nextPage = hasMore ? String((offset + limit) / limit) : null;
    return { products, nextPage };
  }

  /**
   * Fetch all listings across active, sold_out, and draft states.
   * Etsy's API only accepts one state per request, so we make sequential calls.
   */
  public async getAllListings(
    limit = 40,
  ): Promise<MarketplaceListingResult> {
    const allProducts: MarketplaceListingResult["products"] = [];
    const states = ["active", "sold_out", "draft", "expired"] as const;

    for (const state of states) {
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        // MV3 keepalive — prevent 30s service worker timeout
        chrome.storage.local.set({ _keepAlive: Date.now() });

        const result = await this.fetchListingsByState(state, offset, limit);

        for (const l of result.listings) {
          allProducts.push({
            marketplaceId: String(l.listing_id),
            title: l.title ?? null,
            price: l.price ? parseFloat(l.price) : null,
            coverImage: l.listing_images?.[0]?.url ?? null,
            created: (l.original_creation_tsz || l.created_tsz)
              ? new Date((l.original_creation_tsz || l.created_tsz)! * 1000).toISOString()
              : null,
            marketplaceUrl: l.url ?? this.getProductUrl(l.listing_id),
            isSold: state === "sold_out",
            isHidden: state === "draft",
            isExpired: state === "expired",
          });
        }

        hasMore = result.hasMore;
        offset += limit;
      }
    }

    return { products: allProducts, nextPage: null };
  }

  // ─── Receipts (SSR HTML scraping) ─────────────────────────────────

  /**
   * Fetch sold order receipts from Etsy's SSR orders page.
   * Etsy has no internal JSON API for receipts — the data is embedded
   * as JSON inside a script tag on the orders page HTML.
   * Path: data.initial_data.orders.orders_search.{orders,buyers,packages}
   */
  public async getReceipts(
    page = 1,
    status: "completed" | "open" = "completed",
  ): Promise<{
    orders: EtsyOrder[];
    totalPages: number;
    page: number;
  }> {
    const url = `${this.baseUrl}/your/orders/sold/${status}?completed_date=all&page=${page}`;
    const resp = await fetch(url, {
      credentials: "include",
      headers: { Accept: "text/html" },
    });

    if (!resp.ok) {
      throw new Error(`Etsy orders page returned ${resp.status}`);
    }

    const html = await resp.text();

    // totalPages is computed below after parsing the SSR JSON (search.total_count).
    // We declare it here so the early-return paths can reference it.
    let totalPages = 1;

    // Find the largest script tag containing order data
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let orderScript = "";
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const content = scriptMatch[1];
      if (content.includes("Etsy_Order_Transaction") && content.length > orderScript.length) {
        orderScript = content;
      }
    }

    if (!orderScript) return { orders: [], totalPages, page };

    // Parse the JSON blob (assigned to a JS variable in a script tag)
    let parsed: Record<string, unknown> | null = null;
    const jsonMatch = orderScript.match(/=\s*(\{[\s\S]+\})\s*;?\s*$/);
    if (jsonMatch?.[1]) {
      try { parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>; } catch { /* ignore */ }
    }
    if (!parsed) {
      try { parsed = JSON.parse(orderScript) as Record<string, unknown>; } catch { /* ignore */ }
    }
    if (!parsed) return { orders: [], totalPages, page };

    // Navigate to data.initial_data.orders.orders_search
    const data = parsed.data as Record<string, unknown> | undefined;
    const initialData = data?.initial_data as Record<string, unknown> | undefined;
    const ordersData = initialData?.orders as Record<string, unknown> | undefined;
    const search = ordersData?.orders_search as Record<string, unknown> | undefined;

    if (!search) return { orders: [], totalPages, page };

    // Compute totalPages from total_count (20 orders per page on Etsy)
    const ORDERS_PER_PAGE = 20;
    const totalCount =
      (search.total_count as number | undefined) ??
      (search.total_search_hit_count as number | undefined);
    if (totalCount != null && totalCount > 0) {
      totalPages = Math.ceil(totalCount / ORDERS_PER_PAGE);
    } else {
      // HTML fallback: look for "of N" in pagination or JSON fields
      const totalPagesJson = html.match(/"total_pages"\s*:\s*(\d+)/);
      const totalPagesHtml =
        html.match(/>\s*of\s+(\d+)\s*</) ||
        html.match(/page_count["\s:]+(\d+)/) ||
        html.match(/total_page[s]?["\s:]+(\d+)/);
      if (totalPagesJson) {
        totalPages = parseInt(totalPagesJson[1], 10);
      } else if (totalPagesHtml) {
        totalPages = parseInt(totalPagesHtml[1], 10);
      }
    }

    const rawOrders = (search.orders || []) as RawEtsyOrder[];
    const rawBuyers = (search.buyers || []) as RawEtsyBuyer[];
    const rawPackages = (search.packages || []) as RawEtsyPackage[];

    // Index buyers by buyer_id
    const buyerMap = new Map<number, RawEtsyBuyer>();
    for (const b of rawBuyers) {
      if (b.buyer_id) buyerMap.set(b.buyer_id, b);
    }

    // Map raw orders to EtsyOrder
    const orders: EtsyOrder[] = rawOrders.map((o) => {
      const buyer = buyerMap.get(o.buyer_id);

      // Find packages matching this order's transactions
      // transaction_id in package_items is a string, but in orders it's a number
      const txnIdStrs = (o.transaction_ids || []).map(String);
      const orderPackages = rawPackages.filter((p) =>
        p.package_items?.some((pi) =>
          txnIdStrs.includes(String(pi.transaction_id))
        )
      );
      const pkg = orderPackages[0];

      const payment = o.payment as RawEtsyPayment | undefined;
      const costBreakdown = payment?.cost_breakdown as RawEtsyCostBreakdown | undefined;

      // Extract fulfillment data — actual paths from Etsy SSR JSON:
      // fulfillment.to_address = shipping address
      // fulfillment.status.physical_status.shipping_status = ship date + delivery status
      // fulfillment.shipping_method = method name
      // NOTE: tracking codes are NOT in the list view — only on individual order pages
      const ful = o.fulfillment as Record<string, unknown> | undefined;
      const fulStatus = ful?.status as Record<string, unknown> | undefined;
      const physicalStatus = fulStatus?.physical_status as Record<string, unknown> | undefined;
      const shippingStatus = physicalStatus?.shipping_status as Record<string, unknown> | undefined;
      const trackingStatus = shippingStatus?.tracking_status as Record<string, unknown> | undefined;
      const deliverySummary = trackingStatus?.summary as string | undefined; // e.g. "Delivered"

      // Shipping address from fulfillment.to_address
      const toAddress = ful?.to_address as Record<string, unknown> | undefined;

      // Per-transaction items with reviews
      const items = (o.transactions || []).map((t) => ({
        transactionId: String(t.transaction_id),
        listingId: String(t.listing_id),
        title: t.product?.title || null,
        imageUrl: t.product?.image_url_75x75 || null,
        cost: moneyToPounds(t.cost),
        quantity: t.quantity ?? 1,
        isCancelled: t.status?.is_cancelled || false,
        review: t.review?.rating != null ? {
          rating: t.review.rating,
          text: t.review.message || null,
          date: t.review.create_date ? new Date(t.review.create_date * 1000).toISOString() : null,
          url: t.review.url || null,
        } : null,
      }));

      return {
        orderId: o.order_id,
        orderDate: o.order_date ? new Date(o.order_date * 1000).toISOString() : null,
        orderUrl: o.order_url || null,
        isCanceled: o.is_canceled || false,
        transactionIds: o.transaction_ids || [],
        buyer: buyer ? {
          id: String(buyer.buyer_id),
          name: buyer.name || null,
          username: buyer.username || null,
          email: buyer.email || null,
          profileUrl: buyer.profile_url || null,
          isRepeatBuyer: buyer.is_repeat_buyer || false,
        } : null,
        // grossAmount = items_cost (what seller listed at, before discount)
        // netAmount = grossAmount - discount (seller receives before Etsy fees)
        // buyerPaid = total_cost (items + shipping + tax — what buyer paid)
        grossAmount: moneyToPounds(costBreakdown?.items_cost),
        shippingCost: moneyToPounds(costBreakdown?.shipping_cost),
        taxAmount: moneyToPounds(costBreakdown?.tax_cost),
        discount: moneyToPounds(costBreakdown?.discount),
        refundAmount: moneyToPounds(costBreakdown?.refund),
        buyerPaid: moneyToPounds(costBreakdown?.buyer_cost ?? costBreakdown?.total_cost),
        netAmount: (() => {
          const gross = moneyToPounds(costBreakdown?.items_cost);
          const disc = moneyToPounds(costBreakdown?.discount);
          const refund = moneyToPounds(costBreakdown?.refund);
          if (gross == null) return null;
          return Math.round((gross - (disc ?? 0) - (refund ?? 0)) * 100) / 100;
        })(),
        currency: costBreakdown?.items_cost?.currency_code || "GBP",
        paymentMethod: payment?.payment_method || null,
        shippingMethod: (ful?.shipping_method as string) || pkg?.shipping_method_name || null,
        trackingNumber: pkg?.tracking_code || null,
        carrier: pkg?.carrier_name || null,
        deliveryStatus: deliverySummary || null,
        isGift: o.is_gift || false,
        giftMessage: o.gift_message || null,
        shippingAddress: toAddress ? {
          name: (toAddress.name as string) || null,
          firstLine: (toAddress.first_line as string) || null,
          secondLine: (toAddress.second_line as string) || null,
          city: (toAddress.city as string) || null,
          state: (toAddress.state as string) || null,
          country: (toAddress.country as string) || null,
          zip: (toAddress.zip as string) || null,
        } : null,
        items,
        itemCount: items.length || o.transaction_ids?.length || 0,
        listingIds: items
          .map((i) => i.listingId)
          .filter((id) => id !== "undefined" && id !== "null"),
      };
    });

    return { orders, totalPages, page };
  }

  /**
   * Scrape shop stats + star seller data from Etsy SSR pages.
   * Returns parsed metrics for display + raw JSON for ML training.
   */
  public async getShopStats(): Promise<EtsyShopStats> {
    const result: EtsyShopStats = {
      shopName: null, shopId: null,
      starSeller: null, stats: null,
      ads: null, customerInsights: null,
      scrapedAt: new Date().toISOString(),
      rawStats: null, rawStarSeller: null,
    };

    // Helper: extract embedded JSON from Etsy SSR page
    const extractSSR = async (url: string): Promise<Record<string, unknown> | null> => {
      chrome.storage.local.set({ _keepAlive: Date.now() });
      const resp = await fetch(url, { credentials: "include", headers: { Accept: "text/html" } });
      if (!resp.ok) return null;
      const html = await resp.text();
      const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
      const dataScript = scripts.find((s) => s.includes("initial_data"));
      if (!dataScript) return null;
      const inner = dataScript.replace(/<\/?script[^>]*>/gi, "").trim();
      const jsonMatch = inner.match(/=\s*(\{[\s\S]+\})\s*;?\s*$/);
      if (!jsonMatch?.[1]) return null;
      try {
        const parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
        const data = parsed.data as Record<string, unknown> | undefined;
        return (data?.initial_data as Record<string, unknown>) || parsed;
      } catch { return null; }
    };

    // 1. Shop stats page
    try {
      const statsData = await extractSSR(`${this.baseUrl}/your/shops/me/stats`);
      if (statsData) {
        result.rawStats = statsData;
        const ms = statsData.metrics_summary as Record<string, { total?: string }> | undefined;
        if (ms) {
          const parseNum = (s?: string): number | null => {
            if (!s) return null;
            const n = parseFloat(s.replace(/[^0-9.-]/g, ""));
            return isNaN(n) ? null : n;
          };
          result.stats = {
            visits: parseNum(ms.visits?.total),
            orders: parseNum(ms.orders?.total),
            revenue: parseNum(ms.revenue?.total),
            conversionRate: parseNum(ms.conversion_rate?.total),
            dateRange: (statsData.selected_date_range as Record<string, unknown>)?.display_name as string || null,
            startDate: statsData.start_date as string || null,
            endDate: statsData.end_date as string || null,
          };
        }
        // Extract ads + customer insights from same stats page
        result.ads = {
          offsiteAdsStatus: (statsData.offsite_ads_status as string) ?? null,
          offsiteFeeRate: (statsData.offsite_fee_rate as number) ?? null,
          shareAndSaveStats: (statsData.share_and_save_stats_summary as Record<string, unknown>) ?? null,
        };
        const ci = statsData.customer_insights_stats as Record<string, unknown> | undefined;
        if (ci && statsData.is_customer_insights_enabled) {
          result.customerInsights = ci;
        }
      }
    } catch { /* ignore stats errors */ }

    // 2. Star seller page
    try {
      const starData = await extractSSR(`${this.baseUrl}/your/shops/me/star-seller`);
      if (starData) {
        result.rawStarSeller = starData;
        result.starSeller = {
          isStarSeller: (starData.isStarSeller as boolean) ?? false,
          responseRate: null, shippingOnTime: null, reviewScore: null,
          caseRate: null,
        };

        const current = starData.currentReviewPeriodData as Record<string, unknown> | undefined;
        if (current) {
          // Response rate
          const convo = current.convoResponseRate as Record<string, unknown> | undefined;
          result.starSeller.responseRate = (convo?.rawScoreValue as number) ?? null;

          // Shipping on-time
          const ship = current.shippingPerformance as Record<string, unknown> | undefined;
          result.starSeller.shippingOnTime = (ship?.rawScoreValue as number) ?? null;

          // Five-star review rating
          const reviews = current.fiveStarReviewRating as Record<string, unknown> | undefined;
          result.starSeller.reviewScore = (reviews?.rawScoreValue as number) ?? null;

          // Case rate
          const cases = current.ssqCaseRate as Record<string, unknown> | undefined;
          result.starSeller.caseRate = (cases?.caseRate as number) ?? null;
        }
      }
    } catch { /* ignore star seller errors */ }

    return result;
  }

  /**
   * Scrape listing quality data from the Etsy promotions/sales-and-discounts page.
   * Returns quality issues that can help sellers improve their listings.
   */
  public async getListingQuality(): Promise<EtsyListingQuality> {
    const result: EtsyListingQuality = { totalOpportunities: 0, listingsWithIssues: 0, issues: [] };
    try {
      const probeResult = await this.probePageData("/your/shops/me/tools/sales-and-discounts");
      const data = probeResult.data as Record<string, unknown> | undefined;
      if (!data) return result;

      const lmd = data.listingManagerData as Record<string, unknown> | undefined;
      const summary = lmd?.shop_summary as Record<string, unknown> | undefined;
      if (!summary) return result;

      result.totalOpportunities = (summary.total_quality_opportunities as number) ?? 0;
      result.listingsWithIssues = (summary.number_of_listings_with_quality_opportunities as number) ?? 0;

      const rawIssues = summary.listing_quality_issues as Array<Record<string, unknown>> | undefined;
      if (rawIssues) {
        result.issues = rawIssues.map((issue) => ({
          component: (issue.component_name as string) ?? "unknown",
          listingCount: (issue.listing_count as number) ?? 0,
          listingIds: (issue.listing_ids as number[]) ?? [],
          ranking: (issue.ranking as number) ?? 0,
        }));
      }
    } catch { /* ignore quality errors */ }
    return result;
  }

  /**
   * Generic SSR data probe — extract embedded JSON from any Etsy page.
   * Useful for discovering data structure of payments, promotions, listing stats pages.
   */
  public async probePageData(path: string): Promise<Record<string, unknown>> {
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    chrome.storage.local.set({ _keepAlive: Date.now() });
    const resp = await fetch(url, { credentials: "include", headers: { Accept: "text/html" } });
    if (!resp.ok) return { error: `HTTP ${resp.status}`, url };
    const html = await resp.text();
    const scripts = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
    const dataScript = scripts.find((s) => s.includes("initial_data"));
    if (!dataScript) return { error: "no initial_data script found", url, scriptCount: scripts.length };
    const inner = dataScript.replace(/<\/?script[^>]*>/gi, "").trim();
    const jsonMatch = inner.match(/=\s*(\{[\s\S]+\})\s*;?\s*$/);
    if (!jsonMatch?.[1]) return { error: "no JSON match in script", url };
    try {
      const parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
      const data = parsed.data as Record<string, unknown> | undefined;
      const initialData = data?.initial_data as Record<string, unknown> | undefined;
      const target = initialData || parsed;
      return { keys: Object.keys(target), data: target, url };
    } catch (e) { return { error: `JSON parse failed: ${String(e)}`, url }; }
  }

  // ─── Per-listing stats ──────────────────────────────────────────────

  /**
   * Fetch visit stats for a single Etsy listing.
   * Uses the SSR-embedded JSON at /your/shops/me/stats/listings/{id}.
   */
  public async getListingStats(listingId: string): Promise<{
    listingId: string;
    visits: number;
    title: string | null;
    imageUrl: string | null;
  }> {
    const probeResult = await this.probePageData(
      `/your/shops/me/stats/listings/${listingId}`,
    );

    const result = { listingId, visits: 0, title: null as string | null, imageUrl: null as string | null };

    const data = probeResult.data as Record<string, unknown> | undefined;
    if (!data) return result;

    try {
      const payload = data.stats_listing_payload as Record<string, unknown> | undefined;
      const pages = payload?.pages as Array<Record<string, unknown>> | undefined;
      const firstPage = pages?.[0];
      const list = firstPage?.list as Array<Record<string, unknown>> | undefined;
      const firstItem = list?.[0];
      const stackedGraphs = firstItem?.stacked_graphs_view as Array<Record<string, unknown>> | undefined;
      const firstGraph = stackedGraphs?.[0];
      const inventoryDetail = firstGraph?.inventory_detail as Record<string, unknown> | undefined;

      if (inventoryDetail) {
        result.visits = (inventoryDetail.total as number) ?? 0;

        // Extract listing metadata from the daily entries
        const datasets = inventoryDetail.datasets as Array<Record<string, unknown>> | undefined;
        const entries = datasets?.[0]?.entries as Array<Record<string, unknown>> | undefined;
        const firstEntry = entries?.[0];
        const listing = firstEntry?.listing as Record<string, unknown> | undefined;
        if (listing) {
          result.title = (listing.title as string) ?? null;
          result.imageUrl = (listing.image as string) ?? null;
        }
      }
    } catch {
      // Graceful fallback — return zeros if SSR structure changed
    }

    return result;
  }

  /**
   * Fetch visit stats for multiple listings sequentially.
   * Includes MV3 keepalive pings and rate-limiting (~200ms between requests).
   */
  public async getListingStatsBatch(listingIds: string[]): Promise<Array<{
    listingId: string;
    visits: number;
    title: string | null;
    imageUrl: string | null;
  }>> {
    const results: Array<{ listingId: string; visits: number; title: string | null; imageUrl: string | null }> = [];

    for (let i = 0; i < listingIds.length; i++) {
      const id = listingIds[i];
      chrome.storage.local.set({ _keepAlive: Date.now() });
      try {
        const stat = await this.getListingStats(id);
        results.push(stat);
      } catch {
        results.push({ listingId: id, visits: 0, title: null, imageUrl: null });
      }
      // Rate limit: ~5/sec max
      if (i < listingIds.length - 1) {
        await wait(200);
      }
    }

    return results;
  }

  public async getListing(id: string): Promise<Product | null> {
    const shopId = await this.getShopId();

    const resp = await fetch(
      `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${id}`,
      {
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );

    if (!resp.ok) return null;

    const l = (await resp.json()) as EtsyListingDetail;
    if (!l?.listing_id) return null;

    const imageUrls: string[] =
      Array.isArray(l.images) && l.images.length > 0
        ? l.images
        : (l.listing_images ?? []).map((img) => img.url);

    const price = l.price_int ? l.price_int / 100 : parseFloat(l.price ?? "0");
    const tags = Array.isArray(l.tags) ? l.tags.join(", ") : "";
    const materials = Array.isArray(l.materials) ? l.materials : [];

    return {
      id,
      marketPlaceId: id,
      marketplaceId: id,
      marketplaceUrl: l.url ?? this.getProductUrl(id),
      title: l.title ?? "",
      description: l.description ?? "",
      price,
      condition: Condition.Good,
      category: l.taxonomy_name ? [l.taxonomy_name] : [],
      tags,
      images: imageUrls.slice(1),
      cover: imageUrls[0],
      coverSmall: imageUrls[0],
      quantity: l.quantity ?? 1,
      whenMade: l.when_made ?? undefined,
      dynamicProperties: {
        ...(l.taxonomy_name ? { taxonomy: l.taxonomy_name } : {}),
        ...(materials.length ? { materials: materials.join(", ") } : {}),
      },
      shipping: {},
      acceptOffers: false,
      smartPricing: false,
      smartPricingPrice: undefined,
    };
  }

  // ─── Internal API methods ──────────────────────────────────────────

  /**
   * Extract CSRF nonce from any Etsy page HTML.
   * Required as `x-csrf-token` header for all v3 AJAX API calls.
   */
  private async getCsrfNonce(): Promise<string> {
    // Strategy 1: Execute script in an existing Etsy tab to get the live nonce
    try {
      const tabs = await chrome.tabs.query({ url: "https://www.etsy.com/*" });
      if (tabs.length > 0 && tabs[0].id) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          func: () => (window as any).Etsy?.csrf_nonce,
        });
        const nonce = results?.[0]?.result;
        if (typeof nonce === "string" && nonce.length > 10) {
          return nonce;
        }
      }
    } catch { /* tab script failed, fall through */ }

    // Strategy 2: Open a lightweight Etsy page in background, extract nonce, close
    try {
      const tab = await chrome.tabs.create({ url: `${this.baseUrl}/your/shops/me/tools/listings`, active: false });
      // Wait for page to load
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
          if (tabId === tab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        // Timeout after 15s
        setTimeout(() => { chrome.tabs.onUpdated.removeListener(listener); resolve(); }, 15000);
      });
      if (tab.id) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          func: () => (window as any).Etsy?.csrf_nonce,
        });
        const nonce = results?.[0]?.result;
        chrome.tabs.remove(tab.id).catch(() => {});
        if (typeof nonce === "string" && nonce.length > 10) {
          return nonce;
        }
      }
    } catch { /* tab creation failed, fall through */ }

    // Strategy 3: Fallback to HTML regex extraction from service worker fetch
    const html = await fetch(ETSY_LISTINGS_MANAGER_URL, {
      credentials: "include",
    }).then((r) => r.text());

    const patterns = [
      /name="csrf_nonce"\s+content="([^"]+)"/,
      /name="csrf_nonce"[^>]*(?:content|value)="([^"]+)"/,
      /"csrf_nonce"\s*:\s*"([^"]+)"/,
      /csrf_nonce.*?"([^"]+)"/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1] && match[1].length > 10) return match[1];
    }

    throw new Error("Could not extract Etsy CSRF nonce from any source");
  }

  // ─── Shop config (cached, from listing-editor SSR) ──────────────

  /**
   * Fetch shop config from listing-editor SSR data (frequent categories,
   * shipping profiles, return policies). Cached in chrome.storage.local
   * with a 24h TTL.
   */
  public async getShopConfig(forceRefresh = false): Promise<EtsyShopConfig> {
    if (!forceRefresh) {
      try {
        const stored = await chrome.storage.local.get(SHOP_CONFIG_CACHE_KEY);
        const cached = stored[SHOP_CONFIG_CACHE_KEY] as EtsyShopConfig | undefined;
        if (cached && Date.now() - cached.fetchedAt < SHOP_CONFIG_TTL_MS) {
          return cached;
        }
      } catch { /* cache miss */ }
    }

    await remoteLog("info", "etsy.shop-config", "Fetching shop config from listing-editor SSR");
    const probeResult = await this.probePageData("/your/shops/me/listing-editor");
    const data = probeResult.data as Record<string, unknown> | undefined;

    const config: EtsyShopConfig = {
      frequentCategories: [],
      shippingProfiles: [],
      returnPolicies: [],
      fetchedAt: Date.now(),
    };

    if (!data) {
      await remoteLog("warn", "etsy.shop-config", "No SSR data found in listing-editor page");
      return config;
    }

    try {
      const listingEditor = (data.listingEditor ?? data.listing_editor) as Record<string, unknown> | undefined;
      const listing = listingEditor?.listing as Record<string, unknown> | undefined;
      const formMetadata = (listing?.formMetadata ?? listing?.form_metadata
        ?? listingEditor?.formMetadata) as Record<string, unknown> | undefined;

      // Frequent categories
      const rawCats = (formMetadata?.frequentCategories
        ?? formMetadata?.frequent_categories) as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(rawCats)) {
        config.frequentCategories = rawCats
          .filter((c) => typeof c.id === "number" && Array.isArray(c.fullPathNames ?? c.full_path_names))
          .map((c) => ({
            id: c.id as number,
            fullPathNames: ((c.fullPathNames ?? c.full_path_names) as string[]),
            attributeIds: (c.attributeIds ?? c.attribute_ids) as number[] | undefined,
          }));
      }

      // Shipping profiles
      const rawShipping = (listingEditor?.shippingProfileSummary
        ?? listingEditor?.shipping_profile_summary
        ?? data.shippingProfileSummary
        ?? data.shipping_profile_summary) as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(rawShipping)) {
        config.shippingProfiles = rawShipping
          .filter((p) => typeof (p.shipping_profile_id ?? p.shippingProfileId) === "number")
          .map((p) => ({
            shipping_profile_id: (p.shipping_profile_id ?? p.shippingProfileId) as number,
            title: (p.title ?? p.name ?? "") as string,
            is_default: (p.is_default ?? p.isDefault ?? false) as boolean,
          }));
      }

      // Return policies
      const rawReturns = (listingEditor?.returnPolicies
        ?? listingEditor?.return_policies
        ?? data.returnPolicies
        ?? data.return_policies) as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(rawReturns)) {
        config.returnPolicies = rawReturns
          .filter((r) => typeof (r.return_policy_id ?? r.returnPolicyId) === "number")
          .map((r) => ({
            return_policy_id: (r.return_policy_id ?? r.returnPolicyId) as number,
            accepts_returns: (r.accepts_returns ?? r.acceptsReturns ?? false) as boolean,
            accepts_exchanges: (r.accepts_exchanges ?? r.acceptsExchanges ?? false) as boolean,
          }));
      }

      await remoteLog("info", "etsy.shop-config", "Shop config fetched", {
        categories: config.frequentCategories.length,
        shippingProfiles: config.shippingProfiles.length,
        returnPolicies: config.returnPolicies.length,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await remoteLog("warn", "etsy.shop-config", `Error parsing shop config: ${errMsg}`);
    }

    try {
      await chrome.storage.local.set({ [SHOP_CONFIG_CACHE_KEY]: config });
    } catch { /* non-fatal */ }

    return config;
  }

  /**
   * Match a Wrenlist category to the best taxonomy_id from the shop's
   * frequent categories. Falls back to undefined if no match.
   */
  private matchTaxonomyFromFrequentCategories(
    wrenlistCategory: string,
    frequentCategories: EtsyFrequentCategory[],
  ): number | undefined {
    if (frequentCategories.length === 0) return undefined;

    const catParts = wrenlistCategory.toLowerCase().replace(/_/g, " ").split(" ").filter(Boolean);
    let bestMatch: EtsyFrequentCategory | undefined;
    let bestScore = 0;

    for (const fc of frequentCategories) {
      const pathWords = fc.fullPathNames
        .join(" ")
        .toLowerCase()
        .split(/[\s&,/]+/)
        .filter(Boolean);

      let score = 0;
      for (const part of catParts) {
        if (pathWords.some((w) => w.includes(part) || part.includes(w))) {
          score++;
        }
      }

      const fullPath = fc.fullPathNames.join(" ").toLowerCase();
      if (catParts.length > 0 && fullPath.includes(catParts.join(" "))) {
        score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = fc;
      }
    }

    if (bestScore >= 1 && bestMatch) {
      return bestMatch.id;
    }
    return undefined;
  }

  /**
   * Upload a single image via Etsy's internal v3 AJAX API.
   * Returns the image_id from the response.
   */
  private async uploadImageViaApi(
    shopId: string,
    csrfNonce: string,
    imageUrl: string,
  ): Promise<number> {
    // MV3 keepalive
    chrome.storage.local.set({ _keepAlive: Date.now() });

    // Fetch the image (no CORS in service worker)
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      throw new Error(`Image fetch failed (${imgResp.status}): ${imageUrl}`);
    }
    const blob = await imgResp.blob();
    const mimeType = blob.type || "image/jpeg";
    const ext = mimeType.split("/")[1] || "jpg";

    const formData = new FormData();
    formData.append("image", new File([blob], `photo.${ext}`, { type: mimeType }));

    const resp = await fetch(
      `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/images`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "x-csrf-token": csrfNonce,
        },
        body: formData,
      },
    );

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`Image upload API returned ${resp.status}: ${text.substring(0, 200)}`);
    }

    const data = (await resp.json()) as { image_id?: number };
    if (!data.image_id) {
      throw new Error("Image upload succeeded but no image_id in response");
    }

    return data.image_id;
  }

  /**
   * Publish a product to Etsy via the internal v3 AJAX API.
   * Much faster and more reliable than form-fill — no tab needed.
   *
   * Flow: get CSRF → upload images → create draft listing → PATCH with
   * description/tags/images/shipping → optionally set state=active.
   */
  public async publishProductViaApi(
    product: Product,
    options?: { publishMode?: "draft" | "publish" },
  ): Promise<ListingActionResult> {
    const keepAlive = setInterval(() => {
      void chrome.storage.local.set({ _keepAlive: Date.now() });
    }, 5000);

    // Track the API-created listing so we can clean it up on fall-through.
    // Etsy's internal AJAX activate endpoint silent-no-ops (needs the £0.20
    // fee dialog click that only the form-fill path handles), so we end up
    // creating a draft via API, throwing, falling back to form-fill, and
    // form-fill creates a SECOND listing it activates. Without the cleanup
    // below, the API-created draft accumulates as junk in the seller's shop.
    let orphanListingId: string | null = null;

    try {
      const isLoggedIn = await this.checkLogin();
      if (!isLoggedIn) {
        clearInterval(keepAlive);
        return {
          success: false,
          message: "Not logged into Etsy. Please log in first.",
          needsLogin: true,
        };
      }

      if (!product.price || product.price <= 0) {
        clearInterval(keepAlive);
        return { success: false, message: "Price must be greater than \u00A30" };
      }

      const mode = options?.publishMode ?? "draft";
      await remoteLog("info", "etsy.api-publish", `Starting Etsy API ${mode} flow`, {
        productTitle: product.title?.substring(0, 60),
      });

      // 1. Get shop ID and CSRF nonce
      const shopId = await this.getShopId();
      const csrfNonce = await this.getCsrfNonce();
      await remoteLog("info", "etsy.api-publish", `Got shopId=${shopId}, CSRF obtained`);

      // 2. Upload images
      const imageIds: number[] = [];
      const coverImg = typeof product["cover"] === "string" ? product["cover"] : undefined;
      const allImageUrls: string[] = [];
      if (coverImg) allImageUrls.push(coverImg);
      if (product.images) {
        for (const img of product.images) {
          if (!allImageUrls.includes(img)) allImageUrls.push(img);
        }
      }

      for (const url of allImageUrls.slice(0, 10)) {
        try {
          const imageId = await this.uploadImageViaApi(shopId, csrfNonce, url);
          imageIds.push(imageId);
          await remoteLog("info", "etsy.api-publish", `Uploaded image ${imageIds.length}/${allImageUrls.length}`, { imageId });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`[Etsy API] Image upload failed: ${msg}`);
          await remoteLog("warn", "etsy.api-publish", `Image upload failed: ${msg}`);
        }
      }

      // 3. Fetch shop config (cached 24h) for taxonomy, shipping, returns
      let shopConfig: EtsyShopConfig | undefined;
      try {
        shopConfig = await this.getShopConfig();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await remoteLog("warn", "etsy.api-publish", `Failed to get shop config: ${msg}`);
      }

      // 3a. Resolve category
      const rawCategory = product.category?.[0]?.toLowerCase() || "";

      // Determine when_made
      const categoryRoot = rawCategory.split("_")[0];
      const VINTAGE_CATEGORIES = new Set([
        "antiques", "art", "collectibles", "clothing", "electronics",
        "home", "books", "sports", "toys", "musical", "vehicles",
        "ceramics", "glassware", "jewellery", "furniture", "homeware",
        "music", "medals", "teapots", "jugs",
      ]);
      const isLikelyVintage =
        product.dynamicProperties?.is_vintage === "true" ||
        VINTAGE_CATEGORIES.has(categoryRoot);
      const whenMade =
        product.whenMade || product.dynamicProperties?.when_made ||
        (isLikelyVintage ? ETSY_WHEN_MADE_VINTAGE : ETSY_WHEN_MADE_RECENT);

      // who_made: vintage items are typically "someone_else", handmade = "i_did"
      const whoMade = (product.dynamicProperties?.whoMade as string) ||
        (isLikelyVintage ? "someone_else" : "i_did");

      // 3b. Resolve taxonomy_id: explicit > frequent categories match > fallback 69
      let taxonomyId = 69; // fallback: Home & Living
      if (product.dynamicProperties?.etsyTaxonomyId) {
        taxonomyId = Number(product.dynamicProperties.etsyTaxonomyId);
      } else if (rawCategory && shopConfig?.frequentCategories.length) {
        const matched = this.matchTaxonomyFromFrequentCategories(
          rawCategory,
          shopConfig.frequentCategories,
        );
        if (matched) {
          taxonomyId = matched;
          await remoteLog("info", "etsy.api-publish",
            `Matched taxonomy_id=${matched} from frequent categories for "${rawCategory}"`);
        }
      }

      // 4. Create draft listing via API.
      //
      // Etsy's `POST /shop/{shopId}/listings` rejects with
      // 400 `[{path:/inventory, type:missing_inventory, message:"Inventory
      // is required when creating a listing."}]` if `inventory` is omitted
      // from the request body. The previous fix sent inventory as a
      // follow-up PUT after create — but the create POST itself fails
      // before the PUT can run, so inventory must be inline in the create
      // body. Shape mirrors what `getListingInventory` reads back.
      // Etsy's internal AJAX create-listing endpoint validates that `inventory`
      // is present (omitting it returns `400 missing_inventory`), but it
      // refuses any populated shape we can come up with — every key in an
      // object or every index in an array is reported as "invalid". The only
      // values that pass validation are `[]` (empty array) and `{}` (empty
      // object). Etsy's seller-tools React form posts an empty inventory at
      // create time and PUTs the real inventory immediately after via the
      // `/listings/{id}/inventory` endpoint. We do the same: empty `[]` here
      // to satisfy the create check, then `setListingInventoryAfterCreate`
      // PUTs the real shape with sku/price/quantity. Verified by direct
      // reconnaissance against the live endpoint 2026-04-26.
      const inventoryBodyAfterCreate = this.buildInventoryBody({
        sku: product.sku ?? null,
        price: product.price,
        quantity: product.quantity ?? 1,
      });

      const createBody: Record<string, unknown> = {
        title: product.title?.slice(0, 140) || "",
        price: product.price,
        quantity: product.quantity ?? 1,
        who_made: whoMade,
        when_made: whenMade,
        is_supply: false,
        taxonomy_id: taxonomyId,
        inventory: [],
      };

      await remoteLog("info", "etsy.api-publish", "Creating draft listing (empty inventory, will PUT real shape after)", {
        title: createBody.title,
        price: createBody.price,
        taxonomy_id: taxonomyId,
      });

      const createResp = await fetch(
        `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfNonce,
          },
          body: JSON.stringify(createBody),
        },
      );

      if (!createResp.ok) {
        const errText = await createResp.text().catch(() => "");
        clearInterval(keepAlive);
        throw new Error(`Etsy create listing API returned ${createResp.status}: ${errText.substring(0, 300)}`);
      }

      const createData = (await createResp.json()) as {
        listing_id?: number;
        state?: number;
      };

      if (!createData.listing_id) {
        clearInterval(keepAlive);
        throw new Error("Etsy create listing succeeded but no listing_id in response");
      }

      const listingId = String(createData.listing_id);
      orphanListingId = listingId; // mark for cleanup if anything below throws
      await remoteLog("info", "etsy.api-publish", `Draft created: listing_id=${listingId}`);

      // 4b. Set inventory via PATCH on the listing root with {price, quantity,
      // sku}. Etsy's internal AJAX endpoint fans these root fields into the
      // inventory record automatically — no separate /inventory PUT endpoint
      // exists for write (only GET). Direct probe against the live endpoint
      // 2026-04-26 confirmed: PATCH /listings/{id} with {price:499, quantity:
      // 1, sku:"X"} returns 200 and the subsequent GET /listings/{id}/
      // inventory shows price=£499 + sku="X" + quantity=1. We then verify by
      // re-reading to guard against silent-200 patterns Etsy has elsewhere.
      try {
        const inventoryPatchResp = await fetch(
          `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${listingId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfNonce,
            },
            body: JSON.stringify({
              price: product.price,
              quantity: Math.max(1, Math.floor(product.quantity ?? 1)),
              ...(product.sku ? { sku: product.sku } : {}),
            }),
          },
        );
        if (!inventoryPatchResp.ok) {
          const patchErr = await inventoryPatchResp.text().catch(() => "");
          throw new Error(
            `PATCH inventory returned ${inventoryPatchResp.status}: ${patchErr.substring(0, 200)}`,
          );
        }

        const confirmed = await this.getListingInventory(listingId);
        const expectedPrice = product.price;
        const expectedQty = Math.max(1, Math.floor(product.quantity ?? 1));
        const priceMatches =
          confirmed.price !== null &&
          Math.abs(confirmed.price - expectedPrice) < 0.01;
        const qtyMatches = confirmed.quantity === expectedQty;
        if (!priceMatches || !qtyMatches) {
          await remoteLog(
            "warn",
            "etsy.api-publish-inventory",
            "Inventory PATCH returned 200 but verifier mismatch",
            {
              listingId,
              expectedPrice,
              observedPrice: confirmed.price,
              expectedQuantity: expectedQty,
              observedQuantity: confirmed.quantity,
            },
          );
          throw new Error(
            `Inventory verifier mismatch: expected price=${expectedPrice} qty=${expectedQty}, got price=${confirmed.price} qty=${confirmed.quantity}`,
          );
        }
        await remoteLog("info", "etsy.api-publish-inventory", "Inventory PATCH + verified", {
          listingId,
          price: confirmed.price,
          quantity: confirmed.quantity,
        });
      } catch (invErr) {
        const invMsg = invErr instanceof Error ? invErr.message : String(invErr);
        await remoteLog("error", "etsy.api-publish-inventory", `Inventory write failed: ${invMsg}`, {
          listingId,
        });
        // Throw so the outer publishProduct catches and falls back to form-fill.
        throw new Error(`Inventory verify failed for listing ${listingId}: ${invMsg}`);
      }

      // 5. PATCH with description, tags, materials, images, SKU, shipping
      const patchBody: Record<string, unknown> = {};

      if (product.description) {
        patchBody.description = product.description.slice(0, 10000);
      }

      // Tags — Etsy only allows alphanumeric, spaces, and hyphens
      const sanitizeTag = (t: string) => t.replace(/[^a-zA-Z0-9\s\-]/g, "").trim();
      const tagList = product.tags
        ? product.tags.split(",").map((t) => sanitizeTag(t)).filter(Boolean).slice(0, 13).map((t) => t.slice(0, 20))
        : [];
      if (tagList.length > 0) {
        patchBody.tags = tagList;
      }

      // Materials
      const materials = product.dynamicProperties?.materials;
      if (materials) {
        const matList = typeof materials === "string"
          ? materials.split(",").map((m: string) => m.trim()).filter(Boolean)
          : Array.isArray(materials) ? materials : [];
        if (matList.length > 0) {
          patchBody.materials = matList;
        }
      }

      // Image IDs
      if (imageIds.length > 0) {
        patchBody.image_ids = imageIds;
      }

      // SKU
      if (product.sku) {
        patchBody.sku = product.sku;
      }

      // Shipping profile — explicit > shop config default > first available
      const shippingProfileId = product.dynamicProperties?.etsyShippingProfileId;
      if (shippingProfileId) {
        patchBody.shipping_profile_id = Number(shippingProfileId);
      } else if (shopConfig?.shippingProfiles.length) {
        const defaultProfile = shopConfig.shippingProfiles.find((p) => p.is_default)
          ?? shopConfig.shippingProfiles[0];
        patchBody.shipping_profile_id = defaultProfile.shipping_profile_id;
        await remoteLog("info", "etsy.api-publish",
          `Auto-selected shipping profile: ${defaultProfile.title} (${defaultProfile.shipping_profile_id})`);
      }

      // Return policy — explicit > first available from shop config
      const returnPolicyId = product.dynamicProperties?.etsyReturnPolicyId;
      if (returnPolicyId) {
        patchBody.return_policy_id = Number(returnPolicyId);
      } else if (shopConfig?.returnPolicies.length) {
        patchBody.return_policy_id = shopConfig.returnPolicies[0].return_policy_id;
        await remoteLog("info", "etsy.api-publish",
          `Auto-selected return policy: ${shopConfig.returnPolicies[0].return_policy_id}`);
      }

      if (Object.keys(patchBody).length > 0) {
        await remoteLog("info", "etsy.api-publish", "Patching listing with details", {
          fields: Object.keys(patchBody),
        });

        const patchResp = await fetch(
          `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${listingId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfNonce,
            },
            body: JSON.stringify(patchBody),
          },
        );

        if (!patchResp.ok) {
          const errText = await patchResp.text().catch(() => "");
          await remoteLog("warn", "etsy.api-publish", `PATCH failed (non-fatal): ${patchResp.status}`, {
            error: errText.substring(0, 200),
          });
          // Non-fatal: listing was created, just missing some fields
        }
      }

      // 6. If publishMode is "publish", activate the listing.
      //
      // CRITICAL: Etsy's PATCH /listings/{id} with {state:"active"} returns 200
      // OK but silently does NOT change the listing state — activation requires
      // confirming the £0.20 listing fee via Etsy's UI dialog (which the
      // form-fill path handles by clicking through the alertdialog). The API
      // PATCH appears to succeed but the listing stays in state=3 (draft).
      //
      // To preserve the speedup when (one day) Etsy adds an API path AND give
      // us correct fallback behaviour today, we re-read the listing state
      // after the PATCH and throw if it didn't transition to active. The
      // outer publishProduct catches and falls through to form-fill which
      // DOES handle the fee confirmation correctly.
      if (mode === "publish") {
        await remoteLog("info", "etsy.api-publish", "Activating listing (state=active)");

        const activateResp = await fetch(
          `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${listingId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfNonce,
            },
            body: JSON.stringify({ state: "active" }),
          },
        );

        if (!activateResp.ok) {
          const errText = await activateResp.text().catch(() => "");
          await remoteLog("warn", "etsy.api-publish", `Activate PATCH non-2xx: ${activateResp.status}`, {
            error: errText.substring(0, 200),
          });
          clearInterval(keepAlive);
          throw new Error(
            `Etsy activate PATCH returned ${activateResp.status}: ${errText.substring(0, 200)}`,
          );
        }

        // Verify the activation actually took. State 0 = active, 3 = draft.
        try {
          const verifyResp = await fetch(
            `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${listingId}`,
            { credentials: "include", headers: { Accept: "application/json" } },
          );
          const verifyData = (await verifyResp.json()) as { state?: number; is_available?: boolean };
          const observedState = verifyData?.state;
          const isAvailable = verifyData?.is_available;
          if (observedState !== 0 && isAvailable !== true) {
            await remoteLog(
              "warn",
              "etsy.api-publish",
              "Activate PATCH returned 200 but listing still draft (silent-200, fee dialog needed)",
              { listingId, observedState, isAvailable },
            );
            clearInterval(keepAlive);
            throw new Error(
              `Etsy activate silently failed: PATCH returned 200 but listing state=${observedState} (expected 0=active). Falling back to form-fill which handles the £0.20 fee confirmation dialog.`,
            );
          }
          await remoteLog("info", "etsy.api-publish", "Activation verified: state=active", {
            listingId,
            observedState,
            isAvailable,
          });
          orphanListingId = null; // success — don't clean up
        } catch (verifyErr) {
          // Re-throw — the outer catch handles fall-back to form-fill AND the
          // orphan-draft cleanup we wired up at the top of this method.
          throw verifyErr;
        }

      }

      // Made it through everything (including activate) without throwing.
      // Mark as not-orphan so the catch handler doesn't delete it.
      orphanListingId = null;

      clearInterval(keepAlive);

      const modeLabel = mode === "publish" ? "published" : "saved as draft";
      const listingUrl = mode === "publish"
        ? this.getProductUrl(listingId)
        : `${ETSY_EDIT_LISTING_URL}/edit/${listingId}`;

      await remoteLog("info", "etsy.api-publish", `Completed: ${modeLabel}`, { listingId });

      return {
        success: true,
        publishMode: mode,
        message: `Listing ${modeLabel} on Etsy via API.`,
        product: { id: listingId, url: listingUrl },
      };
    } catch (error) {
      clearInterval(keepAlive);
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Etsy API] Publish error:", error);
      await remoteLog("error", "etsy.api-publish", `API publish failed: ${errMsg}`, {
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      });

      // Clean up the orphan API-created draft before falling through to
      // form-fill. Use HTTP DELETE on the listing — verified by direct probe
      // to return 204 No Content and the subsequent GET returns "Listing not
      // found" for both state=3 drafts and state=0 active listings. PATCH
      // state="inactive" was tried first but silent-no-ops on drafts (and
      // sometimes flips them ACTIVE — really bad) so DELETE it is.
      // If the cleanup fails for any reason it's non-fatal — we still
      // propagate the original error so form-fill takes over.
      if (orphanListingId) {
        try {
          const shopId = await this.getShopId();
          const csrfNonce = await this.getCsrfNonce();
          const cleanupResp = await fetch(
            `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${orphanListingId}`,
            {
              method: "DELETE",
              credentials: "include",
              headers: { "x-csrf-token": csrfNonce },
            },
          );
          await remoteLog(
            cleanupResp.ok ? "info" : "warn",
            "etsy.api-publish-cleanup",
            cleanupResp.ok
              ? `Cleaned up orphan API draft ${orphanListingId} before fallback (HTTP ${cleanupResp.status})`
              : `Orphan cleanup non-2xx: ${cleanupResp.status}`,
            { orphanListingId },
          );
        } catch (cleanupErr) {
          const cleanupMsg = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
          await remoteLog(
            "warn",
            "etsy.api-publish-cleanup",
            `Orphan cleanup threw (non-fatal): ${cleanupMsg}`,
            { orphanListingId },
          );
        }
      }

      throw error; // Re-throw so the caller (publishProduct) can catch and fall back
    }
  }

  // ─── Inventory & Auto-Renew ─────────────────────────────────────

  /**
   * Build the single-product inventory shape Etsy requires inline in the
   * `POST /shop/{shopId}/listings` create body. Without an `inventory`
   * field on create, Etsy returns 400 `missing_inventory` ("Inventory is
   * required when creating a listing").
   *
   * Shape mirrors what `getListingInventory` reads back: a single
   * `products[0]` with one `offerings[0]` carrying price + quantity +
   * is_enabled, no `property_values`. We send GBP @ divisor=100 because
   * Wrenlist is GBP-only today; if multi-currency lands we should pull
   * the shop currency from `getShopConfig` instead.
   *
   * `property_values: []` is required even with no variations; the form
   * path always sends it. `is_enabled: 1` is a 0/1 int, not a bool.
   *
   * Uncertainty: Etsy may want this nested differently in the create body
   * vs the standalone PUT — the standalone PUT shape is what we know works
   * (the form-fill path uses it). If create returns 400 with a path like
   * `/inventory/products` or similar, the shape is wrong and the log line
   * "Creating draft listing with inline inventory" will show what we sent.
   */
  private buildInventoryBody(inventory: {
    sku: string | null;
    price: number;
    quantity: number;
  }): Record<string, unknown> {
    const sku = inventory.sku ?? "";
    const quantity = Math.max(1, Math.floor(inventory.quantity));
    const priceAmount = Math.round(inventory.price * 100);

    return {
      products: [
        {
          sku,
          property_values: [],
          offerings: [
            {
              price: {
                amount: priceAmount,
                divisor: 100,
                currency_code: "GBP",
              },
              quantity,
              is_enabled: 1,
            },
          ],
        },
      ],
      price_on_property: [],
      quantity_on_property: [],
      sku_on_property: [],
    };
  }

  /** Fetch inventory data for a single listing via Etsy's internal inventory endpoint */
  public async getListingInventory(listingId: string): Promise<{
    sku: string | null;
    quantity: number;
    price: number | null;
    channels: string[];
    shouldAutoRenew: boolean;
  }> {
    const shopId = await this.getShopId();
    const resp = await fetch(
      `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${listingId}/inventory`,
      {
        credentials: "include",
        headers: { Accept: "application/json" },
      },
    );

    if (!resp.ok) {
      throw new Error(`Etsy inventory API returned ${resp.status}`);
    }

    const data = (await resp.json()) as Record<string, unknown>;
    // Etsy's internal AJAX returns one of two shapes depending on whether
    // the listing has variations:
    //  - Single-variant: { sku, channels: [{ price:{amount,divisor}, quantity, channel_id }] }
    //  - Multi-variant: { products: [{ offerings: [{ price, quantity }], sku }], ... }
    // Probe the channels shape first — that's what single-variant listings
    // (the common case for vintage resale) return. Fall back to the
    // products/offerings shape for variant listings.
    const channelsArr = Array.isArray(data.channels) ? data.channels : [];
    const firstChannel = (channelsArr[0] ?? null) as Record<string, unknown> | null;

    const products = Array.isArray(data.products) ? data.products : [];
    const firstProduct = (products[0] ?? {}) as Record<string, unknown>;
    const offerings = Array.isArray(firstProduct.offerings) ? firstProduct.offerings : [];
    const firstOffering = (offerings[0] ?? {}) as Record<string, unknown>;

    const priceSource =
      (firstChannel?.price as Record<string, unknown> | undefined) ??
      (firstOffering.price as Record<string, unknown> | undefined);
    const priceAmount = priceSource?.amount as number | undefined;
    const priceDivisor = (priceSource?.divisor as number) || 100;

    const quantity =
      (firstChannel?.quantity as number | undefined) ??
      (firstOffering.quantity as number | undefined) ??
      0;

    const sku =
      (data.sku as string | undefined) ??
      (firstProduct.sku as string | undefined) ??
      null;

    const channelLabels: string[] = [];
    if (data.channelRetail) channelLabels.push("retail");
    if (data.channelWholesale) channelLabels.push("wholesale");

    return {
      sku: sku || null,
      quantity,
      price: priceAmount != null ? priceAmount / priceDivisor : null,
      channels: channelLabels,
      shouldAutoRenew: data.should_auto_renew === true,
    };
  }

  /**
   * Fetch inventory for multiple listings. Returns an array with inventory data per listing.
   * Includes rate limiting (~5/sec) and MV3 keepalive.
   */
  public async syncInventory(listingIds: string[]): Promise<Array<{
    listingId: string;
    sku: string | null;
    quantity: number;
    price: number | null;
    channels: string[];
    shouldAutoRenew: boolean;
    error?: string;
  }>> {
    const results: Array<{
      listingId: string;
      sku: string | null;
      quantity: number;
      price: number | null;
      channels: string[];
      shouldAutoRenew: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < listingIds.length; i++) {
      const id = listingIds[i];
      chrome.storage.local.set({ _keepAlive: Date.now() });
      try {
        const inv = await this.getListingInventory(id);
        results.push({ listingId: id, ...inv });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        results.push({
          listingId: id,
          sku: null,
          quantity: 0,
          price: null,
          channels: [],
          shouldAutoRenew: false,
          error: msg,
        });
      }
      // Rate limit: ~5/sec max
      if (i < listingIds.length - 1) {
        await wait(200);
      }
    }

    return results;
  }

  /**
   * Set the auto-renew flag on a listing via Etsy's internal PATCH API.
   * When auto-renew is off, Etsy won't charge the 0.20 renewal fee when it expires.
   */
  public async setAutoRenew(
    listingId: string,
    autoRenew: boolean,
  ): Promise<{ success: boolean; message: string }> {
    const isLoggedIn = await this.checkLogin();
    if (!isLoggedIn) {
      return { success: false, message: "Not logged into Etsy. Please log in first." };
    }

    const shopId = await this.getShopId();
    const csrfNonce = await this.getCsrfNonce();

    const resp = await fetch(
      `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${listingId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfNonce,
        },
        body: JSON.stringify({ should_auto_renew: autoRenew }),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      throw new Error(`Etsy auto-renew PATCH returned ${resp.status}: ${errText.substring(0, 200)}`);
    }

    await remoteLog("info", "etsy.auto-renew", `Set auto_renew=${autoRenew} for listing ${listingId}`);
    return {
      success: true,
      message: `Auto-renew ${autoRenew ? "enabled" : "disabled"} for listing ${listingId}.`,
    };
  }

  /**
   * Deactivate a listing via Etsy's internal v3 AJAX API.
   * PATCHes the listing with state="inactive". No tab needed.
   *
   * IMPORTANT: Etsy's internal AJAX endpoint sometimes returns 200 with a body
   * that does NOT reflect the requested state change (e.g. when the CSRF nonce
   * is from a context Etsy doesn't trust for write ops, when the listing is in
   * a state Etsy refuses to transition, or when the endpoint silently no-ops).
   * We MUST verify the response body confirms `state === "inactive"` (Etsy
   * returns the canonical state string in the listing object) before declaring
   * success — otherwise the caller's form-fill fallback will never run and we
   * silently lie about delisting. See `isEtsyResponseInactive` below.
   */
  public async delistProductViaApi(
    marketplaceId: string,
  ): Promise<ListingActionResult> {
    try {
      const isLoggedIn = await this.checkLogin();
      if (!isLoggedIn) {
        return {
          success: false,
          message: "Not logged into Etsy. Please log in first.",
          needsLogin: true,
        };
      }

      await remoteLog("info", "etsy.api-delist", `Starting API delist for listing ${marketplaceId}`);

      const shopId = await this.getShopId();
      const csrfNonce = await this.getCsrfNonce();

      const resp = await fetch(
        `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${marketplaceId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfNonce,
          },
          body: JSON.stringify({ state: "inactive" }),
        },
      );

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        await remoteLog("warn", "etsy.api-delist", `PATCH non-2xx ${resp.status}`, {
          listingId: marketplaceId,
          status: resp.status,
          bodyPreview: errText.substring(0, 300),
        });
        throw new Error(`Etsy delist API returned ${resp.status}: ${errText.substring(0, 200)}`);
      }

      // Etsy returns 200 with the updated listing object on success — but it
      // also returns 200 with the unchanged listing (or an error envelope) when
      // the request is silently rejected. Read the body and verify state.
      const rawBody = await resp.text().catch(() => "");
      let parsed: unknown;
      try {
        parsed = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        parsed = null;
      }

      const inactive = isEtsyResponseInactive(parsed);

      if (!inactive.confirmed) {
        // Silent failure — body did not confirm state=inactive. Throw so
        // the caller falls back to the working form-fill path.
        await remoteLog("warn", "etsy.api-delist", `PATCH 200 but body did not confirm state=inactive`, {
          listingId: marketplaceId,
          reason: inactive.reason,
          observedState: inactive.observedState,
          bodyPreview: rawBody.substring(0, 300),
        });
        throw new Error(
          `Etsy delist API returned 200 but listing state is ${inactive.observedState ?? "unknown"} (expected inactive). Falling back to form.`,
        );
      }

      await remoteLog("info", "etsy.api-delist", `Listing ${marketplaceId} deactivated via API (verified state=${inactive.observedState ?? "inactive"})`);
      return { success: true, message: "Listing deactivated on Etsy via API." };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      await remoteLog("error", "etsy.api-delist", `API delist failed: ${errMsg}`);
      throw error; // Re-throw so caller can fall back
    }
  }

  // ─── Publish (unified entry points with API-first, form-fill fallback) ───

  /**
   * Publish a product to Etsy. Tries the internal API first (faster, no tab),
   * falls back to form-fill automation if the API fails.
   */
  public async publishProduct(
    product: Product,
    options?: { publishMode?: "draft" | "publish" },
  ): Promise<ListingActionResult> {
    // Try API method first
    try {
      const result = await this.publishProductViaApi(product, options);
      return result;
    } catch (apiError) {
      const apiMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.warn(`[Etsy] API publish failed, falling back to form-fill: ${apiMsg}`);
      await remoteLog("warn", "etsy.publish", `API failed, falling back to form-fill: ${apiMsg}`);
    }

    // Fallback to form-fill
    return this.publishProductViaForm(product, options);
  }

  /**
   * Deactivate a listing on Etsy. Tries the API first, falls back to
   * browser automation (seller tools bar click).
   */
  public async delistProduct(
    marketplaceId: string,
  ): Promise<ListingActionResult> {
    // Try API method first
    try {
      const result = await this.delistProductViaApi(marketplaceId);
      return result;
    } catch (apiError) {
      const apiMsg = apiError instanceof Error ? apiError.message : String(apiError);
      console.warn(`[Etsy] API delist failed, falling back to browser automation: ${apiMsg}`);
      await remoteLog("warn", "etsy.delist", `API failed, falling back to browser: ${apiMsg}`);
    }

    // Fallback to browser automation
    return this.delistProductViaForm(marketplaceId);
  }

  // ─── Publish via form-fill (fallback) ─────────────────────────────

  /**
   * Publish a product to Etsy via browser automation (form-fill).
   * Opens the listing editor, fills all fields, uploads images,
   * selects category, and clicks Publish.
   * This is the legacy method — used as fallback when API publish fails.
   */
  public async publishProductViaForm(
    product: Product,
    options?: { publishMode?: "draft" | "publish" },
  ): Promise<ListingActionResult> {
    // MV3 service worker keepalive: call chrome APIs every 5s to prevent
    // the 30-second inactivity timeout from killing the worker mid-publish.
    // Using multiple API calls and short interval for maximum reliability.
    const keepAlive = setInterval(() => {
      void chrome.storage.local.set({ _keepAlive: Date.now() });
    }, 5000);
    try {
      const isLoggedIn = await this.checkLogin();
      if (!isLoggedIn) {
        return {
          success: false,
          message: "Not logged into Etsy. Please log in first.",
          needsLogin: true,
        };
      }

      if (!product.price || product.price <= 0) {
        return { success: false, message: "Price must be greater than \u00A30" };
      }

      const mode = options?.publishMode ?? "draft";

      await remoteLog("info", "etsy.publish", `Starting Etsy ${mode} flow`, {
        productTitle: product.title?.substring(0, 60),
      });

      // Open tab active — Etsy's React form needs a visible tab to render properly.
      // Background tabs are throttled by Chrome and React components may not mount.
      // Tab is auto-closed after save completes.
      const tab = await chrome.tabs.create({
        url: ETSY_CREATE_LISTING_URL,
        active: true,
      });

      if (!tab.id) {
        return { success: false, message: "Failed to open Etsy listing page" };
      }

      const tabId = tab.id;

      try {
        // Wait for the React app to fully render
        await remoteLog("info", "etsy.publish", "Waiting for page ready");
        await this.waitForPageReady(tabId, "#listing-title-input", 15000);
        await remoteLog("info", "etsy.publish", "Page ready, building form data");

        const formData = this.buildFormData(product);

        // Step 1: Upload images first (they take time to process)
        if (formData.imageUrls.length > 0 || formData.coverUrl) {
          await this.uploadImages(tabId, formData.coverUrl, formData.imageUrls);
        }

        // Step 2: Fill all text fields, selects, and radios
        const result = await chrome.scripting.executeScript({
          target: { tabId },
          func: fillEtsyListingForm,
          args: [formData],
        });

        const execResult = result?.[0]?.result as {
          success: boolean;
          message?: string;
        };

        if (!execResult?.success) {
          await remoteLog("error", "etsy.publish", "Form fill failed", {
            error: execResult?.message,
          });
          // Close tab on failure
          await chrome.tabs.remove(tabId).catch(() => {});
          return {
            success: false,
            message: execResult?.message || "Failed to fill Etsy listing form",
          };
        }
        await remoteLog("info", "etsy.publish", "Form filled successfully");

        // Step 3: Select category via search typeahead
        if (formData.categorySearch) {
          await this.selectCategory(tabId, formData.categorySearch);
        }

        // Step 4: Select the first delivery profile
        await this.selectDeliveryProfile(tabId);

        // Step 4b: Set processing profile (required for publishing)
        await this.selectProcessingProfile(tabId);

        // Step 4c: Fill tags (separate step — React Add button needs its own script context)
        if (formData.tags) {
          await this.fillTags(tabId, formData.tags);
        }

        // Step 5: Click Save as draft or Publish depending on mode
        await remoteLog("info", "etsy.publish", `Clicking ${mode} button`);
        await wait(1000);
        const publishResult = await chrome.scripting.executeScript({
          target: { tabId },
          func: clickPublishButton,
          args: [mode],
        });
        const publishExec = publishResult?.[0]?.result as {
          success: boolean;
          message?: string;
          actualMode?: "draft" | "publish";
        };
        // Use the actual mode clicked (may differ from requested if button was unavailable)
        const actualMode = publishExec?.actualMode ?? mode;
        await remoteLog("info", "etsy.publish", `Button click result`, {
          success: publishExec?.success,
          message: publishExec?.message,
          requestedMode: mode,
          actualMode,
        });

        // If actually publishing, handle the $0.20 fee confirmation dialog.
        if (actualMode === "publish") {
          let confirmed = false;
          for (let attempt = 0; attempt < 4; attempt++) {
            await wait(2000);
            const confirmResult = await chrome.scripting.executeScript({
              target: { tabId },
              func: clickPublishConfirmation,
            });
            const confirmExec = confirmResult?.[0]?.result as {
              success: boolean;
              message?: string;
            };
            await remoteLog("info", "etsy.publish", `Confirmation attempt ${attempt + 1}`, {
              success: confirmExec?.success,
              message: confirmExec?.message,
            });
            if (confirmExec?.success && !confirmExec.message?.includes("No confirmation")) {
              confirmed = true;
              break;
            }
          }
          if (!confirmed) {
            await remoteLog("warn", "etsy.publish", "Fee confirmation dialog never appeared");
          }
        }

        // Step 6: Wait for save to complete.
        // After saving/publishing, Etsy redirects to the listings manager
        // (/your/shops/me/tools/listings) — the listing ID is NOT in the
        // redirect URL. We poll for the URL to change away from the create
        // page, then scrape the most recent draft listing ID from the page.
        let listingId: string | undefined;
        let listingUrl: string | undefined;

        // Poll for redirect (up to 15s)
        await remoteLog("info", "etsy.publish", "Waiting for redirect after save");
        const redirectStart = Date.now();
        while (Date.now() - redirectStart < 15000) {
          await wait(1000);
          try {
            const updatedTab = await chrome.tabs.get(tabId);
            const tabUrl = updatedTab?.url || "";
            await remoteLog("info", "etsy.publish", `Poll URL: ${tabUrl.substring(0, 100)}`);

            // Check for listing-editor/{id} or listing-editor/edit/{id} redirect
            const editorMatch = tabUrl.match(/listing-editor\/(?:edit\/)?(\d+)/);
            if (editorMatch?.[1]) {
              listingId = editorMatch[1];
              break;
            }

            // Check for /listing/{id} redirect
            const listingMatch = tabUrl.match(/\/listing\/(\d+)/);
            if (listingMatch?.[1]) {
              listingId = listingMatch[1];
              break;
            }

            // Redirected to listings manager — save succeeded.
            // Check for newly-listed-listing-id query param first (publish mode).
            if (tabUrl.includes("/tools/listings")) {
              const newlyListedMatch = tabUrl.match(/newly-listed-listing-id=(\d+)/);
              if (newlyListedMatch?.[1]) {
                listingId = newlyListedMatch[1];
                break;
              }
              try {
                // For published listings, scrape the active listings page (sorted by most recent).
                // For drafts, scrape the draft listings page.
                // Etsy's default sort for update_date is descending (most recent first),
                // so the first matching link in the DOM is the most recently created/updated listing.
                // This handles multiple drafts with the same title correctly.
                const scrapeState = actualMode === "publish" ? "active" : "draft";
                await chrome.tabs.update(tabId, {
                  url: `https://www.etsy.com/your/shops/me/tools/listings/state:${scrapeState},sort:update_date`,
                });

                // Poll for listing-editor links to appear (up to 10s)
                const scrapeStart = Date.now();
                while (Date.now() - scrapeStart < 20000) {
                  await wait(2000);
                  try {
                    const scrapeResult = await chrome.scripting.executeScript({
                      target: { tabId },
                      func: (title: string) => {
                        const links = Array.from(document.querySelectorAll("a"));
                        const titlePrefix = title.slice(0, 30);
                        // Pass 1: match by title
                        for (const link of links) {
                          const href = link.getAttribute("href") || "";
                          const idMatch = href.match(/listing-editor\/(?:edit\/)?(\d+)/);
                          if (idMatch?.[1] && link.textContent?.includes(titlePrefix)) {
                            return idMatch[1];
                          }
                        }
                        // Pass 2: match by listing/{id} link (active listings use public URLs)
                        for (const link of links) {
                          const href = link.getAttribute("href") || "";
                          const idMatch = href.match(/\/listing\/(\d+)/);
                          if (idMatch?.[1] && link.textContent?.includes(titlePrefix)) {
                            return idMatch[1];
                          }
                        }
                        // Pass 3: first listing-editor link (most recent by sort order)
                        for (const link of links) {
                          const href = link.getAttribute("href") || "";
                          const idMatch = href.match(/listing-editor\/(?:edit\/)?(\d+)/);
                          if (idMatch?.[1]) return idMatch[1];
                        }
                        // Pass 4: first /listing/{id} link (most recent active listing)
                        for (const link of links) {
                          const href = link.getAttribute("href") || "";
                          const idMatch = href.match(/\/listing\/(\d+)/);
                          if (idMatch?.[1]) return idMatch[1];
                        }
                        return null;
                      },
                      args: [product.title || ""],
                    });
                    const scrapedId = scrapeResult?.[0]?.result;
                    if (scrapedId) {
                      listingId = scrapedId;
                      break;
                    }
                  } catch {
                    // Page not ready yet — keep polling
                  }
                }
              } catch {
                // Navigation/scrape failed — listing was still saved
              }
              break;
            }
          } catch {
            // Tab may have been closed
            break;
          }
        }

        await chrome.tabs.remove(tabId).catch(() => {});

        if (listingId) {
          // Drafts aren't viewable at /listing/{id} — use the edit URL instead.
          // Published listings use the public URL.
          listingUrl = actualMode === "draft"
            ? `${ETSY_EDIT_LISTING_URL}/edit/${listingId}`
            : this.getProductUrl(listingId);
        }

        // Even without a listing ID, if we got past validation the save worked.
        // The redirect to /tools/listings confirms it.
        const modeLabel = actualMode === "publish" ? "published" : "saved as draft";
        clearInterval(keepAlive);
        await remoteLog("info", "etsy.publish", `Completed: ${modeLabel}`, {
          listingId,
          listingUrl,
        });
        return {
          success: true,
          publishMode: actualMode,
          message: listingId
            ? `Listing ${modeLabel} on Etsy.`
            : `Listing ${modeLabel} on Etsy (ID not captured — check Etsy dashboard).`,
          product: listingId
            ? { id: listingId, url: listingUrl || this.getProductUrl(listingId) }
            : undefined,
        };
      } catch (error) {
        // Clean up tab on error
        await chrome.tabs.remove(tabId).catch(() => {});
        throw error;
      }
    } catch (error) {
      // keepAlive may not exist if error happened before setInterval
      try { clearInterval(keepAlive); } catch { /* ignore */ }
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Etsy] Publish error:", error);
      await remoteLog("error", "etsy.publish", `Publish failed: ${errMsg}`, {
        stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
      });
      return {
        success: false,
        message: errMsg,
      };
    }
  }

  // ─── Update ────────────────────────────────────────────────────────

  /**
   * Update an existing Etsy listing via the edit form.
   */
  public async updateProduct(
    marketplaceId: string,
    product: Product,
  ): Promise<ListingActionResult> {
    try {
      const isLoggedIn = await this.checkLogin();
      if (!isLoggedIn) {
        return {
          success: false,
          message: "Not logged into Etsy. Please log in first.",
          needsLogin: true,
        };
      }

      const editUrl = `${ETSY_EDIT_LISTING_URL}/${marketplaceId}/edit`;
      const tab = await chrome.tabs.create({ url: editUrl, active: true });

      if (!tab.id) {
        return { success: false, message: "Failed to open Etsy edit page" };
      }

      const tabId = tab.id;

      try {
        await this.waitForPageReady(tabId, "#listing-title-input", 15000);

        const formData = this.buildFormData(product);

        const result = await chrome.scripting.executeScript({
          target: { tabId },
          func: fillEtsyListingForm,
          args: [formData],
        });

        const execResult = result?.[0]?.result as {
          success: boolean;
          message?: string;
        };

        if (!execResult?.success) {
          await chrome.tabs.remove(tabId).catch(() => {});
          return {
            success: false,
            message: execResult?.message || "Failed to fill Etsy edit form",
          };
        }

        // Click Save / Publish
        await wait(1000);
        await chrome.scripting.executeScript({
          target: { tabId },
          func: clickPublishButton,
        });

        // Handle confirmation dialog
        await wait(2000);
        await chrome.scripting.executeScript({
          target: { tabId },
          func: clickPublishConfirmation,
        });

        await wait(3000);
        await chrome.tabs.remove(tabId).catch(() => {});

        return {
          success: true,
          message: "Listing updated on Etsy.",
          product: {
            id: marketplaceId,
            url: this.getProductUrl(marketplaceId),
          },
        };
      } catch (error) {
        await chrome.tabs.remove(tabId).catch(() => {});
        throw error;
      }
    } catch (error) {
      console.error("[Etsy] Update error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ─── Delist via browser automation (fallback) ──────────────────────

  /**
   * Deactivate a listing via browser automation (seller tools bar).
   * This is the legacy method — used as fallback when API delist fails.
   */
  public async delistProductViaForm(
    marketplaceId: string,
  ): Promise<ListingActionResult> {
    // MV3 keepalive
    const keepAlive = setInterval(() => {
      void chrome.storage.local.set({ _keepAlive: Date.now() });
    }, 5000);
    try {
      const isLoggedIn = await this.checkLogin();
      if (!isLoggedIn) {
        clearInterval(keepAlive);
        return {
          success: false,
          message: "Not logged into Etsy. Please log in first.",
          needsLogin: true,
        };
      }

      await remoteLog("info", "etsy.delist", `Starting delist for listing ${marketplaceId}`);

      // Navigate to the listing's public page — when logged in as the seller,
      // Etsy shows "Seller listing tools" bar with a "Deactivate" link.
      const listingUrl = `${ETSY_BASE_URL}/listing/${marketplaceId}`;
      const tab = await chrome.tabs.create({ url: listingUrl, active: true });
      if (!tab.id) {
        clearInterval(keepAlive);
        return { success: false, message: "Failed to open Etsy listing page" };
      }
      const tabId = tab.id;

      try {
        // Wait for page to load (seller tools bar appears with listing content)
        await wait(5000);

        // Single script: click Deactivate link → wait for dialog → click confirm
        const result = await chrome.scripting.executeScript({
          target: { tabId },
          func: deactivateListingFromSellerTools,
        });
        const execResult = result?.[0]?.result as {
          success: boolean;
          message?: string;
        };

        await remoteLog("info", "etsy.delist", `Deactivate result`, {
          success: execResult?.success,
          message: execResult?.message,
        });

        // Wait for Etsy to process the deactivation
        await wait(3000);
        await chrome.tabs.remove(tabId).catch(() => {});
        clearInterval(keepAlive);

        if (execResult?.success) {
          await remoteLog("info", "etsy.delist", `Listing ${marketplaceId} deactivated`);
          return { success: true, message: "Listing deactivated on Etsy." };
        }

        return {
          success: false,
          message: execResult?.message || "Deactivation failed",
        };
      } catch (error) {
        await chrome.tabs.remove(tabId).catch(() => {});
        throw error;
      }
    } catch (error) {
      clearInterval(keepAlive);
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("[Etsy] Delist error:", error);
      await remoteLog("error", "etsy.delist", `Delist failed: ${errMsg}`);
      return { success: false, message: errMsg };
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private buildFormData(product: Product): EtsyFormFillData {
    const rawCategory = product.category?.[0]?.toLowerCase() || "";
    // Try exact match first (handles subcategories like "ceramics_plates"),
    // Try exact match, then progressively shorter prefixes (home_garden_furniture → home_garden → matched)
    let categorySearch = WRENLIST_TO_ETSY_CATEGORY[rawCategory] || "";
    if (!categorySearch) {
      const parts = rawCategory.split("_");
      for (let i = parts.length - 1; i >= 1; i--) {
        const prefix = parts.slice(0, i).join("_");
        if (WRENLIST_TO_ETSY_CATEGORY[prefix]) {
          categorySearch = WRENLIST_TO_ETSY_CATEGORY[prefix];
          break;
        }
      }
    }
    if (!categorySearch) categorySearch = product.category?.[0] || "";

    // Determine when_made based on product metadata.
    // CushyVintage sells almost exclusively vintage items, so default to vintage
    // for categories that are typically pre-owned/antique. Only categories that
    // might be new/handmade (craft_supplies, health_beauty) default to recent.
    const categoryRoot = rawCategory.split("_")[0];
    const VINTAGE_CATEGORIES = new Set([
      // Phase 3 first-segment roots
      "antiques", "art", "collectibles", "clothing", "electronics",
      "home", "books", "sports", "toys", "musical", "vehicles",
      // Legacy roots (still in DB)
      "ceramics", "glassware", "jewellery", "furniture", "homeware",
      "music", "medals", "teapots", "jugs",
    ]);
    const isLikelyVintage =
      product.dynamicProperties?.is_vintage === "true" ||
      VINTAGE_CATEGORIES.has(categoryRoot);
    const whenMade =
      product.whenMade || product.dynamicProperties?.when_made ||
      (isLikelyVintage ? ETSY_WHEN_MADE_VINTAGE : ETSY_WHEN_MADE_RECENT);

    // Combine all images into a single array
    // The cover image may be stored as a string on the product's index signature
    const coverImg = typeof product["cover"] === "string" ? product["cover"] : undefined;
    const allImageUrls: string[] = [];
    if (coverImg) allImageUrls.push(coverImg);
    if (product.images) {
      for (const img of product.images) {
        if (!allImageUrls.includes(img)) allImageUrls.push(img);
      }
    }

    const whoMade = (product.dynamicProperties?.whoMade as string) ?? undefined;

    return {
      title: product.title?.slice(0, 140) || "",
      description: product.description?.slice(0, 10000) || "",
      price: product.price || 0,
      quantity: product.quantity ?? 1,
      categorySearch,
      tags: product.tags || "",
      imageUrls: allImageUrls.slice(1), // additional images
      coverUrl: allImageUrls[0], // first image
      whenMade,
      whoMade,
      sku: product.sku || "",
      isVintage:
        whenMade !== ETSY_WHEN_MADE_RECENT && whenMade !== "made_to_order",
    };
  }

  /**
   * Wait for a selector to appear on the page (polls via executeScript).
   */
  private async waitForPageReady(
    tabId: number,
    selector: string,
    timeoutMs: number,
  ): Promise<void> {
    const start = Date.now();
    const interval = 500;

    while (Date.now() - start < timeoutMs) {
      try {
        const result = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel: string) => !!document.querySelector(sel),
          args: [selector],
        });
        if (result?.[0]?.result) return;
      } catch {
        // Tab not ready yet
      }
      await wait(interval);
    }
    // Continue even if not found — form-fill will handle missing elements gracefully
    console.warn(
      `[Etsy] Selector "${selector}" not found after ${timeoutMs}ms, continuing anyway`,
    );
    await remoteLog("warn", "etsy.publish", `Page selector "${selector}" not found after ${timeoutMs}ms`);
  }

  /**
   * Upload images to the Etsy listing form via the hidden file input.
   *
   * Images are fetched in the background service worker (no CORS restrictions),
   * converted to base64 data URIs, then passed to an injected script that
   * creates File objects and sets them on the file input via DataTransfer.
   */
  private async uploadImages(
    tabId: number,
    coverUrl: string | undefined,
    imageUrls: string[],
  ): Promise<void> {
    const allUrls = coverUrl ? [coverUrl, ...imageUrls] : [...imageUrls];
    if (allUrls.length === 0) return;

    // Limit to 10 images (Etsy max is 10 photos) — further limit to 20 for Etsy's new form
    const urls = allUrls.slice(0, 10);

    // Fetch images in the background worker (no CORS issues here)
    const imageDataList: Array<{ base64: string; mimeType: string }> = [];
    for (const url of urls) {
      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          console.warn(`[Etsy] Image fetch failed (${resp.status}): ${url}`);
          continue;
        }
        const blob = await resp.blob();
        const mimeType = blob.type || "image/jpeg";
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            "",
          ),
        );
        imageDataList.push({ base64, mimeType });
      } catch (err) {
        console.warn(`[Etsy] Failed to fetch image: ${url}`, err);
      }
    }

    if (imageDataList.length === 0) {
      console.warn("[Etsy] No images could be fetched");
      return;
    }

    // Inject the base64 data into the page and trigger the upload.
    // Etsy's form has both a hidden file input and a drag-drop zone.
    // We try both: setting files on the input AND dispatching a drop
    // event on the upload area, since Etsy may listen on either.
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (
        images: Array<{ base64: string; mimeType: string }>,
      ) => {
        try {
          const files: File[] = [];
          for (let i = 0; i < images.length; i++) {
            const { base64, mimeType } = images[i];
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let j = 0; j < binary.length; j++) {
              bytes[j] = binary.charCodeAt(j);
            }
            const blob = new Blob([bytes], { type: mimeType });
            const ext = mimeType.split("/")[1] || "jpg";
            files.push(
              new File([blob], `photo_${i + 1}.${ext}`, { type: mimeType }),
            );
          }

          // Method 1: Set files on the hidden file input
          const fileInput = document.querySelector(
            'input[type="file"]',
          ) as HTMLInputElement;
          if (fileInput) {
            const dt = new DataTransfer();
            for (const f of files) dt.items.add(f);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            fileInput.dispatchEvent(new Event("input", { bubbles: true }));
          }

          // Method 2: Dispatch a drop event on the upload area
          // Etsy's wt-upload component may listen for drag-drop events
          const dropZone = document.querySelector(".wt-upload__area");
          if (dropZone) {
            const dropDt = new DataTransfer();
            for (const f of files) dropDt.items.add(f);
            const dropEvent = new DragEvent("drop", {
              bubbles: true,
              cancelable: true,
              dataTransfer: dropDt,
            });
            dropZone.dispatchEvent(dropEvent);
          }
        } catch (err) {
          console.error("[Etsy] Image upload error:", err);
        }
      },
      args: [imageDataList],
    });

    // Wait for Etsy to process and upload images to their servers.
    // 5s base + 2s per image for server-side processing.
    await wait(5000 + imageDataList.length * 2000);
  }

  /**
   * Select a category by typing into the search typeahead and clicking
   * the first suggestion.
   *
   * Etsy's React search input requires:
   * 1. Native value setter (React overrides .value)
   * 2. InputEvent with inputType='insertText' (not plain Event)
   * 3. Character-by-character to trigger debounced search
   * 4. Suggestions appear as [role="option"] LI elements
   */
  private async selectCategory(
    tabId: number,
    searchTerm: string,
  ): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (term: string) => {
        const searchInput = document.getElementById(
          "category-field-search",
        ) as HTMLInputElement;
        if (!searchInput) return;

        const nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        if (!nativeSetter) return;

        // Focus and clear
        searchInput.focus();
        searchInput.click();
        nativeSetter.call(searchInput, "");
        searchInput.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "deleteContentBackward",
          }),
        );

        // Small delay after clearing
        await new Promise((r) => setTimeout(r, 200));

        // Type character-by-character using native setter + InputEvent
        for (let i = 0; i < term.length; i++) {
          nativeSetter.call(searchInput, term.slice(0, i + 1));
          searchInput.dispatchEvent(
            new InputEvent("input", {
              bubbles: true,
              cancelable: true,
              inputType: "insertText",
              data: term[i],
            }),
          );
        }

        // Wait for suggestions to appear (Etsy debounces the search).
        // 3s is safer — the typeahead can be slow on first load.
        await new Promise((r) => setTimeout(r, 3000));

        // Look for suggestion options and click the first one
        const options = document.querySelectorAll('[role="option"]');

        if (options.length > 0) {
          (options[0] as HTMLElement).click();
        } else {
          // Fallback: press Enter to select
          searchInput.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: "Enter",
              code: "Enter",
              keyCode: 13,
              bubbles: true,
            }),
          );
        }
      },
      args: [searchTerm],
    });

    // Wait for category selection to register and dependent fields to appear
    await wait(2000);
  }

  /**
   * Select the first available delivery profile.
   * Clicks "Select profile" to open the overlay, then clicks "Apply" on the first profile.
   * If no profiles exist, this is a no-op (user needs to create one in Etsy settings).
   */
  private async selectDeliveryProfile(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        // Click "Select profile" button to open the overlay
        const buttons = Array.from(document.querySelectorAll("button"));
        const selectBtn = buttons.find(
          (b) => b.textContent?.trim() === "Select profile",
        );
        if (!selectBtn) return; // No delivery profile section — might already be set

        selectBtn.click();

        // Wait for the overlay to appear
        await new Promise((r) => setTimeout(r, 1500));

        // Find the overlay and click "Apply" on the first profile
        const overlay = document.getElementById("shipping-profile-overlay");
        if (!overlay || overlay.offsetHeight === 0) return;

        const applyBtn = Array.from(
          overlay.querySelectorAll("button"),
        ).find((b) => b.textContent?.trim() === "Apply");

        if (applyBtn) {
          applyBtn.click();
        }
      },
    });

    // Wait for the profile to be applied
    await wait(1500);
  }

  /**
   * Set the processing profile on the Etsy listing form.
   * Required for publishing — selects "Ready to dispatch" + "1-2 days".
   */
  private async selectProcessingProfile(tabId: number): Promise<void> {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Click "Ready to dispatch" radio button (value="1")
        const radios = Array.from(document.querySelectorAll<HTMLInputElement>(
          'input[name="readinessState"]',
        ));
        for (const radio of radios) {
          if (radio.value === "1") {
            radio.focus();
            radio.checked = true;
            radio.dispatchEvent(
              new InputEvent("input", { bubbles: true, inputType: "insertText" }),
            );
            radio.dispatchEvent(new Event("change", { bubbles: true }));
            break;
          }
        }

        // Select "1-2 days (Recommended)" from processing time dropdown (value="1")
        const select = document.querySelector<HTMLSelectElement>(
          'select[name="processingRange"]',
        );
        if (select) {
          const nativeSetter = Object.getOwnPropertyDescriptor(
            HTMLSelectElement.prototype,
            "value",
          )?.set;
          if (nativeSetter) nativeSetter.call(select, "1");
          select.dispatchEvent(
            new InputEvent("input", { bubbles: true, inputType: "insertText" }),
          );
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
      },
    });

    await wait(500);
  }

  /**
   * Fill tags using chrome.debugger to simulate real keyboard input.
   *
   * executeScript (even with world:"MAIN") doesn't trigger React's
   * internal event handlers properly for the tag input. The debugger
   * protocol's Input.dispatchKeyEvent sends events indistinguishable
   * from real user keyboard input, which React processes correctly.
   */
  /**
   * Fill tags by injecting a page-level script that types into the input
   * and clicks Add, all within a single MAIN-world execution context.
   *
   * The key insight: the entire set+click sequence must happen inside ONE
   * function running in the page's MAIN world, with async delays between
   * value set and button click so React can process the state change.
   */
  private async fillTags(tabId: number, tags: string): Promise<void> {
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 13) // Etsy max 13 tags
      .map((t) => t.slice(0, 20)); // Etsy max 20 chars per tag

    if (tagList.length === 0) return;

    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        world: "MAIN" as chrome.scripting.ExecutionWorld,
        func: async (tagArray: string[]) => {
          const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
          const input = document.getElementById("listing-tags-input") as HTMLInputElement | null;
          if (!input) return { filled: 0, error: "tag input not found" };

          // Find the Add button
          let addBtn: HTMLButtonElement | undefined;
          let container: HTMLElement | null = input.parentElement;
          for (let d = 0; d < 5 && container && !addBtn; d++) {
            addBtn = Array.from(container.querySelectorAll("button")).find(
              (b) => b.textContent?.trim() === "Add",
            );
            container = container.parentElement;
          }
          if (!addBtn) return { filled: 0, error: "Add button not found" };

          const setter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype, "value",
          )?.set;

          let filled = 0;
          for (const tag of tagArray) {
            // Focus and set value
            input.focus();
            input.click();
            await delay(50);

            if (setter) {
              setter.call(input, tag);
            } else {
              input.value = tag;
            }
            input.dispatchEvent(new InputEvent("input", {
              bubbles: true, cancelable: true, inputType: "insertText", data: tag,
            }));
            input.dispatchEvent(new Event("change", { bubbles: true }));

            // Wait for React to process the value into its state
            await delay(200);

            // Click Add
            addBtn.click();
            filled++;

            // Wait for the tag chip to render and input to clear
            await delay(300);
          }

          return { filled, error: null };
        },
        args: [tagList],
      });

      const execResult = result?.[0]?.result as { filled: number; error: string | null } | undefined;
      if (execResult?.error) {
        console.warn("[Etsy] Tag fill issue:", execResult.error);
        await remoteLog("warn", "etsy.tags", `Tag fill: ${execResult.error}`);
      } else {
        console.log(`[Etsy] Filled ${execResult?.filled ?? 0} tags`);
        await remoteLog("info", "etsy.tags", `Filled ${execResult?.filled ?? 0} tags`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Etsy] Tag fill failed:", msg);
      await remoteLog("error", "etsy.tags", `Tag fill error: ${msg}`);
    }
  }

  // ─── Bulk operations via internal AJAX API ──────────────────────

  /** Result summary from bulk operations */
  public static readonly BULK_DELAY_MS = 200;

  /**
   * Generic bulk PATCH — sends a PATCH for each item with the given fields.
   * Gets CSRF nonce once, then processes sequentially with rate-limiting delay.
   */
  public async bulkPatchListings(
    items: Array<{ listingId: string; fields: Record<string, unknown> }>,
  ): Promise<{ updated: number; failed: number; errors: string[] }> {
    const shopId = await this.getShopId();
    const csrfNonce = await this.getCsrfNonce();

    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    await remoteLog("info", "etsy.bulk-patch", `Starting bulk PATCH for ${items.length} listings`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // MV3 keepalive
      void chrome.storage.local.set({ _keepAlive: Date.now() });

      try {
        const resp = await fetch(
          `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${item.listingId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "x-csrf-token": csrfNonce,
            },
            body: JSON.stringify(item.fields),
          },
        );

        if (resp.ok) {
          updated++;
        } else {
          const errText = await resp.text().catch(() => "");
          const msg = `Listing ${item.listingId}: ${resp.status} ${errText.substring(0, 150)}`;
          errors.push(msg);
          failed++;
        }
      } catch (err) {
        const msg = `Listing ${item.listingId}: ${err instanceof Error ? err.message : String(err)}`;
        errors.push(msg);
        failed++;
      }

      if (i < items.length - 1) {
        await wait(EtsyClient.BULK_DELAY_MS);
      }

      // Log progress every 10 items
      if ((i + 1) % 10 === 0) {
        await remoteLog("info", "etsy.bulk-patch", `Progress: ${i + 1}/${items.length} (${updated} ok, ${failed} err)`);
      }
    }

    await remoteLog("info", "etsy.bulk-patch", `Complete: ${updated} updated, ${failed} failed`);
    return { updated, failed, errors };
  }

  /**
   * Bulk update prices on Etsy listings.
   */
  public async bulkUpdatePrice(
    items: Array<{ listingId: string; price: number }>,
  ): Promise<{ updated: number; failed: number; errors: string[] }> {
    return this.bulkPatchListings(
      items.map((item) => ({
        listingId: item.listingId,
        fields: { price: item.price },
      })),
    );
  }

  /**
   * Bulk renew (reactivate) expired/inactive Etsy listings.
   */
  public async bulkRenew(
    listingIds: string[],
  ): Promise<{ renewed: number; failed: number; errors: string[] }> {
    const result = await this.bulkPatchListings(
      listingIds.map((id) => ({
        listingId: id,
        fields: { state: "active" },
      })),
    );
    return { renewed: result.updated, failed: result.failed, errors: result.errors };
  }

  /**
   * Bulk deactivate Etsy listings.
   */
  public async bulkDeactivate(
    listingIds: string[],
  ): Promise<{ deactivated: number; failed: number; errors: string[] }> {
    const result = await this.bulkPatchListings(
      listingIds.map((id) => ({
        listingId: id,
        fields: { state: "inactive" },
      })),
    );
    return { deactivated: result.updated, failed: result.failed, errors: result.errors };
  }

  /**
   * Bulk update tags on Etsy listings.
   */
  public async bulkUpdateTags(
    items: Array<{ listingId: string; tags: string[] }>,
  ): Promise<{ updated: number; failed: number; errors: string[] }> {
    return this.bulkPatchListings(
      items.map((item) => ({
        listingId: item.listingId,
        fields: { tags: item.tags },
      })),
    );
  }

  /**
   * Bulk delete Etsy listings (permanent removal).
   */
  public async bulkDelete(
    listingIds: string[],
  ): Promise<{ deleted: number; failed: number; errors: string[] }> {
    const shopId = await this.getShopId();
    const csrfNonce = await this.getCsrfNonce();

    let deleted = 0;
    let failed = 0;
    const errors: string[] = [];

    await remoteLog("info", "etsy.bulk-delete", `Starting bulk DELETE for ${listingIds.length} listings`);

    for (let i = 0; i < listingIds.length; i++) {
      const listingId = listingIds[i];
      void chrome.storage.local.set({ _keepAlive: Date.now() });

      try {
        const resp = await fetch(
          `${this.baseUrl}/api/v3/ajax/shop/${shopId}/listings/${listingId}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { "x-csrf-token": csrfNonce },
          },
        );

        if (resp.ok) {
          deleted++;
        } else {
          const errText = await resp.text().catch(() => "");
          errors.push(`Listing ${listingId}: ${resp.status} ${errText.substring(0, 150)}`);
          failed++;
        }
      } catch (err) {
        errors.push(`Listing ${listingId}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }

      if (i < listingIds.length - 1) {
        await wait(EtsyClient.BULK_DELAY_MS);
      }

      if ((i + 1) % 10 === 0) {
        await remoteLog("info", "etsy.bulk-delete", `Progress: ${i + 1}/${listingIds.length} (${deleted} ok, ${failed} err)`);
      }
    }

    await remoteLog("info", "etsy.bulk-delete", `Complete: ${deleted} deleted, ${failed} failed`);
    return { deleted, failed, errors };
  }
}

// ─── Injected functions (run in page context) ──────────────────────

/**
 * Fill all text fields, selects, and radio buttons on the Etsy listing form.
 * Executed in the context of the Etsy web page via chrome.scripting.executeScript.
 */
function fillEtsyListingForm(data: EtsyFormFillData): {
  success: boolean;
  message?: string;
} {
  // Inline helper — this function runs in page context via executeScript,
  // so it cannot reference any functions defined outside this closure.
  //
  // Etsy's 2026 listing form uses a custom state layer that listens for
  // InputEvent (not plain Event) with a valid inputType, plus blur to
  // commit the value. Without these, the DOM .value changes but the form
  // state ignores it and validation still fails.
  function setNativeValue(
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string,
  ): void {
    const proto =
      element instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

    element.focus();
    if (nativeSetter) {
      nativeSetter.call(element, value);
    } else {
      element.value = value;
    }
    element.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value,
      }),
    );
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  try {
    const filled: string[] = [];

    // ── Title ──
    const titleInput = document.getElementById(
      "listing-title-input",
    ) as HTMLTextAreaElement | null;
    if (titleInput) {
      setNativeValue(titleInput, data.title);
      filled.push("title");
    }

    // ── Description ──
    const descInput = document.getElementById(
      "listing-description-textarea",
    ) as HTMLTextAreaElement | null;
    if (descInput) {
      setNativeValue(descInput, data.description);
      filled.push("description");
    }

    // ── Price ──
    const priceInput = document.getElementById(
      "listing-price-input",
    ) as HTMLInputElement | null;
    if (priceInput) {
      setNativeValue(priceInput, data.price.toFixed(2));
      filled.push("price");
    }

    // ── Quantity ──
    const qtyInput = document.getElementById(
      "listing-quantity-input",
    ) as HTMLInputElement | null;
    if (qtyInput) {
      setNativeValue(qtyInput, String(data.quantity));
      filled.push("quantity");
    }

    // ── SKU ──
    if (data.sku) {
      const skuInput = document.getElementById(
        "listing-sku-input",
      ) as HTMLInputElement | null;
      if (skuInput) {
        setNativeValue(skuInput, data.sku);
        filled.push("sku");
      }
    }

    // Tags are filled in a separate step (fillTags) because the Add button
    // click needs React event processing that works better as a standalone
    // executeScript call rather than inline in this function.

    // ── Who made it (radio: 0="I did", 1="A member of my shop", 2="Another company or person") ──
    const whoMadeRadios = document.querySelectorAll(
      'input[name="whoMade"]',
    ) as NodeListOf<HTMLInputElement>;
    if (whoMadeRadios.length >= 1) {
      // Map form value to radio index (default: "someone_else" for vintage resale)
      const whoMadeMap: Record<string, number> = { i_did: 0, collective: 1, someone_else: 2 };
      const radioIndex = whoMadeMap[data.whoMade ?? ""] ?? 2; // Default to "Another company or person"
      const target = whoMadeRadios[Math.min(radioIndex, whoMadeRadios.length - 1)];
      target.focus();
      target.checked = true;
      target.click();
      target.dispatchEvent(new InputEvent("input", { bubbles: true }));
      target.dispatchEvent(new Event("change", { bubbles: true }));
      filled.push("whoMade");
    }

    // ── What is it (radio: index 0 = "A finished product") ──
    const isSupplyRadios = document.querySelectorAll(
      'input[name="isSupply"]',
    ) as NodeListOf<HTMLInputElement>;
    if (isSupplyRadios.length >= 1) {
      isSupplyRadios[0].focus();
      isSupplyRadios[0].checked = true;
      isSupplyRadios[0].click();
      isSupplyRadios[0].dispatchEvent(
        new InputEvent("input", { bubbles: true }),
      );
      isSupplyRadios[0].dispatchEvent(new Event("change", { bubbles: true }));
      filled.push("isSupply");
    }

    // ── When was it made (select) ──
    const whenMadeSelect = document.getElementById(
      "when-made-select",
    ) as HTMLSelectElement | null;
    if (whenMadeSelect && data.whenMade) {
      const selectSetter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set;
      if (selectSetter) {
        selectSetter.call(whenMadeSelect, data.whenMade);
      } else {
        whenMadeSelect.value = data.whenMade;
      }
      whenMadeSelect.dispatchEvent(
        new Event("input", { bubbles: true }),
      );
      whenMadeSelect.dispatchEvent(new Event("change", { bubbles: true }));
      filled.push("whenMade");
    }

    return {
      success: true,
      message: `Filled: ${filled.join(", ")}`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown form-fill error",
    };
  }
}

/**
 * Click Save as draft or Publish depending on mode.
 * @param mode "draft" saves without fee; "publish" lists live ($0.20 fee).
 */
function clickPublishButton(
  mode: "draft" | "publish" = "draft",
): { success: boolean; message?: string; actualMode?: "draft" | "publish" } {
  try {
    const buttons = Array.from(document.querySelectorAll("button"));

    if (mode === "publish") {
      const publishBtn = buttons.find(
        (b) => b.textContent?.trim() === "Publish",
      );
      if (publishBtn && !publishBtn.disabled) {
        publishBtn.scrollIntoView({ block: "center" });
        publishBtn.click();
        return { success: true, message: "Clicked Publish", actualMode: "publish" };
      }
      // Fallback to draft if Publish is disabled
      const draftBtn = buttons.find((b) =>
        b.textContent?.trim()?.includes("Save as draft"),
      );
      if (draftBtn && !draftBtn.disabled) {
        draftBtn.scrollIntoView({ block: "center" });
        draftBtn.click();
        return { success: true, message: "Publish disabled — saved as draft instead", actualMode: "draft" };
      }
    } else {
      const draftBtn = buttons.find((b) =>
        b.textContent?.trim()?.includes("Save as draft"),
      );
      if (draftBtn && !draftBtn.disabled) {
        draftBtn.scrollIntoView({ block: "center" });
        draftBtn.click();
        return { success: true, message: "Saved as draft", actualMode: "draft" };
      }
      // Fallback to Publish if draft button not available
      const publishBtn = buttons.find(
        (b) => b.textContent?.trim() === "Publish",
      );
      if (publishBtn && !publishBtn.disabled) {
        publishBtn.scrollIntoView({ block: "center" });
        publishBtn.click();
        return { success: true, message: "Draft not available — clicked Publish", actualMode: "publish" };
      }
    }

    return { success: false, message: "Save/Publish button not found or disabled" };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown publish error",
    };
  }
}

/**
 * Handle Etsy's publish confirmation dialog.
 * After clicking the main Publish button, Etsy shows a modal asking
 * to confirm the $0.20 listing fee. This clicks the "Publish" button
 * inside that confirmation dialog.
 */
function clickPublishConfirmation(): { success: boolean; message?: string } {
  try {
    // Etsy shows a fee confirmation dialog: "You are about to publish a new listing"
    // with a "Publish" button inside it. The dialog uses role="alertdialog" or role="dialog".
    const dialogSelectors = [
      '[role="alertdialog"]',
      '[role="dialog"]',
      '[class*="overlay"]',
      '[class*="modal"]',
      '[class*="wt-overlay"]',
    ];

    // First, find any visible dialog
    let dialog: Element | null = null;
    for (const sel of dialogSelectors) {
      const candidates = document.querySelectorAll(sel);
      for (const c of Array.from(candidates)) {
        if ((c as HTMLElement).offsetHeight > 0 &&
            c.textContent?.toLowerCase().includes("publish")) {
          dialog = c;
          break;
        }
      }
      if (dialog) break;
    }

    if (dialog) {
      // Find the Publish button INSIDE the dialog
      const dialogButtons = Array.from(dialog.querySelectorAll("button"));
      const publishBtn = dialogButtons.find(
        (b) => b.textContent?.trim() === "Publish",
      );
      if (publishBtn) {
        publishBtn.click();
        return { success: true, message: "Confirmed publish in dialog" };
      }
      // Fallback: any button that looks like confirm
      const confirmBtn = dialogButtons.find(
        (b) => b.textContent?.trim() === "Activate & Renew" ||
               b.textContent?.trim() === "Activate",
      );
      if (confirmBtn) {
        confirmBtn.click();
        return { success: true, message: `Clicked ${confirmBtn.textContent?.trim()} in dialog` };
      }
      return { success: false, message: `Dialog found but no Publish button inside. Buttons: ${dialogButtons.map(b => b.textContent?.trim()).join(', ')}` };
    }

    // No dialog found — try finding Publish button NOT in the sticky footer
    const allButtons = Array.from(document.querySelectorAll("button"));
    const publishButtons = allButtons.filter(
      (b) => b.textContent?.trim() === "Publish" && (b as HTMLElement).offsetHeight > 0,
    );
    if (publishButtons.length > 1) {
      // Multiple Publish buttons — click the last one (likely the dialog one)
      publishButtons[publishButtons.length - 1].click();
      return { success: true, message: `Clicked Publish button ${publishButtons.length} of ${publishButtons.length}` };
    }

    return { success: false, message: "No confirmation dialog or extra Publish button found" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Full deactivation flow on the listing's public page:
 * 1. Click the "Deactivate" <a> link in seller listing tools
 * 2. Wait for the confirmation dialog to appear
 * 3. Click the "Deactivate" <button> inside the dialog
 *
 * Runs as a single executeScript so all DOM access stays in one context.
 */
async function deactivateListingFromSellerTools(): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    // Step 1: Find and click the Deactivate link in seller tools bar
    const links = Array.from(document.querySelectorAll("a"));
    const deactivateLink = links.find(
      (a) =>
        a.textContent?.trim() === "Deactivate" &&
        a.offsetHeight > 0,
    );

    if (!deactivateLink) {
      // Maybe it's a button instead
      const buttons = Array.from(document.querySelectorAll("button"));
      const deactivateBtn = buttons.find(
        (b) =>
          b.textContent?.trim() === "Deactivate" &&
          (b as HTMLElement).offsetHeight > 0,
      );
      if (!deactivateBtn) {
        return {
          success: false,
          message: "Deactivate link/button not found on page",
        };
      }
      deactivateBtn.click();
    } else {
      deactivateLink.click();
    }

    // Step 2: Wait for confirmation dialog to appear (poll up to 5s)
    let confirmed = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise((r) => setTimeout(r, 500));

      // Look for any visible element containing "deactivate" with a button
      const allButtons = Array.from(document.querySelectorAll("button"));
      const dialogBtn = allButtons.find((b) => {
        if (b.textContent?.trim() !== "Deactivate") return false;
        if (!(b as HTMLElement).offsetHeight) return false;
        // Must be inside an overlay/dialog, not the seller tools bar
        const parent = b.closest(
          '[role="dialog"], [role="alertdialog"], [class*="overlay"], [class*="modal"], [class*="wt-overlay"]',
        );
        return !!parent;
      });

      if (dialogBtn) {
        dialogBtn.click();
        confirmed = true;
        break;
      }

      // Also try "Deactivate now"
      const deactivateNowBtn = allButtons.find(
        (b) =>
          b.textContent?.trim() === "Deactivate now" &&
          (b as HTMLElement).offsetHeight > 0,
      );
      if (deactivateNowBtn) {
        deactivateNowBtn.click();
        confirmed = true;
        break;
      }
    }

    if (confirmed) {
      return { success: true, message: "Listing deactivated" };
    }

    return {
      success: false,
      message: "Confirmation dialog button not found after 5s",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Validate that an Etsy AJAX response body confirms a listing transitioned
 * to the inactive state. Etsy's internal v3 endpoint returns 200 in several
 * "no-op" cases (stale CSRF nonce accepted but request silently rejected,
 * unsupported state transition, error envelopes, etc.) so we cannot trust
 * the HTTP status alone.
 *
 * Etsy represents listing state in a few different shapes across endpoints:
 *  - canonical string: `state: "inactive" | "active" | "draft" | ...`
 *  - integer enum (legacy): `state: 0 (active) | 1 (inactive) | 2 (draft) | ...`
 *    (we accept either 1 or "inactive"; numeric semantics vary by endpoint
 *    so we additionally accept any state where the body explicitly says the
 *    listing is no longer active — i.e. `is_active === false` if present)
 *  - nested under `listing` or `data` envelope: `{ listing: { state: ... } }`
 *
 * If we can't find a state field at all, treat as unconfirmed (caller falls
 * back to the form path). False negatives here just trigger the slower but
 * known-good seller-tools click flow — never a silent lie.
 */
function isEtsyResponseInactive(body: unknown): {
  confirmed: boolean;
  observedState: string | number | null;
  reason: string;
} {
  if (body === null || body === undefined) {
    return { confirmed: false, observedState: null, reason: "empty body" };
  }
  if (typeof body !== "object") {
    return { confirmed: false, observedState: null, reason: `non-object body (${typeof body})` };
  }

  const record = body as Record<string, unknown>;

  // Unwrap common envelopes: { listing: {...} } or { data: {...} }
  const candidates: Record<string, unknown>[] = [record];
  for (const key of ["listing", "data", "result"]) {
    const nested = record[key];
    if (nested && typeof nested === "object") {
      candidates.push(nested as Record<string, unknown>);
    }
  }

  let observedState: string | number | null = null;
  let observedIsActive: boolean | null = null;

  for (const obj of candidates) {
    const s = obj.state;
    if (typeof s === "string" || typeof s === "number") {
      observedState = s;
    }
    const ia = obj.is_active;
    if (typeof ia === "boolean") {
      observedIsActive = ia;
    }
    // Some error envelopes carry `error` / `error_message`
    if (typeof obj.error === "string" || typeof obj.error_message === "string") {
      return {
        confirmed: false,
        observedState,
        reason: `error envelope: ${String(obj.error ?? obj.error_message).substring(0, 100)}`,
      };
    }
  }

  if (typeof observedState === "string") {
    if (observedState.toLowerCase() === "inactive") {
      return { confirmed: true, observedState, reason: "state string === inactive" };
    }
    return {
      confirmed: false,
      observedState,
      reason: `state string is "${observedState}", not "inactive"`,
    };
  }

  if (typeof observedState === "number") {
    // Etsy's numeric state codes vary: in the listings/v3/search response,
    // state is the string. In create-draft response we've seen `state: number`.
    // Be conservative — only accept the known "active" code (0) being absent
    // combined with an explicit is_active=false. Otherwise unconfirmed.
    if (observedIsActive === false) {
      return { confirmed: true, observedState, reason: "is_active === false" };
    }
    return {
      confirmed: false,
      observedState,
      reason: `numeric state ${observedState} without is_active===false confirmation`,
    };
  }

  if (observedIsActive === false) {
    return { confirmed: true, observedState, reason: "is_active === false (no state field)" };
  }

  return {
    confirmed: false,
    observedState,
    reason: "no state or is_active field found in response",
  };
}
