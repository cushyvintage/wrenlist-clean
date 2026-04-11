# Changelog

All notable changes to the Wrenlist extension will be documented in this file.
Versioning follows the rules in [VERSIONING.md](./VERSIONING.md).

## [0.9.1] - 2026-04-11

### Changed
- **VintedSalesSync error handling overhaul.** Previously, any failure in
  the token-refresh path threw the same misleading error:
  `"Failed to fetch Vinted tokens via both direct fetch and tab refresh"`.
  That message was a lie for the most common case (hidden-tab cooldown
  short-circuit), and hid the genuinely important case (user logged out of
  Vinted).

  Three new distinct error types now flow through `VintedClient.setTokens`:
  - `VintedCooldownError` — transient, self-heals on next alarm cycle.
    Logged at `info` level as "Skipping this cycle — retry next cycle".
  - `VintedLoggedOutError` — hidden tab landed on Vinted's login page.
    Requires user action. Logged at `warn` level with actionable copy.
  - `VintedTokenFetchError` — both paths genuinely failed (Cloudflare
    challenge, page structure change). Logged at `error` level.

  All three write to `chrome.storage.local._debugLogs` via `remoteLog()`
  so diagnostics survive — the `/api/extension/logs` Vercel endpoint is
  best-effort only (serverless instances are lossy).

## [0.9.0] - 2026-04-11

First build submitted to the Chrome Web Store under the Wrenlist brand.
Version reset from `1.4.0` (inherited from the Crosslist fork) — see
VERSIONING.md for rationale. `0.9.x` is the beta series; `1.0.0` ships once
we're confident in the public flows.

### Changed
- Full rebrand: Crosslist → Wrenlist (manifest name, description, popup title,
  content script match for `*.wrenlist.com`, all user-facing copy)
- `EXTENSION_VERSION` in `src/background/shared/api.ts` now reads from
  `chrome.runtime.getManifest().version` at runtime. Only one place to bump:
  `manifest.json`.
- Web app gained `MIN_EXTENSION_VERSION` gating: old extensions are detected
  as "update required" and the platform-connect banner nudges the user to
  restart Chrome for the auto-update.

### Fixed
- Stale bundle referencing Crosslist strings — forces a clean rebuild before
  reload. See `docs/extension/VERSIONING.md` ("Release workflow").

## [1.1.0] - 2024-11-18

### Added
- **Bulk Import Feature**
  - Checkboxes on listings pages for selecting multiple products
  - Bulk action bar with progress tracking
  - Sequential import processing with automatic delays
  - Success/failure summary after bulk operations

- **Publishing Features (Bidirectional Sync)**
  - `PUBLISH_TO_MARKETPLACE` - Publish products FROM Wrenlist TO marketplaces
  - `UPDATE_MARKETPLACE_LISTING` - Update existing marketplace listings
  - `DELIST_FROM_MARKETPLACE` - Remove products from marketplaces
  - `GET_MARKETPLACE_LISTINGS` - Fetch user's marketplace listings
  - Marketplace-specific data transformation functions

- **Advanced Error Handling**
  - Automatic retry with exponential backoff (1s, 2s, 4s)
  - Error categorization (401, 403, 429, 500+)
  - User-friendly error messages
  - Network error recovery

- **Rate Limiting**
  - Smart throttling: 10 requests per minute
  - Automatic queuing when rate limit reached
  - 500ms delay between requests
  - Intelligent wait time calculation

- **Authentication Integration**
  - Pre-import Wrenlist login verification
  - Auto-redirect to login page on auth failure
  - Graceful fallback if auth check fails
  - 401/403 error detection and handling

- **Image Optimization Hook**
  - `optimizeImages()` function for processing photos
  - URL normalization
  - Ready for compression implementation

### Changed
- Enhanced `importToWrenlist()` with authentication checks
- Improved error handling in API calls
- Added retry logic to all API requests
- Enhanced message listener to support publishing operations

### Technical Details
- Rate limiter: 10 requests/minute window, 500ms delay
- Retry config: 3 max retries, exponential backoff
- Bulk import: 1-second delay between imports
- Auth check: Non-blocking, graceful fallback

## [1.0.0] - 2024-11-18

### Added
- Initial release
- Support for 8 marketplaces (Vinted, eBay, Depop, Poshmark, Mercari, Grailed, Facebook, Etsy)
- One-click import from marketplace product pages
- Smart data extraction (JSON-LD, DOM, embedded state)
- Import history tracking (last 50 imports)
- Statistics dashboard (total imports, success rate)
- Settings page with marketplace enable/disable
- Browser notifications
- Auto-open Wrenlist after import
- CSV export of import history
- Wrenlist branding and styling

### Technical Details
- Based on Crosslist extension architecture
- Manifest V3 compliant
- Content scripts for all supported marketplaces
- Background service worker for API calls
- Chrome storage for settings and history

