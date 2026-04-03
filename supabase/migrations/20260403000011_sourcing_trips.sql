-- Create sourcing_trips table for trip-as-container UX
-- Each trip represents a sourcing session (car boot, charity shop, house clearance, etc)
-- Finds are linked to trips via sourcing_trip_id FK

CREATE TABLE IF NOT EXISTS sourcing_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Trip metadata
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('car_boot', 'charity_shop', 'house_clearance', 'flea_market', 'online', 'other')),
  location TEXT,
  date DATE NOT NULL,

  -- Expense tracking
  miles DECIMAL(8, 2),
  entry_fee_gbp DECIMAL(10, 2),

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster lookups by user + date
CREATE INDEX IF NOT EXISTS idx_sourcing_trips_user_date ON sourcing_trips(user_id, date DESC);

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS idx_sourcing_trips_user_id ON sourcing_trips(user_id);

-- Enable RLS
ALTER TABLE sourcing_trips ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own trips
CREATE POLICY "Users view own sourcing trips" ON sourcing_trips
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own sourcing trips" ON sourcing_trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own sourcing trips" ON sourcing_trips
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own sourcing trips" ON sourcing_trips
  FOR DELETE USING (auth.uid() = user_id);

-- Add sourcing_trip_id to finds table
ALTER TABLE finds ADD COLUMN IF NOT EXISTS sourcing_trip_id UUID REFERENCES sourcing_trips(id) ON DELETE SET NULL;

-- Index for finds by sourcing_trip_id
CREATE INDEX IF NOT EXISTS idx_finds_sourcing_trip_id ON finds(sourcing_trip_id);
