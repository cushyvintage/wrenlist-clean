-- Expand marketplace constraint to support all extension-supported platforms
ALTER TABLE product_marketplace_data DROP CONSTRAINT IF EXISTS product_marketplace_data_marketplace_check;
ALTER TABLE product_marketplace_data ADD CONSTRAINT product_marketplace_data_marketplace_check
  CHECK (marketplace IN ('vinted', 'ebay', 'etsy', 'shopify', 'depop', 'poshmark', 'mercari', 'facebook', 'whatnot', 'grailed'));
