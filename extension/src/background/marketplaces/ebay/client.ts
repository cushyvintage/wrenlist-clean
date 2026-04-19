/**
 * eBay Seller Hub SSR scraper.
 * Fetches order history from Seller Hub HTML pages and extracts
 * the embedded JSON data — same pattern as Etsy receipts scraper.
 *
 * The SSR data is embedded in a large <script> tag containing a
 * Grid with meta.name === "orders" and a members[] array.
 */

import {
  buildOrdersUrl,
  EBAY_ORDERS_PER_PAGE,
  EBAY_TIMERANGES,
  type EbayTimerange,
} from "./constants.js";

/* ── Types ──────────────────────────────────────────────────────── */

/** Mapped order shape matching the eBay Fulfillment API structure
 *  expected by /api/ebay/sync-orders */
export interface EbayScrapedOrder {
  orderId: string;
  creationDate: string; // ISO string
  lineItems: Array<{
    legacyItemId: string;
    title: string;
    total: { value: string; currency: string };
  }>;
  // Display-only fields (not in Fulfillment API shape but useful for import UI)
  _scraped: {
    status: string;
    totalDisplay: string;
    postalCode: string;
    imageUrl: string | null;
  };
}

export interface EbayScrapedResult {
  orders: EbayScrapedOrder[];
  totalCount: number;
  totalPages: number;
  page: number;
  _debug?: Record<string, unknown>;
}

/* ── SSR text span helper ───────────────────────────────────────── */

interface TextSpan {
  text?: string;
  styles?: string[];
}

interface TextSpanContainer {
  textSpans?: TextSpan[];
}

function extractText(container: TextSpanContainer | undefined | null): string {
  return container?.textSpans?.[0]?.text?.trim() || "";
}

/* ── Date parsing ───────────────────────────────────────────────── */

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse "9 Oct 2025" or "13 Apr" to ISO string */
function parseEbayDate(raw: string): string {
  const parts = raw.match(/(\d{1,2})\s+(\w{3})\s*(\d{4})?/);
  if (!parts) return new Date().toISOString();
  const day = parseInt(parts[1], 10);
  const month = MONTH_MAP[parts[2].toLowerCase()] ?? 0;
  const year = parts[3] ? parseInt(parts[3], 10) : new Date().getFullYear();
  return new Date(year, month, day).toISOString();
}

/* ── Price parsing ──────────────────────────────────────────────── */

/** Parse "£9.75" or "$12.50" to { value, currency } */
function parseEbayPrice(raw: string): { value: string; currency: string } {
  const cleaned = raw.replace(/[^0-9.,]/g, "").replace(",", "");
  const value = parseFloat(cleaned) || 0;
  let currency = "GBP";
  if (raw.includes("$")) currency = "USD";
  if (raw.includes("€")) currency = "EUR";
  return { value: String(value), currency };
}

/* ── Client ─────────────────────────────────────────────────────── */

export class EbaySellerHubClient {
  /**
   * Check if the user is logged into eBay by looking for session cookies.
   */
  async checkLogin(): Promise<boolean> {
    try {
      const cookies = await chrome.cookies.getAll({ domain: ".ebay.co.uk" });
      // Look for common eBay session indicators
      return cookies.some(
        (c) =>
          c.name === "ebay" ||
          c.name === "s" ||
          c.name === "nonsession" ||
          c.name.startsWith("dp1")
      );
    } catch {
      return false;
    }
  }

  /**
   * Fetch a single page of orders from eBay Seller Hub.
   * Scrapes the SSR HTML and extracts the embedded JSON.
   */
  async getOrders(
    page = 1,
    timerange: EbayTimerange = EBAY_TIMERANGES.LAST_YEAR
  ): Promise<EbayScrapedResult> {
    const offset = (page - 1) * EBAY_ORDERS_PER_PAGE;
    const url = buildOrdersUrl(timerange, offset);

    const resp = await fetch(url, {
      credentials: "include",
      headers: { Accept: "text/html" },
    });

    if (!resp.ok) {
      throw new Error(`eBay Seller Hub returned ${resp.status}`);
    }

    const html = await resp.text();

    // Find the largest <script> tag containing order data
    const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let orderScript = "";
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      const content = scriptMatch[1];
      if (
        content.includes('"orderId"') &&
        content.length > orderScript.length
      ) {
        orderScript = content;
      }
    }

    if (!orderScript) {
      console.warn("[EbaySellerHub] No script tag found with orderId. HTML length:", html.length);
      return { orders: [], totalCount: 0, totalPages: 0, page, _debug: { htmlLength: html.length, noScript: true } as Record<string, unknown> };
    }

    console.log("[EbaySellerHub] Found script with orderId, length:", orderScript.length);

    // Parse the JSON — try multiple extraction patterns
    let parsed: Record<string, unknown> | null = null;

    // Pattern 1: variable assignment (= {...};)
    const assignMatch = orderScript.match(/=\s*(\{[\s\S]+\})\s*;?\s*$/);
    if (assignMatch?.[1]) {
      try {
        parsed = JSON.parse(assignMatch[1]) as Record<string, unknown>;
        console.log("[EbaySellerHub] Parsed via assignment pattern");
      } catch {
        /* ignore */
      }
    }

    // Pattern 2: raw JSON
    if (!parsed) {
      try {
        parsed = JSON.parse(orderScript) as Record<string, unknown>;
        console.log("[EbaySellerHub] Parsed as raw JSON");
      } catch {
        /* ignore */
      }
    }

    // Pattern 3: Script is a bundled function — extract individual JSON objects
    // containing order data by finding "meta":{"name":"orders"} and its members array
    if (!parsed) {
      // Find the orders grid directly in the raw script text
      const membersIdx = orderScript.indexOf('"members":[{');
      if (membersIdx === -1) {
        // Try alternate format
        const altIdx = orderScript.indexOf('"members": [{');
        if (altIdx >= 0) {
          // Found with spaces
          const arrStart = orderScript.indexOf("[", altIdx);
          const extracted = this.extractJsonArray(orderScript, arrStart);
          if (extracted) {
            console.log("[EbaySellerHub] Extracted members array directly (alt format), length:", extracted.length);
            const totalCountMatch = orderScript.match(/"totalEntries"\s*:\s*(\d+)/);
            const totalCount = totalCountMatch ? parseInt(totalCountMatch[1], 10) : extracted.length;
            return this.processMembers(extracted, html, totalCount, page);
          }
        }
      } else {
        const arrStart = orderScript.indexOf("[", membersIdx);
        const extracted = this.extractJsonArray(orderScript, arrStart);
        if (extracted) {
          console.log("[EbaySellerHub] Extracted members array directly, length:", extracted.length);
          const totalCountMatch = orderScript.match(/"totalEntries"\s*:\s*(\d+)/);
          const totalCount = totalCountMatch ? parseInt(totalCountMatch[1], 10) : extracted.length;
          return this.processMembers(extracted, html, totalCount, page);
        }
      }
    }

    if (!parsed) {
      console.warn("[EbaySellerHub] Failed to parse script. Length:", orderScript.length);
      return { orders: [], totalCount: 0, totalPages: 0, page, _debug: { scriptLength: orderScript.length, parseFailure: true, preview: orderScript.substring(0, 300) } as Record<string, unknown> };
    }

    // Navigate to the orders grid — search recursively for { meta: { name: "orders" }, members: [...] }
    const membersArray = this.findOrdersMembers(parsed);
    if (!membersArray) {
      console.warn("[EbaySellerHub] No orders members found. Top-level keys:", Object.keys(parsed).slice(0, 10));
      return { orders: [], totalCount: 0, totalPages: 0, page, _debug: { topKeys: Object.keys(parsed).slice(0, 15), noMembers: true } as Record<string, unknown> };
    }

    console.log("[EbaySellerHub] Found", membersArray.length, "order members");

    // Extract total count for pagination
    const totalCountMatch = html.match(
      /Results:\s*[\d,]+-[\d,]+\s+of\s+([\d,]+)/
    );
    const totalCount = totalCountMatch
      ? parseInt(totalCountMatch[1].replace(/,/g, ""), 10)
      : membersArray.length;
    const totalPages = Math.ceil(totalCount / EBAY_ORDERS_PER_PAGE);

    // Map members to EbayScrapedOrder
    const orders: EbayScrapedOrder[] = [];

    for (const member of membersArray) {
      const m = member as Record<string, unknown>;
      const orderId = (m.orderId as string) || "";
      if (!orderId) continue;

      const creationDateRaw = extractText(
        m.creationDate as TextSpanContainer | undefined
      );
      const statusRaw = extractText(
        m.orderStatus as TextSpanContainer | undefined
      );
      const totalRaw = extractText(
        m.displayTotalPrice as TextSpanContainer | undefined
      );

      // Extract postal code (nested LabelValueTextualDisplay)
      const postalCodeObj = m.postalCode as Record<string, unknown> | undefined;
      const postalCode = extractText(
        postalCodeObj?.value as TextSpanContainer | undefined
      );

      const lineItemsRaw = (m.orderLineItems || []) as Array<
        Record<string, unknown>
      >;
      const lineItems = lineItemsRaw
        .map((li) => {
          const summary = li.listingSummary as Record<string, unknown> | undefined;
          if (!summary) return null;

          const listingId = (summary.listingId as string) || "";
          const title = extractText(
            summary.title as TextSpanContainer | undefined
          );
          const image = summary.image as Record<string, unknown> | undefined;
          const imageUrl = (image?.URL as string) || null;

          const price = parseEbayPrice(totalRaw);

          return {
            legacyItemId: listingId,
            title,
            total: price,
            _imageUrl: imageUrl,
          };
        })
        .filter(Boolean) as Array<{
        legacyItemId: string;
        title: string;
        total: { value: string; currency: string };
        _imageUrl: string | null;
      }>;

      if (lineItems.length === 0) continue;

      orders.push({
        orderId,
        creationDate: parseEbayDate(creationDateRaw),
        lineItems: lineItems.map((li) => ({
          legacyItemId: li.legacyItemId,
          title: li.title,
          total: li.total,
        })),
        _scraped: {
          status: statusRaw,
          totalDisplay: totalRaw,
          postalCode,
          imageUrl: lineItems[0]?._imageUrl || null,
        },
      });
    }

    return { orders, totalCount, totalPages, page };
  }

  /**
   * Recursively search parsed JSON for the orders Grid members array.
   */
  private findOrdersMembers(
    obj: unknown,
    depth = 0
  ): unknown[] | null {
    if (depth > 15 || !obj || typeof obj !== "object") return null;

    const record = obj as Record<string, unknown>;

    // Check if this is the orders grid
    const meta = record.meta as Record<string, unknown> | undefined;
    if (meta?.name === "orders" && Array.isArray(record.members)) {
      return record.members as unknown[];
    }

    // Search children
    for (const key of Object.keys(record)) {
      const val = record[key];
      if (Array.isArray(val)) {
        for (const item of val) {
          const result = this.findOrdersMembers(item, depth + 1);
          if (result) return result;
        }
      } else if (val && typeof val === "object") {
        const result = this.findOrdersMembers(val, depth + 1);
        if (result) return result;
      }
    }

    return null;
  }

  /**
   * Extract a JSON array starting at the given index in the script text.
   * Counts brackets to find the matching closing ].
   */
  private extractJsonArray(script: string, startIdx: number): unknown[] | null {
    if (startIdx < 0 || script[startIdx] !== "[") return null;

    let depth = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < script.length; i++) {
      if (script[i] === "[") depth++;
      if (script[i] === "]") {
        depth--;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }

    if (depth !== 0) return null;

    try {
      return JSON.parse(script.substring(startIdx, endIdx)) as unknown[];
    } catch {
      console.warn("[EbaySellerHub] Failed to parse extracted array, length:", endIdx - startIdx);
      return null;
    }
  }

  /**
   * Process an already-extracted members array into EbayScrapedResult.
   */
  private processMembers(
    membersArray: unknown[],
    html: string,
    fallbackTotalCount: number,
    page: number
  ): EbayScrapedResult {
    // Extract total count from HTML "Results: 1-50 of 120"
    const totalCountMatch = html.match(
      /Results:\s*[\d,]+-[\d,]+\s+of\s+([\d,]+)/
    );
    const totalCount = totalCountMatch
      ? parseInt(totalCountMatch[1].replace(/,/g, ""), 10)
      : fallbackTotalCount;
    const totalPages = Math.ceil(totalCount / EBAY_ORDERS_PER_PAGE);

    const orders: EbayScrapedOrder[] = [];

    for (const member of membersArray) {
      const m = member as Record<string, unknown>;
      const orderId = (m.orderId as string) || "";
      if (!orderId) continue;

      const creationDateRaw = extractText(m.creationDate as TextSpanContainer | undefined);
      const statusRaw = extractText(m.orderStatus as TextSpanContainer | undefined);
      const totalRaw = extractText(m.displayTotalPrice as TextSpanContainer | undefined);

      const postalCodeObj = m.postalCode as Record<string, unknown> | undefined;
      const postalCode = extractText(postalCodeObj?.value as TextSpanContainer | undefined);

      const lineItemsRaw = (m.orderLineItems || []) as Array<Record<string, unknown>>;
      const lineItems = lineItemsRaw
        .map((li) => {
          const summary = li.listingSummary as Record<string, unknown> | undefined;
          if (!summary) return null;
          const listingId = (summary.listingId as string) || "";
          const title = extractText(summary.title as TextSpanContainer | undefined);
          const image = summary.image as Record<string, unknown> | undefined;
          const imageUrl = (image?.URL as string) || null;
          const price = parseEbayPrice(totalRaw);
          return { legacyItemId: listingId, title, total: price, _imageUrl: imageUrl };
        })
        .filter(Boolean) as Array<{
          legacyItemId: string;
          title: string;
          total: { value: string; currency: string };
          _imageUrl: string | null;
        }>;

      if (lineItems.length === 0) continue;

      orders.push({
        orderId,
        creationDate: parseEbayDate(creationDateRaw),
        lineItems: lineItems.map((li) => ({
          legacyItemId: li.legacyItemId,
          title: li.title,
          total: li.total,
        })),
        _scraped: {
          status: statusRaw,
          totalDisplay: totalRaw,
          postalCode,
          imageUrl: lineItems[0]?._imageUrl || null,
        },
      });
    }

    return { orders, totalCount, totalPages, page };
  }
}
