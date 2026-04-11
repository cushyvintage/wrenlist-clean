# Wrenlist Extension — Changelog

All notable changes to the Wrenlist Chrome extension.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: [SemVer](https://semver.org/) — see `VERSIONING.md`.

## [0.9.0] — 2026-04-11

First public beta. Submitted to the Chrome Web Store.

### Marketplaces
- Publish, update, and delist flows for Vinted, eBay, Etsy, and Shopify
- Import from Vinted, eBay, Depop, Poshmark, Mercari, Grailed, Facebook
  Marketplace, Etsy, and Whatnot
- Bulk-import support on listings and search pages

### Extension architecture
- MV3 service worker at `dist/background/index.js`, built from TypeScript in
  `src/background/`
- Per-marketplace `client` + `mapper` modules under
  `src/background/marketplaces/`
- Shared helpers (retry, logging, concurrency) in `src/background/shared/`
- Content script injects a "Send to Wrenlist" button on supported product pages

### Integration with Wrenlist
- Queue-based publish/delist pipeline polled on a 1-minute alarm
- Bearer-token auth against `app.wrenlist.com` APIs
- Heartbeat and remote-log endpoints for diagnostics

### Permissions (store submission)
- Narrowed Shopify host patterns to `admin.shopify.com/store/*` and
  `*.myshopify.com/admin/*`
- Removed the wildcard `*.amazonaws.com` host permission; only the single
  image CDN actually used (`grailed-media.s3.amazonaws.com`) remains
- Removed the wildcard `*.vercel.app` entry from `externally_connectable`;
  only `*.wrenlist.com` remains
