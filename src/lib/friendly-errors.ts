/**
 * Maps raw marketplace error messages to user-friendly, actionable messages.
 * Raw errors are preserved in the DB for debugging; this function is used
 * only at render time in the UI.
 */

type ErrorRule = {
  /** Substrings to match (case-insensitive) against the raw message */
  match: string[]
  /** Friendly message template — {marketplace} is replaced at runtime */
  message: string
}

const RULES: ErrorRule[] = [
  // --- Auth / session ---
  {
    match: ['not logged in', 'needslogin', 'csrf', 'token expired', 'session expired', '401', 'unauthorized'],
    message: 'Your {marketplace} session expired. Please log back in on the Platform Connect page.',
  },
  {
    match: ['403', 'forbidden'],
    message: 'Access denied on {marketplace}. You may need to reconnect your account on Platform Connect.',
  },

  // --- Validation / missing fields ---
  {
    match: ['shipping weight is required', 'weight is required'],
    message: 'Shipping weight is required for {marketplace}. Please add a weight in the item details.',
  },
  {
    match: ['item length is missing', 'item width is missing', 'item height is missing', 'item specific'],
    message: '{marketplace} requires additional item details for this category. Please edit the listing and add the missing fields.',
  },
  {
    match: ['size is invalid', 'size is not valid', 'invalid size'],
    message: "The selected size isn't available on {marketplace}. Try a different size or remove the size field.",
  },
  {
    match: ['catalog_id', 'catalog'],
    message: 'Could not match category on {marketplace}. Try selecting a different category.',
  },
  {
    match: ['producttype'],
    message: 'Product type is missing or invalid. Select a category for this item on {marketplace}.',
  },
  {
    match: ['json validation error', 'jsonvalidationerror'],
    message: 'Missing required fields for {marketplace}. Check that category, size, and condition are set.',
  },
  {
    match: ['input data is invalid', 'inputdatainvalid'],
    message: '{marketplace} rejected the listing data. Check item specifics and category.',
  },

  // --- Duplicates ---
  {
    match: ['duplicate', 'already been taken', 'already exists'],
    message: 'A listing with this name already exists on {marketplace}. Try a different title.',
  },

  // --- Rate limits ---
  {
    match: ['rate limit', '429', 'too many requests'],
    message: 'Too many requests to {marketplace}. Please wait a few minutes and try again.',
  },

  // --- Network ---
  {
    match: ['fetch failed', 'networkerror', 'network error', 'timeout', 'econnrefused', 'enotfound'],
    message: 'Network error connecting to {marketplace}. Please check your internet connection.',
  },

  // --- Generic HTTP ---
  {
    match: ['listing request failed: 400'],
    message: 'Publishing to {marketplace} failed. Please check your listing details and try again.',
  },
  {
    match: ['422'],
    message: '{marketplace} rejected the listing. Check that all required product fields are filled in.',
  },
  {
    match: ['500', 'internal server'],
    message: 'Something went wrong on {marketplace}. Please try again in a moment.',
  },
]

const CAPITALIZE: Record<string, string> = {
  ebay: 'eBay',
  vinted: 'Vinted',
  etsy: 'Etsy',
  depop: 'Depop',
  shopify: 'Shopify',
  facebook: 'Facebook',
  poshmark: 'Poshmark',
  mercari: 'Mercari',
  whatnot: 'Whatnot',
  grailed: 'Grailed',
}

/**
 * Convert a raw error string into a user-friendly message.
 * Returns the original (truncated to 200 chars) if no rule matches
 * and the message doesn't look overly technical.
 */
export function friendlyError(marketplace: string, raw: string): string {
  const lower = raw.toLowerCase()
  const label = CAPITALIZE[marketplace.toLowerCase()] ?? marketplace

  for (const rule of RULES) {
    if (rule.match.some((m) => lower.includes(m))) {
      return rule.message.replace('{marketplace}', label)
    }
  }

  // If the raw message looks overly technical, give a generic fallback
  if (raw.length > 200 || /List\(|Error\(|exception|stack|trace/i.test(raw)) {
    return `Publishing to ${label} failed. Please check your listing details and try again.`
  }

  // Short, human-readable messages pass through as-is (truncated)
  return raw.length > 200 ? raw.slice(0, 197) + '...' : raw
}
