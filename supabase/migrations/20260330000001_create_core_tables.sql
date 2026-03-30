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

  -- Photos (stored as JSON array of URLs)
  photos TEXT[] DEFAULT '{}',

  -- AI features (future)
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

  -- Performance metrics
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
