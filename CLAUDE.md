# CLAUDE.md — Wrenlist Dev Notes

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
- **`SUPABASE_SERVICE_ROLE_KEY`** — Key is registered in Vercel (Production, Preview) but stored as an empty string. **This blocks any feature that needs service-role access**, including `/api/cron/drip-emails` (queries candidates across all users). Paste the real key from the Supabase dashboard before relying on cron-driven emails.
- **`EBAY_TOKEN_ENCRYPTION_KEY`** — Referenced by `encryptToken`/`decryptToken` helpers on `eBayClient`, but **no call sites currently use them**. Tokens are stored unencrypted in `ebay_tokens`. Setting the env var on its own does nothing until someone wires it up.
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
| `profiles` | User accounts, plans, Stripe billing | ON |
| `finds` | Inventory items (the core entity) | ON |
| `product_marketplace_data` | Per-marketplace listing state (1 row per find per platform) | ON |
| `marketplace_category_config` | Category/field mappings per platform | ON |
| `expenses` | Business expenses | ON |
| `mileage` | HMRC mileage tracking | ON |
| `sourcing_trips` | Sourcing trip records | ON |
| `suppliers` | Supplier contacts | ON |
| `listing_templates` | Reusable listing templates | ON |
| `ebay_tokens` | eBay OAuth tokens | ON |
| `ebay_seller_config` | eBay seller policies | ON |
| `ebay_oauth_states` | eBay OAuth flow states | ON |
| `ebay_sync_log` | eBay sync audit trail | ON |
| `ebay_webhooks_audit` | eBay webhook audit trail | ON |
| `shopify_connections` | Shopify store connections | ON |
| `price_research_history` | Price research lookups with results for QA | ON |
| `expense_categories` | Expense category lookup (DB-driven) | ON (read-only) |
| `customers` | Buyer CRM — one row per buyer per marketplace | ON |
| `test_runs` | Internal E2E test run tracking | ON |
| `test_results` | Individual test case results per run | ON |
| `daily_metrics` | Daily KPIs (not yet populated) | ON |
| `monthly_metrics` | Monthly performance (not yet populated) | ON |
| `stashes` | User-defined physical storage locations ("garage", "shelf 3") | ON |

### Database Rules
- **`product_marketplace_data`** is the ONLY table for marketplace listing state — do not create alternatives
- **`product_marketplace_data.customer_id`** (uuid FK) links sold items to `customers` table
- **`finds.platform_fields`** (jsonb) stores platform-specific form fields
- **`finds.selected_marketplaces`** (text[]) stores which platforms a find targets
- **`finds.stash_id`** (uuid FK → stashes, ON DELETE SET NULL) — physical storage location
- All `user_id` FKs reference **`auth.users(id)`** — there is no `public.users` table
- All tables have RLS enabled with `auth.uid()` policies
- Supported platforms (DB CHECK + TypeScript): vinted, ebay, etsy, shopify, depop, poshmark, mercari, facebook, whatnot, grailed
- **Archived schema docs in `.archive/`** are historical — do NOT use them for development
