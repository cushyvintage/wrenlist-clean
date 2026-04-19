# CLAUDE.md — Wrenlist Dev Notes

## Domains (read this first)

Wrenlist runs on **three distinct domains** — confusing these has cost
real debugging time:

- **`wrenlist.com`** — marketing site. Hitting any app path here (e.g.
  `/platform-connect`) redirects to `/login`. Do NOT use this for
  end-to-end testing of app features.
- **`app.wrenlist.com`** — the actual Next.js app. This is where users
  are logged in and where the extension's content scripts run. When you
  need to screenshot or inspect the live app, always use this host.
- **`api.wrenlist.com`** — Supabase custom domain (see Supabase section
  below).

For browser-automation testing, always navigate to `app.wrenlist.com`,
not `wrenlist.com`.

## Supabase (wrenlist-clean)
- **Project ID:** tewtfroudyicwfubgcqi
- **Custom domain:** https://api.wrenlist.com (production URL — use this)
- **Direct URL:** https://tewtfroudyicwfubgcqi.supabase.co (still works, used for storage URLs)
- **Custom domain add-on:** $10/month, DNS managed in Namecheap (CNAME `api` + TXT `_acme-challenge.api`)

## Vercel
- **Project ID:** prj_npEAJ4fDntlbTtTmkCryTrcQkdmh
- **Team ID:** team_5klHjx1qdqPBtT5i8oAdlA8U
- **IMPORTANT:** There are two Vercel projects — `wrenlist` (visible in dashboard) and `wrenlist-clean` (what the CLI links to and what actually deploys). When using `vercel env` CLI commands, do NOT use `--scope` — it targets the wrong project.

## Google OAuth
- **Project:** `wrenlist` in Google Cloud Console
- **Client:** `Wrenlist Web` (807112761697-32vb...)
- **Redirect URIs:** Both `api.wrenlist.com/auth/v1/callback` AND `tewtfroudyicwfubgcqi.supabase.co/auth/v1/callback` are registered
- **Branding:** App name "Wrenlist", logo uploaded, privacy/terms URLs set

### Env var notes
- **`SUPABASE_SERVICE_ROLE_KEY`** — Set in Vercel (Production + Preview) as of 2026-04-10. Used by service-role features including `/api/cron/drip-emails`.
- **`EBAY_TOKEN_ENCRYPTION_KEY`** — Set in Vercel (Production + Preview) as of 2026-04-11. AES-256-CBC key (base64, 32 bytes). `src/lib/ebay-token-crypto.ts` provides `encryptEbayToken` / `decryptEbayToken` / `maybeDecryptEbayToken`. All `ebay_tokens` writes encrypt access_token + refresh_token and set `token_encrypted=true`. Reads use `maybeDecryptEbayToken` so legacy plaintext rows keep working until their next natural refresh (~2hr), at which point they're upgraded automatically. No backfill needed.
- **`EBAY_WEBHOOK_VERIFICATION_TOKEN`** — Already set in Vercel. Used by `/api/webhooks/ebay` to verify signatures on inbound `ITEM_SOLD` and account-deletion events. Only matters once an eBay webhook subscription is registered in the eBay dev console.

## Dev Server
- **Port:** 3004 (Next.js picks this if 3000 is busy)
- **Start:** `npm run dev` from `/Volumes/ExternalAI/github/wrenlist-clean`

## Key Paths
- **Active dev repo:** `/Volumes/ExternalAI/github/wrenlist-clean`
- **Extension source:** `/Volumes/ExternalAI/github/wrenlist-clean/extension/src`
- **Legacy repo (reference only):** `/Volumes/ExternalAI/github/wrenlist`

## Coding Standards (mandatory for all agents)

### API Response Handling
ALWAYS use `unwrapApiResponse()` from `@/lib/api-utils` when fetching data in pages.
NEVER use `result.data?.data || result.data || []` directly.

```ts
// ✅ Correct
import { fetchApi } from "@/lib/api-utils"
const trips = await fetchApi<SourcingTrip[]>("/api/sourcing")

// ✅ Also correct
const result = await res.json()
const trips = unwrapApiResponse<SourcingTrip[]>(result)

// ❌ Wrong
const trips = result.data?.data || result.data || []
```

### API Route Auth
ALWAYS use `withAuth()` from `@/lib/with-auth` for API routes.
NEVER inline `getServerUser()` + `if (!user) return ApiResponseHelper.unauthorized()` in every handler.

```ts
// ✅ Correct
import { withAuth } from "@/lib/with-auth"
export const GET = withAuth(async (req, user) => {
  // user is guaranteed here
})

// ❌ Wrong (adds 5 lines of boilerplate to every route)
const user = await getServerUser()
if (!user) return ApiResponseHelper.unauthorized()
```

### Loading/Error State
ALWAYS use `useApiCall()` hook from `@/hooks/useApiCall` for async data fetching in components.
NEVER reimplement loading/error state manually.

```ts
// ✅ Correct
const { data: trips, isLoading, error, call } = useApiCall<SourcingTrip[]>([])
useEffect(() => { call(() => fetchApi("/api/sourcing")) }, [])

// ❌ Wrong
const [trips, setTrips] = useState([])
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState(null)
// ... 20 lines of boilerplate
```

### Component Size
Pages over 600 lines MUST be split into sub-components.
Extract logical sections into `src/components/[page-name]/` directory.
Existing examples: `src/components/add-find/ISBNLookup.tsx`, `src/components/add-find/PlatformSelector.tsx`

### TypeScript
- Strict mode is always on — never use `any`
- Always run `npx tsc --noEmit` before committing
- Use `src/types/index.ts` for shared types — do not define types inline in pages

## Database Schema (source of truth — updated 2026-04-08)

**NEVER create a new table without updating this list and DATABASE_SCHEMA_REFERENCE.md.**

| Table | Purpose | RLS |
|---|---|---|
**Core inventory**
| Table | Purpose | RLS |
|---|---|---|
| `profiles` | User accounts, plans, Stripe billing | ON |
| `users` | Legacy mirror of auth.users (reference only — use auth.users FKs) | ON |
| `finds` | Inventory items (the core entity) | ON |
| `product_marketplace_data` | Per-marketplace listing state (1 row per find per platform) | ON |
| `customers` | Buyer CRM — one row per buyer per marketplace | ON |
| `stashes` | User-defined physical storage locations ("garage", "shelf 3") | ON |
| `stash_activity` | Audit log of stash mutations | ON |
| `scan_history` | Barcode/ISBN scan log | ON |

**Finance & tax**
| Table | Purpose | RLS |
|---|---|---|
| `expenses` | Business expenses | ON |
| `expense_categories` | Expense category lookup (read-only reference) | ON (read-only) |
| `mileage` | HMRC mileage tracking | ON |
| `hmrc_mileage_rates` | HMRC reference rates (public read) | ON (read-only) |
| `sourcing_trips` | Sourcing trip records | ON |
| `suppliers` | Supplier contacts | ON |
| `packaging_materials` | User-managed packaging inventory (mailers, boxes, tape, etc.) | ON |

**Marketplace configuration**
| Table | Purpose | RLS |
|---|---|---|
| `marketplace_category_config` | Category/field mappings per platform (shared config) | ON |
| `listing_templates` | Reusable listing templates | ON |
| `price_research_history` | Price research lookups with results for QA | ON |

**Platform connections (per marketplace)**
| Table | Purpose | RLS |
|---|---|---|
| `ebay_tokens` | eBay OAuth tokens (AES-256-CBC encrypted at rest) | ON |
| `ebay_seller_config` | eBay seller policies | ON |
| `ebay_oauth_states` | eBay OAuth flow state | ON |
| `ebay_sync_log` | eBay sync audit trail | ON |
| `ebay_webhooks_audit` | eBay webhook audit trail (user-read-only; service-role writes) | ON |
| `vinted_connections` | Vinted session cookies | ON |
| `depop_connections` | Depop connection state | ON |
| `etsy_connections` | Etsy connection state | ON |
| `shopify_connections` | Shopify store connections | ON |

**Publish/delist pipeline**
| Table | Purpose | RLS |
|---|---|---|
| `publish_jobs` | Unified publish/delist job queue (replaces PMD status-driven flow) | ON |
| `marketplace_events` | Event log of all marketplace interactions (error tracking) | ON (user read, service-role write) |

**Extension**
| Table | Purpose | RLS |
|---|---|---|
| `extension_heartbeats` | Extension last-seen timestamps | ON (user read, service-role write) |
| `extension_logs` | Extension debug logs (Chrome MV3 service worker) | ON (user read, service-role write) |

**Dedup**
| Table | Purpose | RLS |
|---|---|---|
| `dedup_dismissed_pairs` | User-dismissed duplicate pairs (prevents re-surfacing) | ON |

**Insights & email**
| Table | Purpose | RLS |
|---|---|---|
| `insight_events` | Insight rule firings (price drift, velocity, etc.) | ON |
| `dismissed_insights` | User-dismissed insight IDs | ON |
| `price_changes` | Price-change audit log (Phase 3 insights) | ON |
| `email_sends` | Transactional email send log (prevents duplicate drip sends) | ON |

**Metrics (not yet populated)**
| Table | Purpose | RLS |
|---|---|---|
| `daily_metrics` | Daily KPIs | ON |
| `monthly_metrics` | Monthly performance | ON |

**Internal testing**
| Table | Purpose | RLS |
|---|---|---|
| `test_runs` | Internal E2E test run tracking | ON |
| `test_results` | Individual test case results per run | ON |

**Public roadmap**
| Table | Purpose | RLS |
|---|---|---|
| `roadmap_items` | Public roadmap feature requests (anon read; writes via service-role API) | ON |
| `roadmap_votes` | One row per (user, item) upvote; users manage own rows only | ON |

**Category management (DB source of truth)**
| Table | Purpose | RLS |
|---|---|---|
| `categories` | Canonical category tree (570 rows, replaces TypeScript constants) | ON |
| `category_field_requirements` | Field definitions per category × platform (1140 rows) | ON |
| `category_taxonomy_versions` | Taxonomy freshness tracking per platform | ON |
| `category_publish_outcomes` | Publish success/failure tracking per category × platform | ON |
| `category_suggestion_log` | AI suggestion accept/reject/change decisions | ON |

### Database Rules
- **`product_marketplace_data`** is the ONLY table for marketplace listing state — do not create alternatives
- **`product_marketplace_data.platform_listed_at`** (timestamptz) — when the item was first listed on the platform (from platform data, not our `created_at`)
- **`product_marketplace_data.customer_id`** (uuid FK) links sold items to `customers` table
- **`finds.platform_fields`** (jsonb) stores platform-specific form fields
- **`finds.selected_marketplaces`** (text[]) stores which platforms a find targets
- **`finds.stash_id`** (uuid FK → stashes, ON DELETE SET NULL) — physical storage location
- All `user_id` FKs reference **`auth.users(id)`** — the `public.users` table is a legacy mirror; do not write to it
- All tables have RLS enabled with `auth.uid()` policies
- Service-role-only policies must be scoped `TO service_role` (not `TO public`) — see migration `20260411000002_rls_prelaunch_hardening` for the fix
- Supported platforms (DB CHECK + TypeScript): vinted, ebay, etsy, shopify, depop, poshmark, mercari, facebook, whatnot, grailed
- **Archived schema docs in `.archive/`** are historical — do NOT use them for development
- **Before adding a new table:** add it to this list AND `DATABASE_SCHEMA_REFERENCE.md`. If a reviewing agent spots an unlisted table, schema drift has happened and needs resolving before merge.
