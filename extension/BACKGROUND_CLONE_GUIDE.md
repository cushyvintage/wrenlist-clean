# background.js cloning reference

This document captures the structure of `3.7.8_0/background.js`, the shared utilities it hides, the marketplace-specific modules bundled inside it, the runtime wiring, and a practical strategy for transplanting the code into `wrenlist-skylark-extension` without breaking functionality.

---

## 1. Section map (current Crosslist bundle)

| Order | Region | Notes |
| --- | --- | --- |
| 1 | Wrapper + helper shims | Minified IIFE `var background=function(){...}` plus helper factories (`J`, `y`, etc.). |
| 2 | Enums | `g` (condition), `k` (color) enumerations used across marketplaces. |
| 3 | Utility object `C` | Crosslist domain, version, marketplace URL helper, throttling helpers, logging endpoints, image helpers. |
| 4 | Static datasets | Country list `ka`, Depop brand list `ee`, Mercari brand list `de`, Shopify metafield descriptors `ta/na`, etc. |
| 5 | Marketplace pairs (mapper + client) | In order: Grailed (`Ca` + `ra`), Depop (`Aa` + `ca`), Poshmark (`wa` + `la`), Facebook (`ia` + `va`), Mercari (`Ra` + `ha`), Vinted (`ya` + `pa`), Shopify (`sa` + `ga`), Whatnot (`Ea` + `pe` + `ba`). |
| 6 | Aggregators | `const Da = { post, delist, _publishVia* }` plus factory `da()` that instantiates the right client for shared operations (`checkLogin`, `getListings`, etc.). |
| 7 | Runtime bootstrap | `Te = J(() => { ... })` registers `chrome.runtime` listeners, background heartbeat, update handler, and exports `background`. |

---

## 2. Shared utilities & data

### Helper object `C`

| Property/Method | Description |
| --- | --- |
| `domain`, `extensionVersion` | Used when logging to Crosslist backend or reporting version to content scripts. |
| `marketplaceUrls(marketplace, payload)` | Maps marketplace keys to listing URLs; injects category/condition parameters for eBay. |
| `wait(ms)` | Promise-based `setTimeout`, reused by retry helpers. |
| `log`, `logFilled` | POSTs diagnostics (`/Api/Log/Log`, `/Api/Log/LogFilled`) with payload snapshot + extension version. |
| `getLoggingInfo`, `checkAlreadyExecuted(key, fn, ttlSeconds?)` | Prevents repeated logging; uses `chrome.storage.local` to memoize `key`. |
| `getProductMedia(productId, limit?, cropSquare?)` / `getProductMediaForMarketplace(productId, marketplace)` | Pulls base64 images from Crosslist API and converts them to `File` objects via `dataURLtoFile`. |
| `chunkConcurrentRequests(tasks, concurrency)` / `chunkConcurrentRequestsWithRetry(tasks, concurrency)` | Controlled parallel execution for uploading images to marketplace APIs. |
| `retryOperation(task, delayMs, retries)` | Linear retry that chains through `wait`. |
| `openTab(url, focusTab?)` | Relays to background open-tab action (used for Shopify token refresh). |

### Global enums and datasets

- `g` – canonical condition tokens (`NewWithTags`, `Fair`, etc.).
- `k` – canonical colors used by mapping layers (Grailed, Whatnot, Shopify).
- `ka` – country list surfaced when marketplaces need shipping origin choices (Facebook, Whatnot).
- `ee` – Depop brand catalog (roughly 1,500 entries) consumed by `Aa`.
- `de` – Mercari brand catalog (10k+ entries) consumed by `Ra`.
- `ta` / `na` – Shopify metafield definition templates (size, color) referenced by `sa.ensureMetafieldDefinitions`.
- Embedded GraphQL fragments (`he`, `ue`, `ve`, `ye`, `ce`, `re`, `le`, etc.) live directly above `class ga` and `class ba`.

These structures are pure data — when cloning, you can lift them into standalone JSON modules to keep the background worker readable.

---

## 3. Marketplace modules (mapper + client inventory)

| Marketplace | Mapper class (Crosslist → marketplace payload) | Client class (auth + API calls) | Responsibilities & dependencies |
| --- | --- | --- | --- |
| Grailed | `Ca` | `ra` | Mapper normalizes condition, color, and images. Client handles CSRF token extraction (`getCSRFToken`), address verification, log throttling, listing CRUD via `grailed.com/sell` endpoints. |
| Depop | `Aa` | `ca` | Mapper enforces TLD-specific currencies/countries, normalizes brand IDs (via `ee`), remaps photos. Client bootstraps via `chrome.cookies`, stores `x-px`/bearer token, uploads images to `api/v2/pictures`, and posts drafts. |
| Poshmark | `wa` | `la` | Mapper handles boutique flags, brand validation, and image upload concurrency. Client scrapes CSRF/session IDs from HTML, keeps cached brand/category metadata, posts via `/listing/create`. |
| Facebook Marketplace | `ia` | `va` | Mapper builds listing payload, image upload tasks, shipping weights, and price normalization per locale. Client fetches hidden form params (`fb_dtsg`, `target_id`, `comet_req`), caches them, and retries POSTs when tokens expire. |
| Mercari | `Ra` | `ha` | Mapper picks color/condition, carriers, shipping weight, and brand IDs (`de`). Client hits `/v1/initialize`, stores `csrf` + `accessToken`, and uses `apollo` GraphQL endpoints for listing CRUD and carrier lookup. |
| Vinted | `ya` | `pa` | Mapper enforces package sizing, MLS/brand lookups, currency per TLD, and ensures description/title meet capitalization rules. Client juggles auth tokens + `Sec-CH-UA` hints, sets declarativeNetRequest rules for CORS, uploads media, and calls `/api/v2/items`. |
| Shopify | `sa` | `ga` | Mapper bridges Crosslist product data to Shopify GraphQL mutations, ensures metafields, fetches location IDs, and handles staged uploads. Client manages embedded admin session (`_startSession`, `_refreshTokens`), caches tokens in `chrome.storage`, handles CSRF retries, and wraps GraphQL CRUD (Create/Update/Delete, inventory queries). |
| Whatnot | `Ea` (export) & `pe` (import) | `ba` | Export mapper (`Ea`) stitches attributes (condition mappings, clothing type, color, brand) and selects shipping profiles; import mapper (`pe`) converts Whatnot listings back to Crosslist format. Client logs in via GraphQL, uploads media, fetches live shows, and handles listing mutations. |

Each pair follows the same pattern: mapper consumes Crosslist/Wrenlist product DTOs → returns marketplace payload; client owns authentication, retries, and HTTP calls.

### Current Skylark module inventory

| Marketplace | Mapper (TS) | Client (TS) | Notes |
| --- | --- | --- | --- |
| Grailed | `src/background/marketplaces/grailed/mapper.ts` | `src/background/marketplaces/grailed/client.ts` | Mapper normalizes colors/conditions and uploads photos through the client; client handles CSRF cookies, address lookup, and listing CRUD. |
| Depop | `src/background/marketplaces/depop/mapper.ts` | `src/background/marketplaces/depop/client.ts` | Mapper enforces TLD currencies, brand IDs, parcel sizing, and media upload concurrency; client bootstraps via cookies, exposes `uploadImage`, postal address helpers, and listing CRUD. |
| Poshmark | `src/background/marketplaces/poshmark/mapper.ts` | `src/background/marketplaces/poshmark/client.ts` | Client owns draft creation, mapper injection, CSRF/session caching, brand metadata, save + publish steps, update/delist, and wardrobe ingestion. |
| Facebook | `src/background/marketplaces/facebook/mapper.ts` | `src/background/marketplaces/facebook/client.ts` | Client caches comet parameters + shipping carriers, provides `bootstrap()` to refresh tokens, and exposes mapper helpers (`mapProduct`) plus listing CRUD. |
| Mercari | `src/background/marketplaces/mercari/mapper.ts` | `src/background/marketplaces/mercari/client.ts` | Mapper builds payloads with carrier math and brand lookups; client wraps GraphQL endpoints for create/update/delist/import flows. |
| Vinted | `src/background/marketplaces/vinted/mapper.ts` | `src/background/marketplaces/vinted/client.ts` | Mapper requests brand/package metadata and uploads media via the client; client now exposes `bootstrap()` for token refresh, declarativeNetRequest headers, and full listing CRUD. |
| Shopify | `src/background/marketplaces/shopify/mapper.ts` | `src/background/marketplaces/shopify/client.ts` | Mapper handles staged uploads + metafields; client manages admin session, staged uploads, GraphQL mutations, and now offers `bootstrap()` for CSRF resets. |
| Whatnot | `src/background/marketplaces/whatnot/mapper.ts` | `src/background/marketplaces/whatnot/client.ts` | Mapper stitches attributes/live-show metadata while the client orchestrates GraphQL auth, staged uploads, and listing lifecycle. |

All marketplaces expose a simple factory (see each `index.ts`) that returns `{ client, mapper, mapProduct }`, making it trivial for orchestrators to request a payload and trigger listing CRUD.

A new orchestrator lives at `src/background/orchestrator/publisher.ts`. It mirrors the legacy `Da.post`/`Da.delist` helpers with typed `publishToMarketplace` and `delistFromMarketplace` functions, reuses the new factories, and retains marketplace-specific retries (Vinted token refresh, Facebook parameter cache resets, Shopify CSRF restart). Companion module `src/background/orchestrator/marketplaceActions.ts` covers the `da(...)` factory responsibilities (`checkLogin`, `updateListing`, `getListings`, `getListing`) so runtime wiring can compose whichever action is needed without reimplementing mapping logic.

---

## 4. Runtime flow

- **Service orchestrator (`Da`)** – exposes `post`, `delist`, and `_publishVia*` helpers for every marketplace. Each helper instantiates the marketplace client, invokes the mapper, and wraps token refresh logic (Shopify CSRF, Vinted token 106 errors, Facebook parameter cache).

  - **Skylark status:** `src/background/orchestrator/publisher.ts` now replaces the `post`/`delist` logic with TypeScript functions that hydrate the modular clients, call their mappers, and reproduce the original retry semantics. Runtime wiring (`chrome.runtime` handlers) will call into these helpers next.
- **Client factory (`da`)** – given a marketplace slug + TLD (plus settings when needed) returns the appropriate client for read/update flows (`checkLogin`, `updateListing`, `getListings`, `getListing`, `delistListing`).
- **Background listeners (`Te` export)**:
  - `chrome.runtime.onStartup` & `setInterval(getPlatformInfo, 20s)` keep the service worker alive.
  - `chrome.runtime.onMessageExternal` accepts the Crosslist content-script API (`checkLoggedIn`, `postListingToMarketplace`, `updateListingOnMarketplace`, `getListingsFromMarketplace`, `getListingFromMarketplace`, `delistListingFromMarketplace`, `openTab`, `getVersion`, `requestUpdate`).
  - `chrome.runtime.onMessage` handles internal requests (`getTabId`, `openTab`).
  - `chrome.runtime.onUpdateAvailable` triggers auto reload for hot updates.
- **Request lifecycle**: content script → `chrome.runtime.sendMessage` → background dispatch selects `Da` or factory `da` helper → mapper + client execute → response augmented with `extensionVersion` and posted back.

---

## 5. Cloning strategy for `wrenlist-skylark-extension`

1. **Prettify & split before porting**  
   - Run a formatter (e.g., `npx prettier --parser babel`) against a copy of `3.7.8_0/background.js` to introduce line breaks.  
   - Split major sections into modules under `wrenlist-skylark-extension/background/` (e.g., `enums.ts`, `shared/utils.ts`, `marketplaces/grailed/{mapper,client}.ts`). Keeping parity with the section map makes regression testing manageable.

2. **Extract shared helpers**  
   - Port `const C` into a dedicated module (`shared/crosslistApi.ts`) and replace direct `chrome` calls with thin adapters so the same functions can be unit tested.  
   - Move large datasets (`de`, `ee`, `ka`, metafield templates) into JSON files that can be imported on demand to avoid inflating the background bundle and to make diffing easier.

3. **Modularize marketplace implementations**  
   - For each marketplace pair, create two files (`mapper.ts`, `client.ts`) exporting named classes/functions with descriptive names.  
   - Keep constructor signatures identical (mapper receives client + TLD; client receives TLD/settings). This guarantees `Da` and `da` can be rehydrated without behavioural changes.  
   - While porting, add TypeScript interfaces for the Crosslist product DTOs so the compiler can verify field usage (size arrays, dynamic properties, etc.).

4. **Rebuild orchestrators around dependency injection**  
   - Recreate `Da` and `da` using maps (`const POST_HANDLERS = { grailed: ... }`).  
   - Inject the shared helper module (`CrosslistApi`) so retry/logging logic stays centralized.  
   - Mirror the external message contract so existing content scripts (or the new Skylark popup) can reuse the same actions without rework.

5. **Wire background runtime with explicit handlers**  
   - Replace inline `switch` statements with a dictionary of handlers keyed by `action`.  
   - Surface TypeScript types for every request/response payload and ensure each response appends `extensionVersion` (pulled from `manifest.json`).  
   - Keep the startup keep-alive heartbeat and update handler to match Chrome MV3 requirements.

6. **Testing & validation**  
   - Unit-test each mapper (feed sample Wrenlist product JSON → expect marketplace payload) and each client method (mock fetch, ensure tokens flow).  
   - Write integration smoke tests per marketplace using recorded fixtures (especially for token refresh flows: Shopify CSRF, Vinted token 106, Facebook parameter cache).  
   - Verify background actions manually via `chrome.runtime.sendMessage` scaffolding before reconnecting to the actual content script.

Following these steps preserves the proven Crosslist behaviours (retry logic, CSRF refresh, marketplace-specific details) while giving the Skylark extension maintainable modules and modern documentation.

