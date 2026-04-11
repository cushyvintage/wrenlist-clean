# Chrome Web Store submission — new-session handoff prompt

Paste the section below into a fresh Claude Code session at the project
root (`/Volumes/ExternalAI/github/wrenlist-clean`). Everything the next
session needs to ship the extension is in there.

---

## Paste this into a new session

I'm shipping the Wrenlist Chrome extension to the Chrome Web Store for the
first time. I've already paid for the developer account. I need you to help
me get from "code ready" to "extension live in the store, staged to 10%".

### Where we are right now (do not re-litigate this)

- Repo: `/Volumes/ExternalAI/github/wrenlist-clean`
- Extension source: `extension/src/`
- Extension version: `0.9.2` — bumped from a legacy Crosslist `1.4.0`
  through `0.9.0` → `0.9.1` → `0.9.2`. Version history and rationale is
  in `extension/CHANGELOG.md`. Release workflow is in
  `extension/VERSIONING.md` — read it first, it answers most setup
  questions.
- Latest main commit for the extension: run `git log --oneline -20
  extension/ | head` to see.
- Extension is currently **loaded unpacked** in my local Chrome and works
  end-to-end: v0.9.2 is detected by the web app at
  `app.wrenlist.com/platform-connect`, banner shows green "connected",
  "Download debug logs" button renders, eBay is connected as
  `cushyvintage`.
- Web app is already deployed to Vercel with `MIN_EXTENSION_VERSION =
  '0.9.0'` — the gate is inert for now and that's correct. Don't touch
  it unless the Web Store release itself requires a bump.
- **Three domains** (read `CLAUDE.md` top section if unsure):
  `wrenlist.com` = marketing (redirects to /login),
  `app.wrenlist.com` = the actual app, `api.wrenlist.com` = Supabase.
  For testing, always use `app.wrenlist.com`.
- Old Crosslist extension has been removed from my Chrome. Do not bring
  it back.

### What I need you to do

**Phase 1 — inventory and gap analysis (start here)**

Do NOT generate anything yet. First, figure out what copy, imagery, and
legal assets I already have vs. what's missing for a Chrome Web Store
submission. The Chrome Web Store developer console requires all of
these; I want to know which I can reuse from the repo vs. which we need
to create:

1. **Store listing copy** — title, short description (~132 chars),
   full detailed description. Grep the repo for existing drafts: check
   `extension/`, `docs/`, `public/`, `.claude/`, README files, and my
   memory at `/Users/dominiccushnan/.claude/projects/-Volumes-ExternalAI-github-wrenlist-clean/memory/*.md`.
   I did copy work in earlier sessions — find it. Do not rewrite if a
   draft exists.
2. **Icon (128×128)** — should already be at
   `extension/icons/icon128.png` (wren on cream background). Verify it
   exists and is RGBA PNG.
3. **Store screenshots** — Chrome requires at least 1, ideally 3–5, at
   1280×800 or 640×400. Check if any exist in the repo. If not, propose
   a minimal capture plan using the real running app (Chrome MCP or
   computer-use screenshots of `app.wrenlist.com`).
4. **Promotional tile** — optional but highly recommended: 440×280
   small tile. Large tile 920×680 and marquee 1400×560 are fully
   optional. Check if `public/wrenlist-logo.png` or similar can be
   composited into these.
5. **Privacy policy URL** — required. Find if `app.wrenlist.com/privacy`
   exists as a route. Grep `src/app` for a privacy policy page.
6. **Host permissions justification** — the extension has content
   scripts on a lot of marketplace domains (`vinted.*`, `ebay.*`,
   `etsy.com`, `shopify.com`, `facebook.com`, etc.). Chrome Web Store
   review will ask why each is needed. Read
   `extension/manifest.json` and draft a 1–2 sentence justification
   per permission cluster.
7. **Category + language** — probably "Workflow & planning tools" or
   "Productivity", English. Easy, but we need to pick.

Return this as a single table: `Asset | Status (found / missing / draft exists) | Location or plan`.
Do NOT fix anything until I've seen the table and told you what to
tackle first.

**Phase 2 — fill the gaps**

Based on what's missing, we'll work through each one:
- Copy: edit or write in-place, keep it short and in Wrenlist's voice
  (read the existing `app.wrenlist.com` landing copy first for tone).
- Screenshots: drive Chrome via the Claude-in-Chrome MCP to take shots
  of `/platform-connect`, `/listings`, `/finds/[id]`, and the extension
  popup. Save to `extension/store-assets/screenshots/`.
- Promo tile: use `public/wrenlist-logo.png` as source,
  composite with brand colours (sage green #3D5C3A on cream #F5F0E8 is
  the existing palette). `sips` on macOS can do basic comp, or we can
  write a small canvas script.
- Privacy policy: if there isn't one, we draft a minimal honest one
  covering what the extension reads (session cookies to run API calls
  on my behalf), what it sends to Wrenlist's backend, and what it does
  NOT collect (no analytics, no third-party sharing).

**Phase 3 — build and zip**

When all assets are ready:

1. `npm run build:extension` (clean rebuild — don't skip this, stale
   bundles are the most common shipping bug, see VERSIONING.md).
2. Verify `extension/dist/background/shared/api.js` has
   `chrome.runtime.getManifest().version` and NOT a hardcoded string.
3. From the project root, create the upload zip:
   ```bash
   cd extension
   zip -r ../wrenlist-ext-v0.9.2.zip . \
     -x "src/*" "node_modules/*" "*.md" "tsconfig.json" \
        "STORE-SUBMISSION-PROMPT.md" "icons.backup*" "*.log"
   cd ..
   ls -lh wrenlist-ext-v0.9.2.zip
   ```
4. Before handing me the zip: unzip it to a temp dir and spot-check
   — `manifest.json` version is `0.9.2`, `dist/` is present,
   `src/` is absent, no `.DS_Store`, size is under 10MB.

**Phase 4 — upload + listing (I drive this part)**

I'll open https://chrome.google.com/webstore/devconsole myself and
upload. You walk me through each field of the listing form, referencing
the copy we finalised in Phase 2. Use your Chrome MCP tools to verify
the preview looks right.

**Phase 5 — submit + staged rollout**

1. I submit for review.
2. First-time submissions are often in manual review for 24–72 hours.
3. Once approved, set the release to **10% staged rollout**. Don't
   go higher until 24h of no issues.
4. Tag the git commit: `git tag ext-v0.9.2-published` and push.
5. Update `extension/CHANGELOG.md` — add a "Published to Chrome Web
   Store at {date}, staged to 10%" line under the `0.9.2` entry.

### Known hazards — don't fall into these

- **Stale dist bundle** — rebuilt source doesn't show up until you
  `rm -rf extension/dist && npx tsc`. The `build:extension` script
  already does this.
- **Wrong domain** — `wrenlist.com` will redirect to `/login` during
  any test. Use `app.wrenlist.com` for live-app testing.
- **Chrome MCP cookie isolation** — the Chrome MCP tab group has its
  own cookie jar and is NOT logged into Wrenlist. For any test that
  requires auth, drive my regular Chrome tabs (via `computer-use`
  screenshots to see state) rather than the MCP tab group.
- **SSO clicks via MCP error with "Cannot access a chrome-extension://
  URL of different extension"** — known conflict between Claude-in-
  Chrome and the unpacked Wrenlist extension. Work around by using
  `computer-use` screenshots (desktop-level capture bypasses the
  conflict) and asking me to click through SSO myself.
- **Passwords** — hard rule, you do not type passwords for me. SSO
  clicks are OK with my permission.
- **Never commit unrelated modified files** — `git status` will show
  files I've touched in other sessions that are not part of this work.
  Stage only the files we explicitly change for the Web Store work.

### Success criteria

- Chrome Web Store listing for "Wrenlist — Marketplace Sync" exists
  and is in `Under review` or `Published` state, staged at 10%.
- All listing fields are filled with copy I've approved.
- The uploaded zip passes Chrome's automated checks (manifest valid,
  permissions justified, no obvious red flags).
- `ext-v0.9.2-published` git tag exists on main.
- `extension/CHANGELOG.md` notes the publication date.
- I have a clear plan for when to promote 10% → 50% → 100%.

### Commands you'll use a lot

```bash
# Build (clean)
npm run build:extension

# Unit test the version helper (sanity check before release)
npm run test:version-compare

# Type-check the web app
npx tsc --noEmit

# Check current extension version
grep '"version"' extension/manifest.json

# See what's pending in git
git status --short

# Inspect the unpacked output before zipping
ls -la extension/dist/background/
cat extension/dist/background/shared/api.js | head -10
```

Start with Phase 1. Give me the asset table, wait for my call on what
to do first.
