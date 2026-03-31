export type SupportedMarketplace =
  | "grailed"
  | "poshmark"
  | "depop"
  | "mercari"
  | "vinted"
  | "facebook"
  | "shopify"
  | "whatnot"
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
}

export interface PublishOptions {
  tld?: string | null;
  settings?: Record<string, unknown>;
}

