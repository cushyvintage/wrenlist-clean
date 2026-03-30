-- Migration: 004_seed_data.sql
-- Seed data for local development and testing
-- Replace 'test-user-id' with actual auth.uid() values from your test account

-- NOTE: To use this in development:
-- 1. Sign up a test account via the app or Supabase Auth
-- 2. Get the user ID from Supabase Dashboard (Authentication > Users)
-- 3. Replace 'test-user-id' below with your actual user ID

-- Example user ID (replace with real UUID from your test account)
-- Format: 550e8400-e29b-41d4-a716-446655440000

-- Sample Profile
INSERT INTO profiles (user_id, full_name, location, plan, finds_this_month, finds_reset_at)
VALUES (
  'test-user-id'::UUID,
  'Test User',
  'London, UK',
  'forager',
  3,
  now() - interval '5 days'
) ON CONFLICT (user_id) DO NOTHING;

-- Sample Products (Finds)
INSERT INTO products (
  user_id, name, category, brand, size, colour, condition,
  description, source_type, source_name, sourced_at,
  cost_gbp, asking_price_gbp, status, photos
) VALUES (
  'test-user-id'::UUID,
  'Vintage Levi''s 501 Denim',
  'Denim',
  'Levi''s',
  'W32 L32',
  'Dark Blue',
  'excellent',
  'Classic dark wash Levi''s 501 jeans in excellent condition. Made in USA.',
  'car_boot',
  'Portobello Road Car Boot',
  now() - interval '7 days',
  15.00,
  45.00,
  'listed',
  ARRAY['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']
);

INSERT INTO products (
  user_id, name, category, brand, size, colour, condition,
  description, source_type, sourced_at,
  cost_gbp, asking_price_gbp, status, photos
) VALUES (
  'test-user-id'::UUID,
  'Vintage Reebok Trainers',
  'Footwear',
  'Reebok',
  'UK 8',
  'White & Red',
  'good',
  '90s Reebok court trainers with original box.',
  'charity_shop',
  now() - interval '14 days',
  8.00,
  35.00,
  'on_hold',
  ARRAY['https://example.com/trainers.jpg']
);

-- Sample Listings
-- Get the first product ID to link listing
WITH first_product AS (
  SELECT id FROM products WHERE user_id = 'test-user-id'::UUID ORDER BY created_at DESC LIMIT 1
)
INSERT INTO listings (product_id, user_id, platform, platform_listing_id, status, listed_at, views)
SELECT
  id,
  'test-user-id'::UUID,
  'vinted',
  'vinted-12345678',
  'live',
  now() - interval '3 days',
  42
FROM first_product;

-- Sample Expenses
INSERT INTO expenses (user_id, category, amount_gbp, vat_amount_gbp, description, date)
VALUES (
  'test-user-id'::UUID,
  'packaging',
  12.50,
  2.50,
  'Bubble wrap and mailing boxes',
  now() - interval '5 days'
);

INSERT INTO expenses (user_id, category, amount_gbp, vat_amount_gbp, description, date)
VALUES (
  'test-user-id'::UUID,
  'postage',
  2.80,
  NULL,
  'Royal Mail Special Delivery',
  now() - interval '3 days'
);

-- Sample Mileage
INSERT INTO mileage (user_id, date, miles, purpose, from_location, to_location, vehicle)
VALUES (
  'test-user-id'::UUID,
  now()::DATE - interval '2 days',
  12.5,
  'car_boot',
  'Home (London)',
  'Portobello Road Car Boot',
  'Toyota Corolla'
);

INSERT INTO mileage (user_id, date, miles, purpose, from_location, to_location, vehicle)
VALUES (
  'test-user-id'::UUID,
  now()::DATE - interval '1 day',
  8.0,
  'sourcing',
  'Home (London)',
  'Oxfam Shop (King''s Road)',
  'Toyota Corolla'
);
