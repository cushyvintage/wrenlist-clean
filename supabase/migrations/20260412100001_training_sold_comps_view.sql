-- training_sold_comps: ML-ready view joining finds + PMD (sold) + customers
-- Service-role only — not exposed to regular users via RLS
-- One row per sold PMD record (a find sold on multiple platforms = multiple rows)

CREATE OR REPLACE VIEW public.training_sold_comps AS
SELECT
  f.id                                          AS find_id,
  pmd.marketplace,
  f.name                                        AS title,
  f.description,
  f.condition,
  f.category,
  f.brand,
  f.size,
  f.colour,
  pmd.listing_price,
  f.sold_price_gbp,
  f.asking_price_gbp,
  pmd.created_at                                AS listed_at,
  COALESCE(f.sold_at, pmd.updated_at)           AS sold_at,
  EXTRACT(DAY FROM
    COALESCE(f.sold_at, pmd.updated_at) - pmd.created_at
  )::int                                        AS days_to_sell,
  f.cost_gbp,
  CASE
    WHEN f.sold_price_gbp IS NOT NULL AND f.cost_gbp IS NOT NULL
    THEN f.sold_price_gbp - f.cost_gbp
    ELSE NULL
  END                                           AS profit_gbp,
  f.platform_fields,
  pmd.platform_category_id,
  pmd.platform_listing_id,
  c.marketplace                                 AS buyer_marketplace,
  c.username                                    AS buyer_username,
  f.photos,
  f.sku,
  f.shipping_weight_grams,
  f.user_id
FROM product_marketplace_data pmd
JOIN finds f ON f.id = pmd.find_id
LEFT JOIN customers c ON c.id = pmd.customer_id
WHERE pmd.status = 'sold';

-- Grant access to service_role only (anon/authenticated cannot query this view)
REVOKE ALL ON public.training_sold_comps FROM anon, authenticated;
GRANT SELECT ON public.training_sold_comps TO service_role;

-- Full-text search index on finds for the helper function
-- GIN index on name + description for to_tsvector queries
CREATE INDEX IF NOT EXISTS idx_finds_fts
  ON finds
  USING GIN (to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

COMMENT ON VIEW public.training_sold_comps IS
  'ML training view: one row per sold marketplace listing. Service-role only. Joins finds + PMD (sold) + customers.';
