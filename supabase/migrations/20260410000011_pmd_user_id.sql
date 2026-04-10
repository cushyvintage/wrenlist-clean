-- Add user_id to product_marketplace_data so queries scope by user without
-- round-tripping through finds. Previously PMD ownership was implied via
-- find_id → finds.user_id, which forced .in('find_id', [huge list]) queries
-- that blew past PostgREST URL length limits for users with many finds.

ALTER TABLE product_marketplace_data
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE product_marketplace_data pmd
SET user_id = f.user_id
FROM finds f
WHERE pmd.find_id = f.id
  AND pmd.user_id IS NULL;

ALTER TABLE product_marketplace_data
  ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pmd_user_id
  ON product_marketplace_data (user_id);

CREATE INDEX IF NOT EXISTS idx_pmd_user_status
  ON product_marketplace_data (user_id, status);

-- Auto-populate user_id on INSERT so existing insert sites keep working.
CREATE OR REPLACE FUNCTION pmd_set_user_id_from_find()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM finds WHERE id = NEW.find_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pmd_set_user_id_trigger ON product_marketplace_data;
CREATE TRIGGER pmd_set_user_id_trigger
  BEFORE INSERT ON product_marketplace_data
  FOR EACH ROW
  EXECUTE FUNCTION pmd_set_user_id_from_find();

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'pmd_user_select_direct' AND tablename = 'product_marketplace_data') THEN
    CREATE POLICY "pmd_user_select_direct" ON product_marketplace_data
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;
