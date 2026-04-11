# Chrome Web Store — Submission Notes

Paste these verbatim into the relevant fields during Chrome Web Store
submission. Keep this file in sync with `manifest.json` — any permission
added or removed should have a matching justification here.

---

## Single-purpose description

Wrenlist lets resellers publish, update, and delist their own listings
across Vinted, eBay, Etsy, Shopify, and Depop from a single Wrenlist
inventory. The extension is the user-side automation layer that connects
their marketplace accounts to their Wrenlist account at wrenlist.com.
Wrenlist is built and supported in the UK; the extension supports
marketplace locales that UK sellers commonly use for cross-border sales
(for example eBay .co.uk / .com / .ie / .ca / .com.au, and Vinted UK /
FR / DE / ES / IT).

---

## Permission justifications

### `cookies`
Used only to read the session cookie of the user's own Vinted account
(`*.vinted.*`), so the extension can make authenticated requests to
Vinted's internal API on the user's behalf when they publish, update, or
delist their own listings. Vinted does not offer a public OAuth flow for
third-party tools, so cookie access is the only way to let a logged-in
user automate their own listings. The extension never reads, stores, or
transmits cookies for any other domain.

### `scripting`
Used to inject a small "Send to Wrenlist" button onto product pages of
supported marketplaces, and to programmatically fill the Etsy listing
form during publish/delist operations. All scripts run only on the
marketplace hosts declared in `host_permissions` and only when the user
explicitly initiates an action from the Wrenlist web app or the extension
popup.

### `declarativeNetRequest` + `declarativeNetRequestWithHostAccess`
Used to set the small number of CSRF / Referer / User-Agent headers that
each marketplace's internal API requires when the extension makes
requests on the user's behalf. The full rule set is in
`headerRewrites.json` and is limited to specific marketplace API paths.
No request is blocked, redirected, or modified outside the declared
marketplace hosts.

### `alarms`
Used to run a 1-minute background poll against the user's Wrenlist
queue (`app.wrenlist.com/api/marketplace/publish-queue`) so that publish
and delist jobs dispatched from the web app are picked up and executed
reliably in an MV3 service worker, which is otherwise frequently
suspended.

### `storage`
Used to persist the user's extension preferences, the Wrenlist API base
URL (`wrenlistApiBase`), and short-lived diagnostic logs for
troubleshooting. No marketplace credentials are stored.

### `tabs`
Used to open marketplace pages (e.g. the Etsy listing editor, the
Shopify admin) when a publish or delist action requires interacting with
a page the user does not currently have open, and to close those tabs
when the automation finishes.

### `notifications`
Used to tell the user when a publish, update, or delist action has
completed or failed. Notifications only fire in response to actions the
user initiated.

### Host permissions (per marketplace)
Each declared marketplace host is needed so the extension can make
authenticated requests to that marketplace's internal API on behalf of
the signed-in user to list, update, or delist their own inventory:

- **Vinted** — `*.vinted.co.uk`, `*.vinted.com`, `*.vinted.fr`,
  `*.vinted.de`, `*.vinted.es`, `*.vinted.it`. Wrenlist is built in the
  UK but UK sellers routinely cross-list to Vinted's other European
  locales (FR / DE / ES / IT), so the extension supports the full set
  of Vinted domains a UK seller would realistically use.
- **eBay** — `*.ebay.com`, `*.ebay.co.uk`, `*.ebay.ie`, `*.ebay.ca`,
  `*.ebay.com.au`. Same reasoning: UK resellers commonly list on
  multiple eBay sites for international buyers, and eBay's site-specific
  domains each serve their own internal API, so the extension needs
  host access on each one the user has an account with. The extension
  only touches a site if the user has explicitly connected it in
  Wrenlist.
- **Etsy** — `www.etsy.com`. Etsy serves every locale from one domain.
- **Shopify** — `admin.shopify.com/store/*` and `*.myshopify.com/admin/*`
  for the user's own store admin.
- **Depop** — `*.depop.com`.
- **Facebook Marketplace** — `*.facebook.com` and `upload.facebook.com`
  so the extension can post a listing to the user's own Facebook
  Marketplace account and upload its images. The extension only runs
  on Facebook when the user has explicitly connected Facebook in
  Wrenlist and triggered a publish/delist action; it does not read
  the news feed, messages, profile, or any other Facebook surface.
- **Wrenlist** — `*.wrenlist.com` is the user's own Wrenlist dashboard,
  which is how the extension receives publish/delist jobs and reports
  results back.

The extension does not read or modify any page outside these hosts.

---

## Data handling

- **User data collected**: Wrenlist account identifier (bearer token,
  held in extension storage only for the duration of a session) and
  listing metadata that the user has explicitly chosen to publish.
- **Third-party transmission**: none. The extension only talks to
  marketplace APIs the user is already signed into, and to
  `app.wrenlist.com` (the user's own Wrenlist dashboard).
- **Sold, rented, or shared**: no user data is ever sold, rented, or
  shared with third parties.
- **Remote code**: the extension does not fetch or execute any remote
  JavaScript. All logic ships inside the published bundle.

---

## Testing instructions for the reviewer

1. Create a free account at https://app.wrenlist.com/register.
2. Install the extension and click its toolbar icon — the popup will
   prompt you to sign in to Wrenlist.
3. In the Wrenlist web app, go to **Platform connections** and connect
   at least one marketplace (Vinted is the simplest — just log in to
   your Vinted account in the same browser window).
4. Go to **Add find**, upload a photo, fill in basic details, select a
   marketplace, and click **Publish**. The extension will pick the job
   up within ~60 seconds, open the marketplace if needed, and report
   back when the listing is live.
5. To test delist, go to **Finds**, open a listed find, and click
   **Delist**. The extension will remove it from the marketplace.

A test Wrenlist account with pre-connected marketplaces can be provided
on request — contact admin@wrenlist.com.
