-- Add 'draft' status to product_marketplace_data for Etsy save-as-draft flow
ALTER TABLE product_marketplace_data DROP CONSTRAINT product_marketplace_data_status_check;
ALTER TABLE product_marketplace_data ADD CONSTRAINT product_marketplace_data_status_check
  CHECK (status IN ('not_listed', 'needs_publish', 'draft', 'listed', 'sold', 'error', 'delisted', 'needs_delist'));
