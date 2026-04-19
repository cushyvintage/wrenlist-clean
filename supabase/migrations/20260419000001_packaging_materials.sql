-- packaging_materials: user-managed inventory of packaging supplies
-- (poly mailers, boxes, tissue paper, tape, etc.)
--
-- Cost-per-item-sold attribution and per-find-type linking are deferred
-- until users have enough data to make them meaningful.

CREATE TABLE IF NOT EXISTS packaging_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'mailers', 'boxes', 'protection', 'presentation', 'branding', 'tape', 'labels', 'other'
  )),
  cost_per_unit_gbp NUMERIC(10,2),
  stock_qty INTEGER NOT NULL DEFAULT 0,
  min_stock_qty INTEGER NOT NULL DEFAULT 0,
  supplier TEXT,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT packaging_materials_stock_qty_nonneg CHECK (stock_qty >= 0),
  CONSTRAINT packaging_materials_min_stock_nonneg CHECK (min_stock_qty >= 0),
  CONSTRAINT packaging_materials_cost_nonneg CHECK (cost_per_unit_gbp IS NULL OR cost_per_unit_gbp >= 0)
);

CREATE INDEX IF NOT EXISTS idx_packaging_materials_user_id
  ON packaging_materials (user_id, archived_at);

ALTER TABLE packaging_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own packaging materials" ON packaging_materials
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
