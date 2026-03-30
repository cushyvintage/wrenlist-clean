# Wrenlist Supabase Quick Deploy Guide

## Step 1: Open SQL Editor
Go to: https://supabase.com/dashboard/project/updcyyvkauqenhztmbay/sql/new

---

## Step 2: Run Migration 001 - Create Core Tables

**Copy and paste this entire block into the SQL Editor, then click "Run":**

```sql
-- Migration: 001_create_core_tables.sql
-- Creates core tables: users (profile), products (finds), listings

-- Users/Profiles Table
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

-- Products Table (Finds/Inventory)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  size TEXT,
  colour TEXT,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair')),
  description TEXT,
  source_type TEXT CHECK (source_type IN ('house_clearance', 'charity_shop', 'car_boot', 'online_haul', 'flea_market', 'other')),
  source_name TEXT,
  sourced_at TIMESTAMP,
  cost_gbp DECIMAL(10, 2),
  asking_price_gbp DECIMAL(10, 2),
  sold_price_gbp DECIMAL(10, 2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'listed', 'on_hold', 'sold')),
  sold_at TIMESTAMP,
  photos TEXT[] DEFAULT '{}',
  ai_generated_description TEXT,
  ai_suggested_price_low DECIMAL(10, 2),
  ai_suggested_price_high DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Listings Table (Cross-marketplace)
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('vinted', 'ebay', 'etsy', 'shopify')),
  platform_listing_id TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'sold', 'delisted')),
  listed_at TIMESTAMP,
  delisted_at TIMESTAMP,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_user_status ON products(user_id, status);
CREATE INDEX IF NOT EXISTS idx_listings_product_id ON listings(product_id);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_platform ON listings(platform);
CREATE INDEX IF NOT EXISTS idx_listings_user_platform ON listings(user_id, platform);
```

**Expected Result:**
- "CREATE TABLE" message for each table
- "CREATE INDEX" message for each index
- No errors

---

## Step 3: Run Migration 002 - Create Operations Tables

**Create a new SQL tab (click the + next to "New"), then copy and paste:**

```sql
-- Migration: 002_create_operations_tables.sql
-- Creates expense and mileage tables for tax tracking

-- Expenses Table (Business expenses)
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('packaging', 'postage', 'platform_fees', 'supplies', 'vehicle', 'other')),
  amount_gbp DECIMAL(10, 2) NOT NULL,
  vat_amount_gbp DECIMAL(10, 2),
  description TEXT,
  receipt_url TEXT,
  date DATE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Mileage Table (HMRC-compliant tracking)
CREATE TABLE IF NOT EXISTS mileage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  miles DECIMAL(5, 2) NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('car_boot', 'charity_shop', 'house_clearance', 'sourcing', 'delivery', 'other')),
  from_location TEXT,
  to_location TEXT,
  vehicle TEXT NOT NULL,
  deductible_value_gbp DECIMAL(10, 2) GENERATED ALWAYS AS (miles * 0.45) STORED,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_mileage_user_id ON mileage(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_user_date ON mileage(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_vehicle ON mileage(vehicle);
```

**Expected Result:**
- "CREATE TABLE" message for expenses and mileage
- "CREATE INDEX" message for indexes
- No errors

---

## Step 4: Run Migration 003 - Enable RLS (Row-Level Security)

**Create a new SQL tab, then copy and paste:**

```sql
-- Migration: 003_enable_rls.sql
-- Enables Row-Level Security (RLS) on all tables
-- Users can only access their own data

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
```

**Expected Result:**
- "ALTER TABLE" messages (4 per table)
- "CREATE POLICY" messages (10 total)
- No errors

---

## Step 5: Verify Tables Created

Go to: https://supabase.com/dashboard/project/updcyyvkauqenhztmbay/editor

You should see these tables in the left sidebar:
- `profiles`
- `products`
- `listings`
- `expenses`
- `mileage`

Click each one to confirm structure is correct.

---

## Step 6: Test Connection Locally

In your terminal:

```bash
cd /Volumes/ExternalAI/github/wrenlist-clean
npm run dev
```

Open `http://localhost:3000` in browser.

You should see the Wrenlist landing page.

---

## Step 7: Test Authentication Flow

1. Click "Sign Up" or go to `/register`
2. Enter email: `testuser@example.com`
3. Enter password: `TestPass123!`
4. Click "Sign Up"
5. Check your email for verification link
6. Click the link (should redirect to `/verify-email`)
7. Click "I've verified my email"
8. Should redirect to `/app/dashboard`

**Expected:** Dashboard loads with authenticated user

---

## Step 8: Test API Endpoints

With the browser dev tools open (F12), go to `/app/expenses`:

1. Fill in:
   - Category: "supplies"
   - Amount: "15.99"
   - Description: "Test supplies"
2. Click "Add Expense"
3. Check Network tab - POST to `/api/expenses` should return 200
4. Expense should appear in list below

Go to `/app/mileage`:

1. Fill in:
   - Date: Today's date
   - Miles: "25"
   - Purpose: "sourcing"
   - Vehicle: "Test Car"
2. Click "Add Mileage"
3. Deductible should calculate: 25 × £0.45 = £11.25
4. Mileage should appear in list

---

## Troubleshooting

### If you get "table doesn't exist" error:
- Verify all 3 migrations ran successfully
- Check the SQL Editor Results tab for any errors
- Go to Table Editor and confirm tables appear

### If authentication fails:
- Check `.env.local` has correct SUPABASE_URL and ANON_KEY
- Verify email provider is configured (check Supabase Auth settings)
- Check browser console for any CORS errors

### If forms don't submit:
- Open browser DevTools (F12)
- Go to Network tab
- Try submitting form
- Check the API request for error response
- Verify RLS policies are working (should allow INSERT)

---

## Next Steps

Once verified:
1. Deploy to Vercel: `git push`
2. Run Vercel preview tests
3. Update marketing pages
4. Configure Stripe integration
5. Launch beta program

---

**Status**: All migrations ready. Manual deployment via Supabase Dashboard required.
