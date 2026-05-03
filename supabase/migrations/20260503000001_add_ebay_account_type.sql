-- Add account_type field to ebay_seller_config
-- Tracks whether user is Individual, Business, or Enterprise seller
-- Affects fee structure and available features

ALTER TABLE ebay_seller_config
ADD COLUMN account_type text DEFAULT 'Individual',
ADD COLUMN seller_business_type text,
ADD COLUMN positive_feedback_percent numeric,
ADD COLUMN feedback_score integer;

-- seller_business_type can be: Individual, Business, Enterprise
-- This info used for fee estimation in add-find form
