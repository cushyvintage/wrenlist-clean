# Wrenlist Database Schema Reference

**Last Updated**: 2026-04-04
**Supabase Project**: tewtfroudyicwfubgcqi

> This is the authoritative schema reference. See also CLAUDE.md for the table list.
> Do NOT create new tables without updating both this file and CLAUDE.md.

---

## Table Overview (17 tables)

```
Core
├── profiles          - User accounts, plans, Stripe
├── finds             - Inventory items (the central entity)
├── product_marketplace_data - Per-marketplace listing state
├── marketplace_category_config - Platform category/field mappings

Operations
├── expenses          - Business expenses
├── mileage           - HMRC mileage tracking (auto-calc 45p/mile)
├── sourcing_trips    - Sourcing trip records
├── suppliers         - Supplier contacts
├── listing_templates - Reusable listing templates

eBay Integration
├── ebay_tokens       - OAuth tokens (1 per user)
├── ebay_seller_config - Seller policies
├── ebay_oauth_states - OAuth flow states (ephemeral)
├── ebay_sync_log     - Sync audit trail
├── ebay_webhooks_audit - Webhook audit trail

Other Integrations
├── shopify_connections - Shopify store connections

Metrics (not yet populated)
├── daily_metrics     - Daily KPIs
└── monthly_metrics   - Monthly performance

Views (ML/training)
└── training_sold_comps - Sold comps view (finds+PMD+customers, service-role only)
```

All tables: RLS ON, user_id FK → auth.users(id) ON DELETE CASCADE

---

## Key Tables

### finds
The core entity. Every inventory item is a find.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK auth.users | |
| name | TEXT NOT NULL | |
| category | TEXT | |
| brand, size, colour | TEXT | |
| condition | TEXT | CHECK: excellent, good, fair, poor |
| description | TEXT | |
| source_type | TEXT | CHECK: house_clearance, charity_shop, car_boot, online_haul, flea_market, other |
| source_name | TEXT | |
| sourced_at | TIMESTAMP | |
| cost_gbp | NUMERIC | |
| asking_price_gbp | NUMERIC | |
| sold_price_gbp | NUMERIC | |
| status | TEXT | CHECK: draft, listed, on_hold, sold |
| sold_at | TIMESTAMP | |
| photos | TEXT[] | Default {} |
| sku | TEXT UNIQUE | |
| platform_fields | JSONB | Platform-specific form data, keyed by platform name |
| color_ids | INT[] | Vinted color IDs |
| selected_marketplaces | TEXT[] | Default {vinted} |
| sourcing_trip_id | UUID FK sourcing_trips | ON DELETE SET NULL |
| ai_generated_description | TEXT | |
| ai_suggested_price_low/high | NUMERIC | |
| created_at, updated_at | TIMESTAMP | |

### product_marketplace_data
One row per find per marketplace. The ONLY table for marketplace listing state.

| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| find_id | UUID FK finds | ON DELETE CASCADE |
| marketplace | TEXT | CHECK: vinted, ebay, etsy, shopify, depop, poshmark, mercari, facebook, whatnot, grailed |
| platform_listing_id | TEXT | The marketplace's ID for this listing |
| platform_listing_url | TEXT | |
| platform_category_id | TEXT | |
| listing_price | NUMERIC | |
| fields | JSONB | Default {} |
| status | TEXT | CHECK: not_listed, listed, sold, error, delisted, needs_delist |
| error_message | TEXT | |
| last_synced_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

### profiles

| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| user_id | UUID FK auth.users UNIQUE | Default auth.uid() |
| full_name | TEXT | |
| location | TEXT | |
| plan | TEXT | CHECK: free, nester, forager, flock. Default 'free' |
| stripe_customer_id | TEXT | |
| finds_this_month | INT | Default 0 |
| finds_reset_at | TIMESTAMP | |
| onboarding_completed | BOOLEAN | Default false |
| created_at, updated_at | TIMESTAMP | |

---

## Relationships

```
auth.users (Supabase Auth)
├── profiles (1:1) via user_id UNIQUE
├── finds (1:N) via user_id
│   ├── product_marketplace_data (1:N) via find_id
│   └── sourcing_trips (N:1) via sourcing_trip_id
├── expenses (1:N) via user_id
├── mileage (1:N) via user_id
├── suppliers (1:N) via user_id
├── sourcing_trips (1:N) via user_id
├── listing_templates (1:N) via user_id
├── ebay_tokens (1:1) via user_id UNIQUE
├── ebay_seller_config (1:1) via user_id
├── ebay_oauth_states (1:N) via user_id
├── shopify_connections (1:1) via user_id UNIQUE
├── daily_metrics (1:N) via user_id
└── monthly_metrics (1:N) via user_id
```

---

## CHECK Constraints Summary

| Table | Field | Values |
|-------|-------|--------|
| finds | condition | excellent, good, fair, poor |
| finds | source_type | house_clearance, charity_shop, car_boot, online_haul, flea_market, other |
| finds | status | draft, listed, on_hold, sold |
| product_marketplace_data | marketplace | vinted, ebay, etsy, shopify, depop, poshmark, mercari, facebook, whatnot, grailed |
| product_marketplace_data | status | not_listed, listed, sold, error, delisted, needs_delist |
| marketplace_category_config | marketplace | (same 10 platforms) |
| profiles | plan | free, nester, forager, flock |
| expenses | category | packaging, postage, platform_fees, supplies, vehicle, other |
| mileage | purpose | car_boot, charity_shop, house_clearance, sourcing, delivery, other |

---

## RLS Pattern (all tables)

```sql
FOR SELECT USING (auth.uid() = user_id)
FOR INSERT WITH CHECK (auth.uid() = user_id)
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
FOR DELETE USING (auth.uid() = user_id)
```
