-- Add needs_publish to product_marketplace_data status check constraint
-- This status is used by the publish queue flow to mark items ready for publishing

ALTER TABLE product_marketplace_data DROP CONSTRAINT product_marketplace_data_status_check;
ALTER TABLE product_marketplace_data ADD CONSTRAINT product_marketplace_data_status_check
  CHECK (status IN ('not_listed', 'needs_publish', 'listed', 'sold', 'error', 'delisted', 'needs_delist'));
