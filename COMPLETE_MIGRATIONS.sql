-- ============================================================================
-- WRENLIST CLEAN BUILD: COMPLETE MIGRATIONS
-- ============================================================================
-- Execute this entire file in Supabase SQL Editor to deploy all migrations
--
-- How to use:
-- 1. Go to https://app.supabase.com
-- 2. Select project: wrenlist-clean
-- 3. Go to SQL Editor → New Query
-- 4. Copy/paste this entire file
-- 5. Click Run (or CMD+Enter)
--
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: CREATE CORE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE DEFAULT auth.uid(),
  full_name TEXT,
  location TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'nester', 'forager', 'flock')),
  stripe_customer_id TEXT,
  finds_this_month INT DEFAULT 0,
  finds_reset_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Item details
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  size TEXT,
  colour TEXT,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair')),
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
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'listed', 'on_hold', 'sold')),
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

CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  platform TEXT NOT NULL CHECK (platform IN ('vinted', 'ebay', 'etsy', 'shopify')),
  platform_listing_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'sold', 'delisted')),

  listed_at TIMESTAMP,
  delisted_at TIMESTAMP,

  -- Performance metrics
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for core tables
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_status ON products(user_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_product_id ON listings(product_id);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_platform ON listings(platform);
CREATE INDEX IF NOT EXISTS idx_listings_user_platform ON listings(user_id, platform);

-- ============================================================================
-- MIGRATION 2: CREATE OPERATIONS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Expense details
  category TEXT NOT NULL CHECK (category IN ('packaging', 'postage', 'platform_fees', 'supplies', 'vehicle', 'other')),
  amount_gbp DECIMAL(10, 2) NOT NULL,
  vat_amount_gbp DECIMAL(10, 2),
  description TEXT,
  receipt_url TEXT,

  -- Date
  date DATE NOT NULL,

  -- Link to product (optional)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mileage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trip details
  date DATE NOT NULL,
  miles DECIMAL(5, 2) NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('car_boot', 'charity_shop', 'house_clearance', 'sourcing', 'delivery', 'other')),

  -- Location
  from_location TEXT,
  to_location TEXT,

  -- Vehicle
  vehicle TEXT NOT NULL,

  -- Calculated HMRC deductible value (45p per mile)
  deductible_value_gbp DECIMAL(10, 2) GENERATED ALWAYS AS (miles * 0.45) STORED,

  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for operations tables
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_mileage_user_id ON mileage(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_user_date ON mileage(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_vehicle ON mileage(vehicle);

-- ============================================================================
-- MIGRATION 3: ENABLE ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PRODUCTS POLICIES
-- ============================================================================

CREATE POLICY "Users view own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own products" ON products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- LISTINGS POLICIES
-- ============================================================================

CREATE POLICY "Users view own listings" ON listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own listings" ON listings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own listings" ON listings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- EXPENSES POLICIES
-- ============================================================================

CREATE POLICY "Users view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- MILEAGE POLICIES
-- ============================================================================

CREATE POLICY "Users view own mileage" ON mileage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own mileage" ON mileage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own mileage" ON mileage
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own mileage" ON mileage
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything was created:

-- Check tables created:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;

-- Check RLS enabled:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Check policies created:
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Created Tables: 5 (profiles, products, listings, expenses, mileage)
-- Created Indexes: 14
-- Created RLS Policies: 10
-- Status: ✅ Ready for authentication and API testing
-- ============================================================================
