-- Migration: 002_create_operations_tables.sql
-- Creates expense and mileage tables for tax tracking

-- Expenses Table (Business expenses)
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

-- Mileage Table (HMRC-compliant tracking)
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_mileage_user_id ON mileage(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_user_date ON mileage(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_vehicle ON mileage(vehicle);
