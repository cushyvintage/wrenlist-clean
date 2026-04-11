# Extension Versioning Guide

> For the next developer. If you're about to bump a version or cut a release,
> read this first. If you're debugging why an old extension is misbehaving in
> production, also read this first.

## Starting point

Wrenlist's first Chrome Web Store submission is **`0.9.0`** (2026-04-11). The
previous `1.4.0` was a holdover from the Crosslist fork and never shipped to
real Wrenlist users, so we reset the version rather than carrying inherited
numbering.

**`0.9.x`** is the public beta series. We graduate to **`1.0.0`** when:

1. At least two weeks of real users have been on `0.9.x` without a critical
   regression in the publish/delist flows.
2. The core marketplaces (Vinted, eBay, Etsy, Shopify) are stable end-to-end.
3. We're ready to commit to a deprecation cycle before any breaking change to
   the extension ↔ web-app contract.

Don't jump to `1.0.0` for marketing reasons. Version numbers are a debugging
tool first, a marketing asset second.

## Scheme

We use [semver](https://semver.org/) adapted for a browser extension:

```
MAJOR.MINOR.PATCH
  │     │     └─ bug fixes, copy tweaks, no behaviour change  (0.9.0 → 0.9.1)
  │     └─────── new features, non-breaking                    (0.9.0 → 0.10.0)
  └───────────── breaking change to the extension/web contract (0.9.0 → 1.0.0)
```

### What counts as a "breaking change" for this extension specifically

Bump **MAJOR** (or at least MINOR, with a min-version bump — see below) when
any of these change:

- **Manifest `permissions` or `host_permissions`** — Chrome disables the
  extension until users re-consent. Always announce in the popup/options page.
- **Message shape between the extension and `wrenlist.com`** — anything sent
  via `chrome.runtime.sendMessage`, `externally_connectable`, or the
  publish/delist queue endpoints.
- **`chrome.storage.local` schema** — if the key names or shape change,
  write a migration (see "Storage migrations" below), never just change it.
- **Content-script injection targets** — adding or removing a marketplace
  match pattern.
- **API endpoint contracts on the Wrenlist side** that the extension calls —
  e.g. `/api/marketplace/publish-queue`, `/api/extension/logs`.

Non-breaking changes (bump MINOR or PATCH):

- A new marketplace integration where old extensions simply don't participate.
- Form-fill selector fixes for a marketplace that changed its DOM.
- Logging, telemetry, copy tweaks.

## Single source of truth

**Only bump `extension/manifest.json`.** Everything else derives from it:

- `extension/src/background/shared/api.ts` exports `EXTENSION_VERSION` by
  reading `chrome.runtime.getManifest().version` at runtime. Do not
  reintroduce a hardcoded string there.
- The Chrome Web Store reads the version from `manifest.json` in the uploaded
  `.zip`. Do not override it in the dashboard.
- The web-app hook `useExtensionInfo` receives the version from the
  extension's `ping` response — it's the manifest value, round-tripped.

If you find yourself typing a version number in more than one file, stop and
wire it to the manifest instead.

## Release workflow

From a clean working tree on `main`:

1. **Decide the bump.** Look at what changed since the last tag
   (`git log ext-v0.9.0..HEAD -- extension/`). Pick MAJOR/MINOR/PATCH using
   the rules above.
2. **Update `extension/manifest.json`** — `"version": "0.9.1"` (one line).
3. **Prepend an entry to `extension/CHANGELOG.md`**. One section per version,
   newest first. Cover: Added / Changed / Fixed / Removed / Security.
4. **If the change is breaking or requires a newer extension on the server
   side, also bump `MIN_EXTENSION_VERSION`** in
   `src/hooks/useExtensionInfo.ts`. This is how the web app tells old
   installs "you're out of date" — see next section.
5. **Rebuild the bundle.** Do not reuse an old `extension/dist/`. Stale
   bundles are how the Crosslist→Wrenlist rename initially shipped half-done.
   ```
   cd extension
   rm -rf dist
   npm run build     # whatever build script compiles src/ → dist/
   ```
6. **Load the unpacked extension locally** (chrome://extensions → Load
   unpacked → select `extension/`) and smoke-test: sign in, ping from the
   web app, run one publish + one delist on a non-production listing.
7. **Commit, tag, and push.**
   ```
   git add extension/manifest.json extension/CHANGELOG.md \
           src/hooks/useExtensionInfo.ts    # if MIN_EXTENSION_VERSION bumped
   git commit -m "ext: release v0.9.1 — <summary>"
   git tag ext-v0.9.1
   git push origin main ext-v0.9.1
   ```
8. **Zip and upload to the Chrome Web Store.**
   ```
   cd extension
   zip -r ../wrenlist-ext-v0.9.1.zip . -x "src/*" "node_modules/*" "*.md"
   ```
   Upload via the Chrome Web Store developer dashboard. Fill in the "what's
   new" field — copy from the CHANGELOG entry.
9. **Use a staged rollout** for anything touching publish/delist or auth.
   Start at 10%, watch `/api/extension/logs` and Supabase `ebay_sync_log` /
   error rates for 24h, then move to 50%, then 100%.

Tags are how we rebuild the exact bundle a user has. Never skip step 7.

## Min-version gating (how the web app refuses old extensions)

`src/hooks/useExtensionInfo.ts` exports `MIN_EXTENSION_VERSION`. The hook
returns `isOutdated: true` when the extension pings back a version below it.

Consumers (listings page, platform-connect, `finds/[id]`) should treat
`isOutdated` the same as `detected === false` for publish/delist actions and
show an upgrade nudge. `ExtensionBanner` already renders the "update
required" state when it receives `isOutdated={true}`.

### When to bump `MIN_EXTENSION_VERSION`

- Shipped an extension release that depends on a new API contract? Wait until
  that extension has been live in the Web Store for at least 24 hours (so
  auto-updates have propagated), then bump `MIN_EXTENSION_VERSION` in the web
  app and deploy. Old installs will now see "update required".
- **Never** bump `MIN_EXTENSION_VERSION` ahead of publishing the new
  extension — it would lock out users who haven't auto-updated yet.

### Why this matters

Chrome auto-updates extensions every ~5 hours, but users who don't restart
Chrome can lag for days. Without min-version gating you end up with bugs like
"12% of users can't publish to Vinted because their extension is sending the
old message shape and we can't roll forward without breaking them."

## Storage migrations

`chrome.storage.local` is our on-device DB. Treat it like Postgres: never
change a column's meaning without a migration.

Pattern (add when we first need one):

```ts
const STORAGE_VERSION = 2
const MIGRATIONS: Record<number, (state: any) => any> = {
  2: (state) => ({ ...state, selectedMarketplaces: state.platforms ?? [] }),
}

async function migrateStorage() {
  const { _storageVersion = 1, ...state } = await chrome.storage.local.get(null)
  let current = _storageVersion
  let next = state
  while (current < STORAGE_VERSION) {
    current += 1
    next = MIGRATIONS[current](next)
  }
  await chrome.storage.local.set({ ...next, _storageVersion: STORAGE_VERSION })
}
```

Run `migrateStorage()` at service-worker startup, before any other handler
touches storage. If you reshape stored data without a migration, you will
brick existing users on their next extension restart.

## Breaking the rules (emergency hotfix)

If you need to ship a fix to production fast (e.g. Vinted changed a selector
and nobody can publish):

1. Patch bump (`0.9.2` → `0.9.3`), one-line changelog entry.
2. Skip staged rollout — push to 100% immediately. This is the one case where
   staged rollout is worse than speed.
3. File a follow-up ticket to add a regression test or DOM selector guard so
   it doesn't happen again.

Everything else (breaking changes, migrations, manifest permissions) gets the
full workflow even under pressure. The 30 minutes saved is not worth the
class of bugs those steps prevent.

## Quick reference

| File                                         | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `extension/manifest.json`                    | Canonical version — edit here                     |
| `extension/src/background/shared/api.ts`     | Reads version from manifest at runtime            |
| `extension/CHANGELOG.md`                     | Human-readable release notes                      |
| `src/hooks/useExtensionInfo.ts`              | Web-app min-version gate + detection              |
| `src/components/platform-connect/ExtensionBanner.tsx` | "Update required" UI                     |
| `ext-vX.Y.Z` git tags                        | Exact bundle reproducibility                      |
