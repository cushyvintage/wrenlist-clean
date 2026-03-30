# Wrenlist Clean Build — Agent Guide

## Project
Vintage resale management SaaS. Clean rebuild. Single-user (no orgs). UK-first.

**Repo**: `/Volumes/ExternalAI/github/wrenlist-clean`
**Stack**: Next.js 15, TypeScript strict, Supabase, Tailwind CSS
**Dev server**: http://localhost:3004
**Production**: https://wrenlist.com (switch after all epics complete)
**Supabase project**: `tewtfroudyicwfubgcqi` (wrenlist-clean)
**Old repo for reference**: `/Volumes/ExternalAI/github/wrenlist`

---

## Database (tewtfroudyicwfubgcqi)

9 tables deployed:
- `profiles` — user plan, name, stripe_customer_id, finds_this_month
- `finds` — core inventory (name, cost, price, status, photos, condition)
- `listings` — marketplace listings per find (platform, status, platform_listing_id)
- `expenses` — business expenses (category, amount, VAT)
- `mileage` — HMRC mileage logs (45p/mile)
- `products` — (TBD — may merge with finds)
- `users` — Supabase auth mirror
- `daily_metrics` / `monthly_metrics` — analytics aggregates

---

## Plans (src/config/plans.ts)
- **Free**: 10 finds/month, 1 marketplace, £0
- **Nester**: 100 finds/month, 3 marketplaces, £14/mo (£117/yr)
- **Forager**: 500 finds/month, 5 marketplaces, £29/mo (£242/yr) ⭐ featured
- **Flock**: Unlimited, 5 marketplaces + team seats, £59/mo (£492/yr)

---

## What's Actually Built vs Status

### ✅ Built and working
- Auth pages (register, login, forgot/reset password, verify email)
- Registration with plan selection + Google OAuth
- Profile creation on signup (full_name, plan stored)
- Middleware route protection
- Expenses API + UI (CRUD, needs wiring to real data)
- Mileage API + UI (CRUD, HMRC 45p/mile calc)
- Finds API + UI (add-find form, inventory list)
- Listings API (create, delist, sync endpoints)
- Plans config with Stripe price ID placeholders
- 136 Playwright tests (88% coverage on built pages)
- TypeScript strict, zero errors

### ⚠️ Exists but stub/not wired
- `src/lib/marketplaces/` — vinted.ts, ebay.ts, etsy.ts, shopify.ts exist but are placeholder code, no real API calls
- `platform-connect` page — UI exists, no OAuth flows built
- `analytics` page — page exists, no real data queries
- `ai-listing` page — stub
- `price-research` page — stub
- `orders` page — no API route
- `tax` page — no API route
- Stripe — plans.ts has price ID placeholders, no Stripe SDK wired

### ❌ Not built yet
- OAuth flows (eBay, Etsy, Shopify)
- Skylark extension integration (postMessage → marketplace_accounts)
- Stripe checkout, webhook, billing portal
- Photo upload (Supabase Storage)
- Auto-delist on sale logic
- AI features (description gen, price suggestion, BG removal)
- Sourcing pipeline beyond add-find

---

## Epic Plan (priority order)

### Epic 1: Auth & Onboarding ← START HERE
- Fix deprecated `createMiddlewareClient` → new SSR helpers
- Verify registration → profile → email confirm flow end-to-end
- Post-signup redirect to dashboard

### Epic 2: Core Inventory
- Wire add-find form to API (may already work, needs testing)
- Inventory list with real data + filtering
- Find detail page (edit, status change, photos)
- Photo upload via Supabase Storage

### Epic 3: Marketplace Connect & Listing
- Platform connect: Vinted (via Skylark extension), eBay OAuth
- Create listing from find → extension sends to Vinted/eBay
- Delist endpoint actually calls marketplace API
- Sync listing status back

### Epic 4: Operations (Expenses + Mileage)
- Wire expenses UI → API (test CRUD flows)
- Wire mileage UI → API
- Tax summary page (aggregate expenses + mileage for HMRC)

### Epic 5: Analytics
- Dashboard: real GMV, profit, listing counts from DB
- Monthly breakdown from monthly_metrics
- Populate metrics tables from finds/listings events

### Epic 6: Stripe & Billing
- Create Stripe account + products (Free/Nester/Forager/Flock)
- Checkout session API `/api/billing/checkout`
- Webhook `/api/billing/webhook` → update profiles.plan
- Plan enforcement: block find creation when limit hit
- Billing portal `/api/billing/portal`

### Epic 7: AI Features
- AI description from find data (OpenAI)
- Price suggestion (eBay/Vinted price research)
- Background removal

---

## Key Patterns

### API routes
All in `src/app/api/`. Use Zod validation, return `ApiResponse` helper.
Always check auth: `const { data: { user } } = await supabase.auth.getUser()`

### Supabase client
- Server: `import { createClient } from '@/lib/supabase-server'`
- Client: `import { createClient } from '@/lib/supabase'`

### Auth (middleware)
Currently uses deprecated `createMiddlewareClient` — migrate to `@supabase/ssr` `createServerClient`.

### Tests
`npx playwright test` — tests run against https://wrenlist.com
Keep tests updated when pages change.

---

## Gotchas
- Old repo `/Volumes/ExternalAI/github/wrenlist` has working eBay sync, Vinted extension, Resend email — reference for porting
- `finds` = inventory items (not "products" — that naming was the old build)
- Plans are named Free/Nester/Forager/Flock (not Starter/Growth/Pro)
- Supabase project is `tewtfroudyicwfubgcqi` (NOT the old `updcyyvkauqenhztmbay`)
