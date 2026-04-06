-- Migration: Widen miles column to support HMRC 10k+ threshold tracking
-- DECIMAL(5,2) maxes at 999.99 — need DECIMAL(8,2) for up to 999,999.99
ALTER TABLE mileage ALTER COLUMN miles TYPE DECIMAL(8, 2);
