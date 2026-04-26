# Synthetic Critical-Path Playbook

A "synthetic user" (Claude-in-Chrome or Playwright) walks these flows on
every run. Each run inserts a row into `synthetic_test_runs`; each step
inserts into `synthetic_test_results`.

## Safety conventions

Every test artefact MUST be marked so it can be cleaned up and so that
nothing is mistaken for a real listing if cleanup somehow fails:

- **Title prefix**: `__WRENLIST_SYNTHETIC_DELETE__`
- **Asking price**: `999` GBP (high enough that no buyer would bid)
- **Description**: includes the run_id + "automated test, will be deleted"
- **SKU**: prefix `WL-SYN-` so DB queries can grep them out

The runner is responsible for cleanup whether the run passes or fails:
delete the find via DELETE /api/finds/[id], which cascades to PMD rows
and queues a delist on every connected platform.

## Critical paths (run order)

### 1. add_find.create
Goal: a new find can be created with the minimum fields.
- POST /api/finds with `{name, asking_price_gbp: 999, category: 'other', sku: 'WL-SYN-<run_id>'}`
- Expect `201` and a uuid in the response.
- Save `find_id` for downstream steps.

### 2. add_find.fetch
Goal: the find we just created appears via list endpoints.
- GET /api/finds?limit=5 — expect to see find_id.
- GET /api/finds/[find_id] — expect 200 with matching name.

### 3. publish.ebay
Goal: the publish flow lists the find on eBay for real.
- POST /api/ebay/publish with `{findId, dryRun: false}` — eBay is the
  only server-side publisher we can drive without the desktop extension.
- Expect `200` and a `platform_listing_id` in response.
- Verify via GET /api/ebay/listings?status=active that the listing is
  live on eBay's side (not just in our DB).

### 4. delist.ebay
Goal: the delist flow removes the eBay listing.
- POST /api/crosslist/delist with `{find_ids: [find_id], platforms: ['ebay']}`
- Expect `200`. Wait up to 60s.
- Verify via PMD row that status flipped from `live` → `delisted`.
- Verify via eBay API the listing is no longer active.

### 5. publish.queue.vinted (deferred — needs extension)
Goal: queue is correctly set up for the desktop extension to pick up.
- POST /api/marketplace/publish-queue with `{find_id, marketplace:'vinted'}`
- Expect `200` and a PMD row with status `needs_publish`.
- Skip live verification (would need extension running).

### 6. cleanup
Goal: every artefact created by the run is removed.
- DELETE /api/finds/[find_id]
- Verify via Supabase: 0 rows in `finds` matching `sku LIKE 'WL-SYN-<run_id>%'`.

## Reporting

At the end of each run:
- Update `synthetic_test_runs.status` to `passed` or `failed`.
- Set `finished_at = now()`.
- Post a one-line summary to the Telegram OpenClaw channel.

## Cadence

- **Pre-launch (now)**: ad-hoc, on-demand. Run before each push.
- **Post-launch**: nightly via /schedule, `0 3 * * *`.
- **Pre-deploy**: hook into Vercel deploy webhook to run before promotion.
