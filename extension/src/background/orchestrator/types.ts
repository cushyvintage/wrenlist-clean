export type SupportedMarketplace =
  | "depop"
  | "vinted"
  | "facebook"
  | "shopify"
  | "etsy";

export interface ListingActionResult {
  success: boolean;
  message?: string;
  type?: string;
  product?: { id?: string | number | null; url?: string | null };
  internalErrors?: string;
  needsLogin?: boolean;
  results?: unknown;
  captchaUrl?: string;
  // Sync-specific properties
  updates?: unknown[];
  changes?: unknown[];
  stats?: { checked: number; updated: number; unchanged: number; failed: number };
  error?: string;
  isAutoSync?: boolean;
  photoUploadWarnings?: string[];
}

export interface PublishOptions {
  tld?: string | null;
  settings?: Record<string, unknown>;
  /** Etsy only: "draft" saves without fee, "publish" lists live ($0.20). */
  publishMode?: "draft" | "publish";
  /**
   * True when this publish/delist was initiated by an explicit user action
   * (clicking Publish in the Wrenlist UI, an item the user just added to
   * the publish queue, etc.). Used by the Vinted client to bypass the
   * inter-tab cooldown that would otherwise block a session refresh and
   * surface as "Vinted session expired" with no recovery.
   *
   * Background sync alarms (vinted_sales_sync, stats refresh, etc.) leave
   * this false so the cooldown still throttles their tab opens.
   */
  userTriggered?: boolean;
  /**
   * Vinted only. Optional callback fired when the extension is about to
   * open a hidden Vinted tab to refresh the session. The publish-queue
   * handler uses this to write a transient "Refreshing Vinted session…"
   * status the user sees while the tab opens + closes.
   */
  onVintedTabFallbackOpen?: () => void | Promise<void>;
}

