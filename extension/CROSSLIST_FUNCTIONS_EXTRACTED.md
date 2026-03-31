# Crosslist Functions & Classes - Complete Extraction

## Key Objects & Functions Found

### 1. `Da` Object - Publishing & Delisting Router

**Location:** Defined as `const Da = { ... }`

**Purpose:** Central router for publishing and delisting across all marketplaces

**Methods:**

#### `Da.post(marketplace, productData, tld, settings)`
- **Parameters:**
  - `l` (marketplace): "vinted", "ebay", "depop", etc.
  - `a` (productData): Product data to publish
  - `i` (tld): Top-level domain (e.g., "co.uk", "com")
  - `e` (settings): User settings object
- **Returns:** `{ success: boolean, product: { id, url }, message?, internalErrors? }`
- **Usage:** Routes to marketplace-specific publish methods
- **Error Handling:** Catches all errors, returns standardized error format

#### `Da.delist(marketplace, listingId, tld, settings)`
- **Parameters:**
  - `l` (marketplace): Marketplace name
  - `a` (listingId): Listing ID to delist
  - `i` (tld): Top-level domain
  - `e` (settings): User settings
- **Returns:** `{ success: boolean, message?, internalErrors? }`
- **Usage:** Routes to marketplace-specific delist methods
- **Special Handling:**
  - Vinted: Auto-retry on code 106 (token expiration)
  - Facebook: Retry with re-initialized IDs

#### Marketplace-Specific Methods:
- `_publishViaVinted(l, a)` - Creates `new pa(tld)`, sets tokens, maps data, posts
- `_publishViaPoshmark(l, a)` - Creates `new la(tld)`, posts
- `_publishViaDepop(l, a)` - Creates `new ca(tld)`, initializes, maps, posts
- `_publishViaMercari(l)` - Creates `new ha`, maps, posts
- `_publishViaGrailed(l, a)` - Creates `new ra(tld)`, maps, posts
- `_publishViaFacebook(l, a)` - Creates `new va(tld)`, initializes IDs, maps, posts
- `_publishViaShopify(l, a)` - Creates `new ga(shopUrl)`, starts session, maps, posts
- `_publishViaWhatnot(l, a)` - Creates `new ba(tld)`, maps, posts

### 2. `da` Function - Marketplace Client Factory

**Location:** Defined as `const da = function(l, a, i) { ... }`

**Purpose:** Factory function that creates marketplace client instances

**Signature:**
```javascript
da = function(marketplace, tld, settings) {
  switch(marketplace) {
    case "poshmark": return new la(tld);
    case "mercari": return new ha;
    case "depop": return new ca(tld);
    case "grailed": return new ra(tld);
    case "vinted": return new pa(tld);  // Vinted class
    case "facebook": return new va(tld);
    case "shopify": return new ga(settings.shopifyShopUrl);
    case "whatnot": return new ba(tld);
    default: throw Error("Marketplace doesn't exist");
  }
}
```

**Key Points:**
- For Vinted: Only takes `tld`, not `settings`
- Returns instantiated marketplace class
- Classes are: `pa` (Vinted), `la` (Poshmark), `ha` (Mercari), `ca` (Depop), `ra` (Grailed), `va` (Facebook), `ga` (Shopify), `ba` (Whatnot)

### 3. Message Handler Functions (Inside `Te`)

#### `s(m, v)` - getListingsFromMarketplace Handler

**Called from:** `chrome.runtime.onMessageExternal` when `action === "getListingsFromMarketplace"`

**Parameters:**
- `m` (params): `{ marketplace, page, nbPerPage, username, userSettings }`
- `v` (sendResponse): Callback function

**Implementation:**
```javascript
async function s(m, v) {
  try {
    var u = m.userSettings && m.userSettings[m.marketplace + "Tld"] 
      ? m.userSettings[m.marketplace + "Tld"] 
      : "com";
    const h = await da(m.marketplace, u, m.userSettings)
      .getListings(m.page, m.nbPerPage, m.username);
    v(h);
    return;
  } catch (o) {
    // Error handling...
    v({ success: false, message: ..., internalErrors: ... });
  }
}
```

**Key Points:**
- Gets TLD from `userSettings[marketplace + "Tld"]` or defaults to "com"
- Calls: `da(marketplace, tld, userSettings).getListings(page, nbPerPage, username)`
- For Vinted: `da('vinted', tld, userSettings)` returns `new pa(tld)`
- Then: `pa.getListings(page, nbPerPage, username)`

#### `d(m, v)` - getListingFromMarketplace Handler

**Called from:** `chrome.runtime.onMessageExternal` when `action === "getListingFromMarketplace"`

**Parameters:**
- `m` (params): `{ marketplace, id, userSettings }`
- `v` (sendResponse): Callback function

**Implementation:**
```javascript
async function d(m, v) {
  try {
    var u = m.userSettings && m.userSettings[m.marketplace + "Tld"] 
      ? m.userSettings[m.marketplace + "Tld"] 
      : "com";
    const h = await da(m.marketplace, u, m.userSettings).getListing(m.id);
    v(h);
    return;
  } catch (o) {
    // Error handling...
  }
}
```

#### `i(m, v, u, o)` - postListingToMarketplace Handler

**Called from:** `chrome.runtime.onMessageExternal` when `action === "postListingToMarketplace"`

**Parameters:**
- `m` (marketplace): Marketplace name
- `v` (product): Product data
- `u` (sendResponse): Callback function
- `o` (settings): User settings

**Implementation:**
```javascript
async function i(m, v, u, o) {
  var h = await Da.post(m, v, o[m + "Tld"], o);
  h.extensionVersion = C.extensionVersion;
  console.log(h);
  u(h);
}
```

#### `e(m, v, u, o)` - updateListingOnMarketplace Handler

**Called from:** `chrome.runtime.onMessageExternal` when `action === "updateListingOnMarketplace"`

**Implementation:**
```javascript
async function e(m, v, u, o) {
  const h = o && o[m + "Tld"] ? o[m + "Tld"] : "com";
  const b = await da(m, h, o).updateListing(v);
  b.extensionVersion = C.extensionVersion;
  console.log(b);
  u(b);
}
```

#### `n(m, v, u, o)` - delistListingFromMarketplace Handler

**Called from:** `chrome.runtime.onMessageExternal` when `action === "delistListingFromMarketplace"`

**Implementation:**
```javascript
async function n(m, v, u, o) {
  var h = await Da.delist(m, v, o[m + "Tld"], o);
  h.extensionVersion = C.extensionVersion;
  console.log(h);
  u(h);
}
```

#### `t(m, v, u)` - checkLoggedIn Handler

**Called from:** `chrome.runtime.onMessageExternal` when `action === "checkLoggedIn"`

**Implementation:**
```javascript
async function t(m, v, u) {
  try {
    const o = u && u[m + "Tld"] ? u[m + "Tld"] : "com";
    const p = await da(m, o, u).checkLogin();
    v(p);
  } catch (o) {
    if (m == "shopify") return v(true);
    v(false);
  }
}
```

### 4. Vinted Class (`pa`) - Key Methods

Based on the user's code snippet and Crosslist usage:

#### Constructor
```javascript
class pa {
  constructor(tld) {
    this._tld = tld;
    this.VINTED_BASE_URL = `https://www.vinted.${tld}`;
    this.VINTED_API = `${this.VINTED_BASE_URL}/api/v2`;
    // ... other properties
  }
}
```

#### `async getListings(page, per_page, username, forceRefresh=false)`
- **Signature:** `getListings(a, i, e, t=!1)`
- **Parameters:**
  - `a` = page number (string or number, defaults to 1)
  - `i` = per_page count (defaults to 96)
  - `e` = username (can be null, will be extracted if not provided)
  - `t` = forceRefresh (boolean, default false)
- **Returns:** `{ products: [...], nextPage: "...", username: "..." }`
- **API Call:** `${this.VINTED_API}/wardrobe/${this.username}/items?page=${n}&per_page=${i ?? 96}&order=newest_first&currency=USD&cond=active`
- **Headers:**
  - `Accept: "application/json, text/plain, */*"`
  - `X-Csrf-Token: this.csrfToken`
  - `X-Anon-Id: this.anonId`
  - `Content-Type: "application/json"`
- **Credentials:** `include`
- **Error Handling:**
  - If status != 200 and not forceRefresh: calls `_setTokens(true)` and retries
  - If no items and not forceRefresh: calls `_setTokens(true)` and retries
  - Filters out closed and draft items
  - Returns products with: `marketplaceId`, `title`, `price`, `coverImage`, `created`, `marketplaceUrl`

#### `async getListing(productId)`
- **Signature:** `getListing(a)`
- **Parameters:** `a` = product ID
- **API Calls:**
  1. First tries: `${this.VINTED_BASE_URL}/api/v2/item_upload/items/${a}`
  2. If 403: Falls back to: `${this.VINTED_BASE_URL}/api/v2/wardrobe/${a}`
- **Returns:** Full product object with all details

#### `async _setTokens(forceRefresh=false)`
- **Signature:** `_setTokens(a=!1)`
- **Purpose:** Extracts CSRF token, anon_id, username from HTML
- **Process:**
  1. Checks `chrome.storage.local` for cached tokens
  2. If not cached or forceRefresh: Fetches `${this.VINTED_BASE_URL}` HTML
  3. Extracts tokens using regex patterns
  4. If tokens not found: Calls `_refreshTokens()` (opens tab)
  5. Stores in `chrome.storage.local`: `{ vintedCsrfToken, vintedAnonId, vintedUsername }`
- **Sets:** `this.csrfToken`, `this.anonId`, `this.username`

#### `async _refreshTokens()`
- **Purpose:** Refreshes tokens by opening a Vinted tab
- **Process:**
  1. Opens `${this.VINTED_BASE_URL}` in background tab
  2. Waits for page to load
  3. Extracts HTML with CSRF tokens
  4. Closes tab
  5. Returns HTML

#### `async checkLogin()`
- **API Call:** `${this.VINTED_BASE_URL}/items/new`
- **Returns:** `true` if logged in, `false` if redirected to signup/session-refresh

#### `_getProductUrl(productId)`
- **Returns:** `https://www.vinted.${this._tld}/items/${productId}`

#### `_packageSizeIdToWeight(packageSizeId)`
- **Purpose:** Converts package size ID to weight object
- **Returns:** `{ value: number, unit: "Grams" | "Ounces" }`
- **Different mappings for UK vs US TLD**

## How to Use These Functions

### For Getting Listings (Our Use Case)

**Option 1: Use Crosslist's Message Handler Pattern**
```javascript
// Send message to Crosslist's handler
chrome.runtime.sendMessage({
  action: "getListingsFromMarketplace",
  params: {
    marketplace: "vinted",
    page: "1",
    nbPerPage: 96,
    username: "username_here",  // optional
    userSettings: {
      vintedTld: "co.uk"  // optional, defaults to "com"
    }
  }
}, (response) => {
  // response = { products: [...], nextPage: "...", username: "..." }
});
```

**Option 2: Access `da` Directly (If Exposed)**
```javascript
// If we expose da globally:
const tld = settings.vintedTld || "com";
const vintedClient = window.wrenlistDa('vinted', tld, settings);
await vintedClient._setTokens();
const result = await vintedClient.getListings('1', 96, username, false);
// result = { products: [...], nextPage: "...", username: "..." }
```

**Option 3: Directly Instantiate Vinted Class (If Exposed)**
```javascript
// If we expose pa class globally:
const vinted = new window.VintedClass('co.uk');
await vinted._setTokens();
const result = await vinted.getListings('1', 96, username, false);
```

## Recommended Solution

Based on the structure, the cleanest approach is:

1. **Expose `da` function globally** from the IIFE
2. **Use it exactly as Crosslist does** in the `s()` function
3. **Call `getListings` with correct signature:** `getListings(page, perPage, username, false)`

This way:
- ✅ No code duplication
- ✅ Uses proven Crosslist code
- ✅ Minimal changes
- ✅ Easy to maintain





