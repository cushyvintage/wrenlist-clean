# Wrenlist Clean — Current Status

**Last Updated**: 2026-04-01
**Status**: ✅ **Sprint 5 Complete • Sprint 6 In Progress**

---

## Overview

Wrenlist-clean is a Next.js 15 SaaS for UK vintage resellers. It provides unified inventory management, marketplace integration, and business operations tracking.

**Domains**: wrenlist.com (marketing) | app.wrenlist.com (app)
**Stack**: Next.js 15, TypeScript strict, Supabase, Tailwind CSS
**DB**: Supabase project `tewtfroudyicwfubgcqi`

---

## What's Complete (Sprints 0–5)

### ✅ Sprint 0: Infrastructure
- Auth system (register, login, password reset, email verify)
- Middleware route protection
- Supabase SSR setup (createServerClient pattern)
- Design system (Tailwind, color palette: sage, ink, cream, amber)
- 136 Playwright tests (88% coverage)

### ✅ Sprint 1–2: Core Inventory
- **Add-find page**: Multi-section form (photos, item details, platform fields, sourcing, pricing)
- **Photo upload**: Drag-drop, preview grid, 10-image max
- **Find CRUD**: Create, read, update, delete inventory items in Supabase
- **Inventory list**: Display finds with filtering and status management
- **SKU generation**: Auto-generated with override capability

### ✅ Sprint 3: Marketplace Setup
- **Marketplace registry** (`src/lib/marketplace/registry.ts`): Extensible platform definitions
- **Extension proxy** (SSR-safe): Communicate with Skylark extension via postMessage
- **Platform fields**: Dynamic fields per marketplace (eBay, Vinted, Etsy, Shopify)
- **Template system**: Save/load listing templates with field counts

### ✅ Sprint 4: Operations Baseline
- **Expenses API & UI**: CRUD operations, category management, VAT calculation
- **Mileage API & UI**: HMRC 45p/mile logging and calculation
- **Tax summary page**: Aggregate expenses + mileage for HMRC reporting

### ✅ Sprint 5: Plan Enforcement & UX
- **Plan enforcement**: Blocks find creation when monthly limit hit
- **Profile API**: User plan, finds_this_month counter, stripe_customer_id
- **Template CRUD**: Create, list, apply, delete templates
- **Edit/delete UI**: Template management with error states and toasts
- **Add-find form fixes**: Field defaults, proper validation, source_type handling

### ✅ Sprint 6: Onboarding & Domain Routing (In Progress)
- **3-step onboarding**: Welcome, marketplace connect, first find CTA
- **Domain routing**: app.wrenlist.com for SaaS, wrenlist.com for marketing
- **Onboarding guard**: Routes users correctly on first signup

---

## What's Built But Not Wired

### 📋 Listings & Crosslisting
- **Component**: `src/components/listing/ListOnSection.tsx` exists
- **Missing**: API endpoint to create listings on marketplaces
- **Missing**: Vinted/eBay OAuth flows (Vinted works via extension; eBay/Etsy OAuth not started)
- **Missing**: Auto-delist when item sells

### 📋 Stripe Billing
- **Plans**: Defined in `src/config/plans.ts` (Free/Nester/Forager/Flock)
- **Missing**: Stripe SDK integration, checkout session API
- **Missing**: Webhook to update user plan on payment
- **Missing**: Billing portal link

### 📋 Photo Upload to Cloud
- **Component**: `src/components/listing/PhotoUpload.tsx` ready
- **Missing**: Supabase Storage bucket setup
- **Missing**: API to upload photos and store URLs in finds.photos

### 📋 AI Features
- **Wren AI component**: Pricing suggestion UI exists
- **Missing**: OpenAI integration for price suggestions
- **Missing**: Description generation from item details
- **Missing**: Background removal

### 📋 Analytics
- **Pages**: Dashboard, analytics page exist
- **Missing**: Real data queries from monthly_metrics table
- **Missing**: GMV, profit, listing counts calculations

---

## Sprints Breakdown

| Sprint | Focus | Status |
|--------|-------|--------|
| 0 | Infrastructure, auth, design system | ✅ Complete |
| 1–2 | Inventory, forms, templates | ✅ Complete |
| 3 | Marketplace setup, extension proxy | ✅ Complete |
| 4 | Expenses, mileage, operations | ✅ Complete |
| 5 | Plan enforcement, profile API, template CRUD | ✅ Complete |
| 6 | Onboarding, domain routing | 🟡 In Progress |
| 7 | Listings API, crosslisting, auto-delist | ⏳ Pending |
| 8 | Stripe checkout, webhooks, billing | ⏳ Pending |
| 9 | Photo upload to cloud, AI features | ⏳ Pending |

---

## Known Gaps (Priority Order)

### 🔴 Critical Path
1. **Listings API** — Create listing from find on eBay/Vinted
2. **Stripe integration** — Checkout, webhook, plan updates
3. **Photo cloud upload** — Supabase Storage integration
4. **Vinted/eBay OAuth** — Complete marketplace connections
5. **Auto-delist logic** — When item sells, remove from other platforms

### 🟡 High Value
6. AI price suggestions (OpenAI API)
7. Description auto-generation
8. Background removal for photos
9. Analytics dashboard (real queries)
10. Marketplace sync (fetch orders, update status)

### 🟢 Nice-to-Have
11. Bulk operations (upload multiple finds)
12. Smart categorization (auto-detect from photo)
13. Pricing history tracking
14. Competitor price monitoring

---

## Recent Commits

```
4ce564e chore: domain routing tidy-up — app subdomain links, onboarding guard, register redirect
b1ebd86 feat: seller onboarding flow — 3-step welcome, marketplace connect, first find CTA
fc9b9c6 feat: template edit/delete UI wired to API routes, error states, toasts
31566bb fix: source_type default to other, fix profiles query user_id vs id
aa0e545 fix: plan enforcement counter, profile API limits, add-find form fields, auth display
```

---

## Database Schema

| Table | Purpose | Status |
|-------|---------|--------|
| `users` | Supabase auth mirror | ✅ Active |
| `profiles` | User plan, name, finds_this_month | ✅ Active |
| `finds` | Inventory items | ✅ Active |
| `listings` | Marketplace listings per find | ✅ Active |
| `templates` | Saved listing templates | ✅ Active |
| `expenses` | Business expenses | ✅ Active |
| `mileage` | HMRC mileage logs | ✅ Active |
| `monthly_metrics` | Aggregated KPIs | ✅ Schema ready |
| `daily_metrics` | Daily aggregates | ✅ Schema ready |

---

## Next Steps (Sprint 7)

1. **Listings API**: POST `/api/listings` to create marketplace listing
2. **Crosslisting logic**: Call marketplace APIs via extension proxy
3. **Sync endpoint**: Fetch listing status from marketplaces
4. **Auto-delist**: Remove listing when find status = "sold"
5. **E2E test**: Create find → list on eBay/Vinted → sync status

---

## Testing

```bash
npm run dev        # Dev server :3004
npm test           # Playwright tests (88% coverage)
npm run build      # TypeScript check + build
npm run clean      # Lint + format + type-check before commit
```

Manual test flow:
1. Sign up with email
2. Verify email (dev uses fake emails)
3. Complete onboarding
4. Create a find (add-find page)
5. Create listing (coming soon)
6. Verify find appears in inventory

---

## Environment

- **Dev**: http://localhost:3004
- **Staging**: https://app.wrenlist.com (main branch, auto-deploy)
- **Database**: Supabase `tewtfroudyicwfubgcqi`
- **Auth**: Supabase Auth (SSR patterns in CLAUDE.md)
- **Build**: Next.js 15, TypeScript strict, zero errors

---

**Status**: ✅ Foundation solid. Ready for listings API + Stripe integration.
