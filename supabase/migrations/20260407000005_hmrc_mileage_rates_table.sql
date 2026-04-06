-- Migration: Create HMRC mileage rates table for multi-year rate support
-- Rates are keyed by (tax_year, vehicle_type) so historical calculations remain accurate

CREATE TABLE IF NOT EXISTS hmrc_mileage_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_year TEXT NOT NULL,            -- "2025-26" format
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car', 'van', 'motorcycle', 'bicycle')),
  first_rate_pence INT NOT NULL,     -- 45 = 45p per mile (first tier)
  second_rate_pence INT,             -- 25 = 25p per mile (second tier), NULL for flat rate
  threshold_miles INT,               -- 10000, NULL for flat rate vehicles
  effective_from DATE NOT NULL,      -- tax year start (e.g. 2025-04-06)
  effective_to DATE NOT NULL,        -- tax year end (e.g. 2026-04-05)
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(tax_year, vehicle_type)
);

-- Seed rates for 3 tax years (rates unchanged since 2011)
INSERT INTO hmrc_mileage_rates (tax_year, vehicle_type, first_rate_pence, second_rate_pence, threshold_miles, effective_from, effective_to) VALUES
  ('2024-25', 'car',        45, 25,   10000, '2024-04-06', '2025-04-05'),
  ('2024-25', 'van',        45, 25,   10000, '2024-04-06', '2025-04-05'),
  ('2024-25', 'motorcycle', 24, NULL, NULL,   '2024-04-06', '2025-04-05'),
  ('2024-25', 'bicycle',    20, NULL, NULL,   '2024-04-06', '2025-04-05'),
  ('2025-26', 'car',        45, 25,   10000, '2025-04-06', '2026-04-05'),
  ('2025-26', 'van',        45, 25,   10000, '2025-04-06', '2026-04-05'),
  ('2025-26', 'motorcycle', 24, NULL, NULL,   '2025-04-06', '2026-04-05'),
  ('2025-26', 'bicycle',    20, NULL, NULL,   '2025-04-06', '2026-04-05'),
  ('2026-27', 'car',        45, 25,   10000, '2026-04-06', '2027-04-05'),
  ('2026-27', 'van',        45, 25,   10000, '2026-04-06', '2027-04-05'),
  ('2026-27', 'motorcycle', 24, NULL, NULL,   '2026-04-06', '2027-04-05'),
  ('2026-27', 'bicycle',    20, NULL, NULL,   '2026-04-06', '2027-04-05');

-- RLS: rates are public data, read-only
ALTER TABLE hmrc_mileage_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read HMRC rates" ON hmrc_mileage_rates FOR SELECT USING (true);

-- Index for rate lookups
CREATE INDEX IF NOT EXISTS idx_hmrc_rates_lookup ON hmrc_mileage_rates(tax_year, vehicle_type);
