# Wrenlist Database Schema

Fresh schema designed for wrenlist-clean app (Dashboard, Inventory, Add-Find, Analytics).

## Core Tables

### `users`
User accounts and authentication.
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### `finds`
Core inventory - vintage items sourced for resale.
```sql
CREATE TABLE finds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Item details
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  size TEXT,
  colour TEXT,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  description TEXT,

  -- Sourcing
  source_type TEXT CHECK (source_type IN ('house_clearance', 'charity_shop', 'car_boot', 'online_haul', 'flea_market', 'other')),
  source_name TEXT,
  sourced_at TIMESTAMP,

  -- Pricing
  cost_gbp DECIMAL(10, 2),
  asking_price_gbp DECIMAL(10, 2),
  sold_price_gbp DECIMAL(10, 2),

  -- Status
  status TEXT CHECK (status IN ('draft', 'listed', 'on_hold', 'sold')),
  sold_at TIMESTAMP,

  -- Photos
  photos TEXT[] DEFAULT '{}',

  -- AI features (future)
  ai_generated_description TEXT,
  ai_suggested_price_low DECIMAL(10, 2),
  ai_suggested_price_high DECIMAL(10, 2),

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_finds_user_id ON finds(user_id);
CREATE INDEX idx_finds_status ON finds(status);
CREATE INDEX idx_finds_created_at ON finds(created_at DESC);
```

### `listings`
Cross-marketplace listings (Vinted, eBay, Etsy, Shopify).
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  find_id UUID NOT NULL REFERENCES finds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  platform TEXT NOT NULL CHECK (platform IN ('vinted', 'ebay', 'etsy', 'shopify')),
  platform_listing_id TEXT,
  platform_url TEXT,

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'sold', 'delisted')),

  listed_at TIMESTAMP,
  delisted_at TIMESTAMP,

  -- Performance metrics
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  messages INT DEFAULT 0,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_listings_find_id ON listings(find_id);
CREATE INDEX idx_listings_user_id ON listings(user_id);
CREATE INDEX idx_listings_platform ON listings(platform);
```

## Analytics Tables

### `daily_metrics`
Aggregated daily stats for dashboard.
```sql
CREATE TABLE daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Counts
  finds_listed INT DEFAULT 0,
  items_sold INT DEFAULT 0,

  -- Revenue
  revenue_gbp DECIMAL(12, 2) DEFAULT 0,

  -- Margins
  avg_margin_pct INT,
  avg_days_to_sell INT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_metrics_user_date ON daily_metrics(user_id, date DESC);
```

### `monthly_metrics`
Monthly aggregates for analytics page.
```sql
CREATE TABLE monthly_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- YYYY-MM format

  -- Revenue by platform
  revenue_vinted DECIMAL(12, 2) DEFAULT 0,
  revenue_ebay DECIMAL(12, 2) DEFAULT 0,
  revenue_etsy DECIMAL(12, 2) DEFAULT 0,
  revenue_shopify DECIMAL(12, 2) DEFAULT 0,

  -- Revenue by source
  revenue_house_clearance DECIMAL(12, 2) DEFAULT 0,
  revenue_charity_shop DECIMAL(12, 2) DEFAULT 0,
  revenue_car_boot DECIMAL(12, 2) DEFAULT 0,
  revenue_online_haul DECIMAL(12, 2) DEFAULT 0,
  revenue_flea_market DECIMAL(12, 2) DEFAULT 0,

  items_sold INT DEFAULT 0,
  avg_margin_pct INT,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, year_month)
);

CREATE INDEX idx_monthly_metrics_user ON monthly_metrics(user_id);
```

## Key Design Decisions

1. **Simple, flat structure** - No complex relationships, easy to query
2. **No organization table** - Single-user (can add later if needed)
3. **Denormalized metrics** - Pre-calculated daily/monthly stats for fast analytics
4. **Array fields** - Photos stored as TEXT[] for simplicity
5. **Enums as TEXT** - Using TEXT CHECK constraints instead of PG enums for flexibility
6. **Soft deletes not used** - Hard deletes only, with CASCADE for safety

## Row-Level Security (RLS)

All tables should have RLS enabled:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE finds ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_metrics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users see own finds" ON finds
  FOR SELECT USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users insert own finds" ON finds
  FOR INSERT WITH CHECK (auth.uid()::UUID = user_id);
```

## Sample Queries

### Dashboard - Active finds + revenue
```sql
SELECT
  COUNT(*) FILTER (WHERE status != 'sold') as active_finds,
  SUM(asking_price_gbp) FILTER (WHERE status = 'listed')::INT as potential_revenue,
  ROUND(AVG(CASE WHEN asking_price_gbp > 0 THEN ((asking_price_gbp - cost_gbp) / asking_price_gbp * 100) END))::INT as avg_margin
FROM finds
WHERE user_id = $1 AND status IN ('listed', 'on_hold', 'draft');
```

### Inventory - List with filtering
```sql
SELECT * FROM finds
WHERE user_id = $1
  AND (status = $2 OR $2 = 'all')
  AND (name ILIKE $3 OR category ILIKE $3 OR source_name ILIKE $3)
ORDER BY created_at DESC;
```

### Analytics - Monthly breakdown
```sql
SELECT year_month,
  revenue_vinted, revenue_ebay, revenue_etsy, revenue_shopify,
  ROUND(avg_margin_pct) as margin,
  items_sold
FROM monthly_metrics
WHERE user_id = $1
ORDER BY year_month DESC
LIMIT 6;
```
