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
interface RawEtsyOrder {
  order_id: number; order_date: number; buyer_id: number;
  transaction_ids?: number[]; payment?: RawEtsyPayment;
  is_canceled?: boolean; order_url?: string;
  shipping_address?: Record<string, unknown>;
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
  transactionFee: number | null;
  processingFee: number | null;
  listingFee: number | null;
  netAmount: number | null;
  currency: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  shippingAddress: {
    name: string | null; city: string | null; state: string | null;
    country: string | null; zip: string | null;
  } | null;
  itemCount: number;
  /** Listing IDs resolved from transaction_id → listing_id mapping */
  listingIds: string[];
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
        created: null,
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
    const states = ["active", "sold_out", "draft"] as const;

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
            created: null,
            marketplaceUrl: l.url ?? this.getProductUrl(l.listing_id),
            isSold: state === "sold_out",
            isHidden: state === "draft",
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

    // Extract total pages — look for pagination patterns
    // The page text shows "Page 1 [select] of 9 [nav arrows]"
    // In HTML this renders as an input/select + "of N"
    const totalPagesJson = html.match(/"total_pages"\s*:\s*(\d+)/);
    const totalPagesHtml =
      html.match(/>\s*of\s+(\d+)\s*</) ||        // ">of 9<" in pagination
      html.match(/page_count["\s:]+(\d+)/) ||     // page_count in JSON
      html.match(/total_page[s]?["\s:]+(\d+)/);   // total_pages in JSON
    const totalPages = totalPagesJson
      ? parseInt(totalPagesJson[1], 10)
      : totalPagesHtml
        ? parseInt(totalPagesHtml[1], 10)
        : 1;

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

    const rawOrders = (search.orders || []) as RawEtsyOrder[];
    const rawBuyers = (search.buyers || []) as RawEtsyBuyer[];
    const rawPackages = (search.packages || []) as RawEtsyPackage[];
    const rawTransactions = (search.transactions || []) as Array<{
      transaction_id: number; listing_id: number; cost?: RawEtsyMoney;
    }>;

    // Map transaction_id → listing_id
    const txnToListing = new Map<number, number>();
    for (const t of rawTransactions) {
      if (t.transaction_id && t.listing_id) {
        txnToListing.set(t.transaction_id, t.listing_id);
      }
    }

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
        grossAmount: moneyToPounds(costBreakdown?.items_cost),
        shippingCost: moneyToPounds(costBreakdown?.shipping_cost),
        transactionFee: null, // Etsy fees not in buyer-facing cost_breakdown
        processingFee: null,
        listingFee: null,
        netAmount: moneyToPounds(costBreakdown?.total_cost),
        currency: costBreakdown?.items_cost?.currency_code || "GBP",
        paymentMethod: payment?.payment_method || null,
        shippingMethod: pkg?.shipping_method_name || null,
        trackingNumber: pkg?.tracking_code || null,
        carrier: pkg?.carrier_name || null,
        shippingAddress: o.shipping_address ? {
          name: (o.shipping_address).name as string || null,
          city: (o.shipping_address).city as string || null,
          state: (o.shipping_address).state as string || null,
          country: (o.shipping_address).country_name as string || null,
          zip: (o.shipping_address).zip as string || null,
        } : null,
        itemCount: o.transaction_ids?.length || 0,
        listingIds: (o.transaction_ids || [])
          .map((tid) => txnToListing.get(tid))
          .filter((id): id is number => id != null)
          .map(String),
      };
    });

    return { orders, totalPages, page };
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

  // ─── Publish ───────────────────────────────────────────────────────

  /**
   * Publish a product to Etsy via browser automation.
   * Opens the listing editor, fills all fields, uploads images,
   * selects category, and clicks Publish.
   */
  public async publishProduct(
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

  // ─── Delist ────────────────────────────────────────────────────────

  /**
   * Deactivate a listing via Etsy's internal v3 AJAX API.
   * This sets the listing state to "inactive" (deactivated), not deleted.
   */
  public async delistProduct(
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
