-- GDPR-compliant churn tracking + anonymised sales data retention
-- No PII stored — safe under GDPR Recital 26 (anonymised data)

-- 1. Churn ledger — one row per deleted account, no user_id
CREATE TABLE IF NOT EXISTS deleted_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at timestamptz NOT NULL DEFAULT now(),
  account_created_at timestamptz,
  plan text NOT NULL DEFAULT 'free',
  reason text,
  feedback text,
  alternative_tool text,
  days_active integer,
  total_finds integer DEFAULT 0,
  total_sold integer DEFAULT 0,
  total_revenue_gbp numeric(10,2) DEFAULT 0,
  platforms_connected integer DEFAULT 0,
  platforms_used text[]
);

-- RLS: admin-read-only via service role, no public access
ALTER TABLE deleted_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on deleted_accounts"
  ON deleted_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Anonymised sales data — product/pricing data stripped of PII for ML training
CREATE TABLE IF NOT EXISTS anonymised_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,
  brand text,
  condition text,
  size text,
  colour text,
  cost_gbp numeric(10,2),
  asking_price_gbp numeric(10,2),
  sold_price_gbp numeric(10,2),
  status text,
  sourced_at timestamptz,
  listed_at timestamptz,
  sold_at timestamptz,
  days_to_sell integer,
  marketplace text,
  source_type text,
  selected_marketplaces text[],
  created_at timestamptz DEFAULT now()
);

-- RLS: admin-read-only via service role
ALTER TABLE anonymised_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on anonymised_sales"
  ON anonymised_sales FOR ALL TO service_role USING (true) WITH CHECK (true);
