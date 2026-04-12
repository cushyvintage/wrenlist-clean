-- Backfill finds.sold_price_gbp and finds.sold_at from PMD where missing
-- Current data: 0 rows need backfill (all 362 sold records are complete)
-- This migration exists for future-proofing: if items are marked sold in PMD
-- before the finds row is updated, this reconciles the gap.

-- Backfill sold_price_gbp from PMD listing_price where finds has NULL
UPDATE finds f
SET sold_price_gbp = pmd.listing_price
FROM product_marketplace_data pmd
WHERE pmd.find_id = f.id
  AND pmd.status = 'sold'
  AND f.sold_price_gbp IS NULL
  AND pmd.listing_price IS NOT NULL;

-- Backfill sold_at from PMD updated_at where finds has NULL
UPDATE finds f
SET sold_at = pmd.updated_at
FROM product_marketplace_data pmd
WHERE pmd.find_id = f.id
  AND pmd.status = 'sold'
  AND f.sold_at IS NULL
  AND pmd.updated_at IS NOT NULL;

-- Also set finds.status = 'sold' if PMD says sold but finds doesn't
UPDATE finds f
SET status = 'sold'
FROM product_marketplace_data pmd
WHERE pmd.find_id = f.id
  AND pmd.status = 'sold'
  AND f.status IS DISTINCT FROM 'sold';
