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

### Missing Vercel Env Vars (TODO)
- **`EBAY_WEBHOOK_VERIFICATION_TOKEN`** — Required for eBay webhook signature validation. Without it, incoming eBay events (ITEM_SOLD, account deletion) are rejected with 500. eBay publishing still works; only inbound webhooks are affected.
- **`EBAY_TOKEN_ENCRYPTION_KEY`** — Required for encrypting stored eBay OAuth tokens at rest.

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

## Database Schema (source of truth — updated 2026-04-04)

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
| `daily_metrics` | Daily KPIs (not yet populated) | ON |
| `monthly_metrics` | Monthly performance (not yet populated) | ON |

### Database Rules
- **`product_marketplace_data`** is the ONLY table for marketplace listing state — do not create alternatives
- **`finds.platform_fields`** (jsonb) stores platform-specific form fields
- **`finds.selected_marketplaces`** (text[]) stores which platforms a find targets
- All `user_id` FKs reference **`auth.users(id)`** — there is no `public.users` table
- All tables have RLS enabled with `auth.uid()` policies
- Supported platforms (DB CHECK + TypeScript): vinted, ebay, etsy, shopify, depop, poshmark, mercari, facebook, whatnot, grailed
- **Archived schema docs in `.archive/`** are historical — do NOT use them for development
