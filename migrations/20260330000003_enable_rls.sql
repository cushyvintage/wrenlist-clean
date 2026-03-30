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

-- Users can view their own profile
CREATE POLICY "Users view own profile" ON profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PRODUCTS POLICIES
-- ============================================================================

-- Users can view their own products
CREATE POLICY "Users view own products" ON products
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert products
CREATE POLICY "Users insert own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own products
CREATE POLICY "Users update own products" ON products
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own products
CREATE POLICY "Users delete own products" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- LISTINGS POLICIES
-- ============================================================================

-- Users can view their own listings
CREATE POLICY "Users view own listings" ON listings
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert listings
CREATE POLICY "Users insert own listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own listings
CREATE POLICY "Users update own listings" ON listings
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own listings
CREATE POLICY "Users delete own listings" ON listings
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- EXPENSES POLICIES
-- ============================================================================

-- Users can view their own expenses
CREATE POLICY "Users view own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert expenses
CREATE POLICY "Users insert own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own expenses
CREATE POLICY "Users update own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own expenses
CREATE POLICY "Users delete own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- MILEAGE POLICIES
-- ============================================================================

-- Users can view their own mileage records
CREATE POLICY "Users view own mileage" ON mileage
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert mileage records
CREATE POLICY "Users insert own mileage" ON mileage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own mileage records
CREATE POLICY "Users update own mileage" ON mileage
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Users can delete their own mileage records
CREATE POLICY "Users delete own mileage" ON mileage
  FOR DELETE USING (auth.uid() = user_id);
