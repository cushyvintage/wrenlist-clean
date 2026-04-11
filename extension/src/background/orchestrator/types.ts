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
}

