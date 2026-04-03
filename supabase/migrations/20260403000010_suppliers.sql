-- Create suppliers table
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('house_clearance', 'charity_shop', 'car_boot', 'flea_market', 'online', 'other')),
  location TEXT,
  contact_name TEXT,
  phone TEXT,
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_suppliers_user ON suppliers(user_id);
CREATE INDEX idx_suppliers_user_created ON suppliers(user_id, created_at DESC);

-- Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own suppliers
CREATE POLICY "Users manage own suppliers" ON suppliers
  USING (auth.uid()::UUID = user_id)
  WITH CHECK (auth.uid()::UUID = user_id);
