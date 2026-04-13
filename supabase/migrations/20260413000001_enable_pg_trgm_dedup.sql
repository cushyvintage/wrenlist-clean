-- Enable pg_trgm for fuzzy text matching + create dedup infrastructure
-- Used by cross-marketplace duplicate detection system

-- 1. Enable extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN indexes for trigram similarity on finds
CREATE INDEX IF NOT EXISTS idx_finds_name_trgm ON public.finds USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_finds_brand_trgm ON public.finds USING GIN (brand gin_trgm_ops);

-- 3. Dismissed pairs table (so dismissed dupes don't resurface)
CREATE TABLE IF NOT EXISTS public.dedup_dismissed_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  find_id_a uuid NOT NULL REFERENCES public.finds(id) ON DELETE CASCADE,
  find_id_b uuid NOT NULL REFERENCES public.finds(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, find_id_a, find_id_b)
);

CREATE INDEX IF NOT EXISTS idx_dedup_dismissed_user ON public.dedup_dismissed_pairs(user_id);

ALTER TABLE public.dedup_dismissed_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dismissed pairs"
  ON public.dedup_dismissed_pairs
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. RPC: find dedup candidates (cross-marketplace fuzzy title matches)
CREATE OR REPLACE FUNCTION public.find_dedup_candidates(
  p_user_id uuid,
  p_threshold float DEFAULT 0.4,
  p_limit int DEFAULT 20
)
RETURNS TABLE(
  find_a_id uuid,
  find_a_name text,
  find_a_photos text[],
  find_a_brand text,
  find_a_marketplaces text[],
  find_a_status text,
  find_a_description text,
  find_a_created_at timestamptz,
  find_b_id uuid,
  find_b_name text,
  find_b_photos text[],
  find_b_brand text,
  find_b_marketplaces text[],
  find_b_status text,
  find_b_description text,
  find_b_created_at timestamptz,
  similarity_score float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id, a.name, a.photos, a.brand, a.selected_marketplaces, a.status::text, a.description, a.created_at,
    b.id, b.name, b.photos, b.brand, b.selected_marketplaces, b.status::text, b.description, b.created_at,
    similarity(a.name, b.name)::float AS sim
  FROM finds a
  JOIN finds b ON a.user_id = b.user_id
    AND a.id < b.id
    AND similarity(a.name, b.name) > p_threshold
  WHERE a.user_id = p_user_id
    -- Cross-marketplace only: different marketplace arrays
    -- Cross-marketplace: at least one find has a marketplace the other doesn't
    AND NOT (COALESCE(a.selected_marketplaces, '{}') @> COALESCE(b.selected_marketplaces, '{}')
         AND COALESCE(b.selected_marketplaces, '{}') @> COALESCE(a.selected_marketplaces, '{}'))
    -- Exclude dismissed pairs
    AND NOT EXISTS (
      SELECT 1 FROM dedup_dismissed_pairs d
      WHERE d.user_id = p_user_id
        AND ((d.find_id_a = a.id AND d.find_id_b = b.id)
          OR (d.find_id_a = b.id AND d.find_id_b = a.id))
    )
  ORDER BY sim DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.find_dedup_candidates(uuid, float, int) TO authenticated;

-- 5. RPC: merge two finds (atomic — reassign PMD, merge marketplaces, delete duplicate)
CREATE OR REPLACE FUNCTION public.merge_finds(
  p_user_id uuid,
  p_keeper_id uuid,
  p_duplicate_id uuid
)
RETURNS TABLE(moved_pmd_rows int, merged_marketplaces text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moved int := 0;
  v_keeper_marketplaces text[];
  v_duplicate_marketplaces text[];
  v_merged text[];
  v_keeper_owner uuid;
  v_duplicate_owner uuid;
BEGIN
  -- Guard: both finds must belong to user
  SELECT user_id INTO v_keeper_owner FROM public.finds WHERE id = p_keeper_id;
  SELECT user_id INTO v_duplicate_owner FROM public.finds WHERE id = p_duplicate_id;

  IF v_keeper_owner IS NULL OR v_duplicate_owner IS NULL THEN
    RAISE EXCEPTION 'One or both finds not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_keeper_owner <> p_user_id OR v_duplicate_owner <> p_user_id THEN
    RAISE EXCEPTION 'Finds do not belong to user' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_keeper_id = p_duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge a find with itself' USING ERRCODE = 'check_violation';
  END IF;

  -- 1. Delete conflicting PMD rows (same marketplace on both finds — keeper wins)
  DELETE FROM public.product_marketplace_data
  WHERE find_id = p_duplicate_id
    AND marketplace IN (
      SELECT marketplace FROM public.product_marketplace_data WHERE find_id = p_keeper_id
    );

  -- 2. Move remaining PMD rows from duplicate to keeper
  WITH updated AS (
    UPDATE public.product_marketplace_data
    SET find_id = p_keeper_id, updated_at = now()
    WHERE find_id = p_duplicate_id
    RETURNING id
  )
  SELECT count(*) INTO v_moved FROM updated;

  -- 3. Merge selected_marketplaces arrays (union, deduplicate)
  SELECT COALESCE(selected_marketplaces, '{}') INTO v_keeper_marketplaces
  FROM public.finds WHERE id = p_keeper_id;

  SELECT COALESCE(selected_marketplaces, '{}') INTO v_duplicate_marketplaces
  FROM public.finds WHERE id = p_duplicate_id;

  SELECT ARRAY(
    SELECT DISTINCT unnest(v_keeper_marketplaces || v_duplicate_marketplaces)
  ) INTO v_merged;

  UPDATE public.finds
  SET selected_marketplaces = v_merged, updated_at = now()
  WHERE id = p_keeper_id;

  -- 4. Delete the duplicate find (CASCADE cleans up remaining FK refs)
  DELETE FROM public.finds WHERE id = p_duplicate_id;

  -- 5. Clean up dismissed pairs referencing deleted find
  DELETE FROM public.dedup_dismissed_pairs
  WHERE find_id_a = p_duplicate_id OR find_id_b = p_duplicate_id;

  RETURN QUERY SELECT v_moved, v_merged;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_finds(uuid, uuid, uuid) TO authenticated;

-- 6. RPC: lightweight import-time title check
CREATE OR REPLACE FUNCTION public.check_dedup_title(
  p_user_id uuid,
  p_title text,
  p_limit int DEFAULT 3
)
RETURNS TABLE(
  find_id uuid,
  find_name text,
  find_photos text[],
  find_marketplaces text[],
  sim float
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id,
    f.name,
    f.photos,
    f.selected_marketplaces,
    similarity(f.name, p_title)::float
  FROM finds f
  WHERE f.user_id = p_user_id
    AND similarity(f.name, p_title) > 0.35
  ORDER BY similarity(f.name, p_title) DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.check_dedup_title(uuid, text, int) TO authenticated;
