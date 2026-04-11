# Wrenlist Chrome Extension

Marketplace automation companion for [Wrenlist](https://app.wrenlist.com) —
the inventory system for UK resellers.

The extension lets you publish, update, and delist listings on marketplaces
that don't offer a public API, directly from your Wrenlist dashboard. You
stay signed into each marketplace in your browser; Wrenlist sends the work
to the extension; the extension drives the marketplace on your behalf.

## Supported marketplaces

These are the platforms available on the
[**Platform connect**](https://app.wrenlist.com/platform-connect) page of
the Wrenlist web app:

| Marketplace | Scope | How it connects |
|---|---|---|
| **Vinted** | UK (`vinted.co.uk`) | Extension reads your logged-in session |
| **eBay** | UK + IE | OAuth via eBay API — no extension needed |
| **Etsy** | Global | Extension drives the listing form |
| **Depop** | Global | Extension reads your logged-in session |
| **Facebook Marketplace** | UK | Extension reads your logged-in session |
| **Shopify** | Any store | Extension drives the embedded admin |

eBay is the only marketplace handled server-side via an official API; the
extension is optional for eBay but required for the other five.

## What the extension does

- **Publish** — picks up publish jobs from your Wrenlist queue every minute
  and executes them (form fill, image upload, category select, submit)
- **Delist** — removes listings when you mark items sold or delisted in
  Wrenlist
- **Update** — syncs title, description, price, and metadata changes from
  Wrenlist to the live listing
- **Import** — one-click button on marketplace product pages to pull a
  listing into your Wrenlist inventory

All actions are triggered from the Wrenlist web app, a product page button,
or the extension popup. The extension never acts autonomously on your
accounts.

## Installation

Install from the [Chrome Web Store](https://chromewebstore.google.com/)
(listing pending first review).

For development:

```
cd extension
npx tsc           # build TypeScript source to dist/
```

Then in `chrome://extensions`: enable Developer mode → **Load unpacked** →
select the `extension/` folder.

## Architecture

```
extension/
├── manifest.json         # MV3 manifest, narrowed permissions
├── marketplaceRules.json # DNR rules for CSRF/referer/UA headers
├── popup.html + popup.js # Toolbar popup UI
├── options.html + options.js
├── content-scripts/
│   └── content.js        # Injects "Send to Wrenlist" button on product pages
├── icons/                # 16/32/48/128 px
└── src/background/       # TypeScript source — compiled to dist/ via tsc
    ├── index.ts          # Service worker entry, queue polling, messaging
    ├── shared/           # API client, enums, GraphQL helpers
    ├── data/             # Brand dropdown data
    ├── orchestrator/     # Publish/update/delist dispatch
    └── marketplaces/     # One folder per marketplace: client + mapper
```

The MV3 service worker polls `app.wrenlist.com/api/marketplace/publish-queue`
on a one-minute alarm and executes any pending jobs using the appropriate
marketplace client.

## Docs

- [CHANGELOG.md](CHANGELOG.md) — release history
- [VERSIONING.md](VERSIONING.md) — semver policy and release workflow
- [STORE-LISTING-NOTES.md](STORE-LISTING-NOTES.md) — Chrome Web Store
  submission copy and permission justifications

## License

Copyright © Wrenlist. All rights reserved.
