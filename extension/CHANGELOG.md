# Changelog

All notable changes to the Wrenlist Skylark extension will be documented in this file.

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

