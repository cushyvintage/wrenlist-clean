# Wrenlist Database Schema

**Project**: tewtfroudyicwfubgcqi
**Updated**: 2026-03-30
**Status**: ✅ Production schema live

## Tables

### `users`
User accounts and authentication.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| email | TEXT | Unique, required |
| name | TEXT | Display name |
| avatar_url | TEXT | Profile picture |
| created_at | TIMESTAMP | Auto-set |
| updated_at | TIMESTAMP | Auto-update |

**Indexes**: `email` (unique)
**Relationships**: Referenced by `finds`, `listings`, `daily_metrics`, `monthly_metrics`

---

### `finds`
Core inventory - vintage items from sourcing through sale.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | Primary key | |
| user_id | UUID | FK → users.id, CASCADE | |
| **Item Details** | | | |
| name | TEXT | NOT NULL | Item description |
| category | TEXT | | Free-text category |
| brand | TEXT | | Brand name |
| size | TEXT | | Size (M, 32, 10, etc) |
| colour | TEXT | | Color |
| condition | TEXT | IN ('excellent','good','fair','poor') | Item condition |
| description | TEXT | | Full description |
| **Sourcing** | | | |
| source_type | TEXT | IN ('house_clearance','charity_shop','car_boot','online_haul','flea_market','other') | Where it came from |
| source_name | TEXT | | Specific location/shop |
| sourced_at | TIMESTAMP | | When acquired |
| **Pricing** | | | |
| cost_gbp | DECIMAL(10,2) | | Purchase cost |
| asking_price_gbp | DECIMAL(10,2) | | Listed price |
| sold_price_gbp | DECIMAL(10,2) | | Final sale price |
| **Status** | | | |
| status | TEXT | IN ('draft','listed','on_hold','sold') | Current state |
| sold_at | TIMESTAMP | | When sold |
| **Media** | | | |
| photos | TEXT[] | DEFAULT '{}' | Array of photo URLs |
| **AI Features** | | | |
| ai_generated_description | TEXT | | AI-generated listing text |
| ai_suggested_price_low | DECIMAL(10,2) | | AI price floor |
| ai_suggested_price_high | DECIMAL(10,2) | | AI price ceiling |
| **Metadata** | | | |
| created_at | TIMESTAMP | DEFAULT now() | |
| updated_at | TIMESTAMP | DEFAULT now() | |

**Indexes**:
- `idx_finds_user_id` on user_id
- `idx_finds_status` on status (filter by draft/listed/on_hold/sold)
- `idx_finds_created_at` on created_at DESC (sorting)

**Sample Query** (Inventory page):
```sql
SELECT * FROM finds
WHERE user_id = $1
  AND (status = $2 OR $2 = 'all')
  AND (name ILIKE $3 OR category ILIKE $3 OR source_name ILIKE $3)
ORDER BY created_at DESC;
```

---

### `listings`
Cross-marketplace listings (Vinted, eBay, Etsy, Shopify).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id | UUID | Primary key | |
| find_id | UUID | FK → finds.id, CASCADE | Parent find |
| user_id | UUID | FK → users.id, CASCADE | Owner |
| platform | TEXT | IN ('vinted','ebay','etsy','shopify') | Where listed |
| platform_listing_id | TEXT | | External listing ID |
| platform_url | TEXT | | Link to listing |
| status | TEXT | DEFAULT 'draft', IN ('draft','live','sold','delisted') | Listing status |
| listed_at | TIMESTAMP | | When went live |
| delisted_at | TIMESTAMP | | When removed |
| views | INT | DEFAULT 0 | View count |
| likes | INT | DEFAULT 0 | Like/favorite count |
| messages | INT | DEFAULT 0 | Message count |
| created_at | TIMESTAMP | DEFAULT now() | |
| updated_at | TIMESTAMP | DEFAULT now() | |

**Indexes**:
- `idx_listings_find_id` on find_id (get listings for a find)
- `idx_listings_user_id` on user_id (user's all listings)
- `idx_listings_platform` on platform (filter by marketplace)

**One find → Many listings** (same item can be on multiple platforms)

---

### `daily_metrics`
Daily aggregated stats for dashboard.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id, CASCADE |
| date | DATE | Day (YYYY-MM-DD) |
| finds_listed | INT | Count of items listed that day |
| items_sold | INT | Count of items sold that day |
| revenue_gbp | DECIMAL(12,2) | Total revenue |
| avg_margin_pct | INT | Average margin % |
| avg_days_to_sell | INT | Average days from source to sale |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Constraints**: `UNIQUE(user_id, date)` - one metric row per user per day
**Index**: `idx_daily_metrics_user_date` on (user_id, date DESC) for fast dashboard queries

**Purpose**: Pre-calculated daily KPIs to avoid expensive aggregations on every dashboard load

---

### `monthly_metrics`
Monthly performance breakdown by platform and source.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| user_id | UUID | FK → users.id, CASCADE |
| year_month | TEXT | Format: YYYY-MM (e.g., "2026-03") |
| **By Platform** | | |
| revenue_vinted | DECIMAL(12,2) | Revenue from Vinted |
| revenue_ebay | DECIMAL(12,2) | Revenue from eBay UK |
| revenue_etsy | DECIMAL(12,2) | Revenue from Etsy |
| revenue_shopify | DECIMAL(12,2) | Revenue from Shopify |
| **By Source** | | |
| revenue_house_clearance | DECIMAL(12,2) | From house clearances |
| revenue_charity_shop | DECIMAL(12,2) | From charity shops |
| revenue_car_boot | DECIMAL(12,2) | From car boots |
| revenue_online_haul | DECIMAL(12,2) | From online hauls |
| revenue_flea_market | DECIMAL(12,2) | From flea markets |
| **Summary** | | |
| items_sold | INT | Total items sold |
| avg_margin_pct | INT | Average margin % |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**Constraints**: `UNIQUE(user_id, year_month)` - one metric row per user per month
**Index**: `idx_monthly_metrics_user` on user_id (all metrics for a user)

**Used by**: Analytics page for breakdowns and insights

---

## Design Patterns

### Margin Calculation
```
margin_pct = ((asking_price - cost) / asking_price) * 100
```

### Status Flow
```
draft → listed → {on_hold, sold}
```

### Foreign Keys
- All use CASCADE delete for data integrity
- Indexes on FK columns for join performance

### Metrics Strategy
- **Denormalized tables** (daily_metrics, monthly_metrics) - pre-calculated to avoid expensive GROUP BY on every analytics page load
- **Materialized incrementally** - calculated when finds are marked sold or status changes
- **Immutable by date** - one row per user per day/month, never updated once complete

---

## Next: Auth & RLS

When authentication is implemented, enable Row-Level Security:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE finds ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_metrics ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY "Users see own finds" ON finds
  FOR SELECT USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users insert own finds" ON finds
  FOR INSERT WITH CHECK (auth.uid()::UUID = user_id);
```

---

## TypeScript Types

See `src/types/index.ts` for corresponding TypeScript interfaces that match these tables.

Update this file whenever schema changes are made.
