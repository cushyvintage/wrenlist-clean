-- Migration: Fix expenses table column mismatch + add expense_categories reference table
-- 1. Rename product_id → find_id (code uses find_id, DB had product_id)
-- 2. Update FK to reference finds(id) instead of products(id)
-- 3. Create expense_categories lookup table
-- 4. Replace CHECK constraint with FK to expense_categories

-- Step 1: Rename column and fix FK
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_product_id_fkey;
ALTER TABLE expenses RENAME COLUMN product_id TO find_id;
ALTER TABLE expenses ADD CONSTRAINT expenses_find_id_fkey
  FOREIGN KEY (find_id) REFERENCES finds(id) ON DELETE SET NULL;

-- Step 2: Create expense_categories reference table
CREATE TABLE IF NOT EXISTS expense_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

-- Seed with current categories
INSERT INTO expense_categories (id, label, sort_order) VALUES
  ('packaging', 'Packaging', 1),
  ('postage', 'Postage', 2),
  ('platform_fees', 'Platform fees', 3),
  ('supplies', 'Supplies', 4),
  ('vehicle', 'Vehicle', 5),
  ('other', 'Other', 6)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Drop old CHECK constraint, add FK to expense_categories
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE expenses ADD CONSTRAINT expenses_category_fk
  FOREIGN KEY (category) REFERENCES expense_categories(id);

-- Step 4: RLS for expense_categories (read-only for all authenticated users)
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read expense categories"
  ON expense_categories FOR SELECT
  TO authenticated
  USING (true);

-- Step 5: Index on sort_order for ordered retrieval
CREATE INDEX IF NOT EXISTS idx_expense_categories_sort ON expense_categories(sort_order);
