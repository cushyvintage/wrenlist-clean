-- Migration: Add HMRC tiered mileage rates support
-- Adds vehicle_type and tax_year columns, replaces flat-rate generated column

-- Step 1: Add vehicle_type column
ALTER TABLE mileage
  ADD COLUMN vehicle_type TEXT NOT NULL DEFAULT 'car'
  CHECK (vehicle_type IN ('car', 'van', 'motorcycle', 'bicycle'));

-- Step 2: Add tax_year column (format: "2025-26")
ALTER TABLE mileage
  ADD COLUMN tax_year TEXT;

-- Step 3: Drop the generated deductible column and re-add as regular column
-- (Generated columns can't be updated directly)
ALTER TABLE mileage DROP COLUMN deductible_value_gbp;
ALTER TABLE mileage ADD COLUMN deductible_value_gbp DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Step 4: Backfill tax_year from existing dates
-- UK tax year: Apr 6 onwards = current year, before Apr 6 = previous year
UPDATE mileage SET tax_year = CASE
  WHEN EXTRACT(MONTH FROM date) > 4
    OR (EXTRACT(MONTH FROM date) = 4 AND EXTRACT(DAY FROM date) >= 6)
  THEN CONCAT(
    EXTRACT(YEAR FROM date)::INT,
    '-',
    LPAD(((EXTRACT(YEAR FROM date)::INT + 1) % 100)::TEXT, 2, '0')
  )
  ELSE CONCAT(
    (EXTRACT(YEAR FROM date)::INT - 1),
    '-',
    LPAD((EXTRACT(YEAR FROM date)::INT % 100)::TEXT, 2, '0')
  )
END;

-- Step 5: Backfill deductible_value_gbp for existing rows (all assumed car @ 45p)
UPDATE mileage SET deductible_value_gbp = miles * 0.45;

-- Step 6: Make tax_year NOT NULL now that backfill is done
ALTER TABLE mileage ALTER COLUMN tax_year SET NOT NULL;

-- Step 7: Add index for cumulative mileage queries (per user, vehicle type, tax year)
CREATE INDEX IF NOT EXISTS idx_mileage_cumulative
  ON mileage(user_id, vehicle_type, tax_year, date);
