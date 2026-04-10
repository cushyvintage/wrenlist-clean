-- Atomic stash merge RPC + cycle detection helper
-- Fixes race window between move/log/delete and ensures children get reparented

-- Cycle detector: returns true if making new_parent the parent of child_id
-- would create a cycle in the stash hierarchy.
CREATE OR REPLACE FUNCTION public.stash_would_create_cycle(p_child uuid, p_new_parent uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur uuid := p_new_parent;
  steps int := 0;
BEGIN
  IF p_new_parent IS NULL THEN RETURN false; END IF;
  IF p_child = p_new_parent THEN RETURN true; END IF;
  WHILE cur IS NOT NULL LOOP
    steps := steps + 1;
    IF steps > 64 THEN RETURN true; END IF;
    SELECT parent_stash_id INTO cur FROM public.stashes WHERE id = cur;
    IF cur = p_child THEN RETURN true; END IF;
  END LOOP;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stash_would_create_cycle(uuid, uuid) TO authenticated;

-- Atomic merge: moves finds, reparents children, deletes sources, logs activity
-- Returns summary row.
CREATE OR REPLACE FUNCTION public.merge_stashes(
  p_user_id uuid,
  p_source_ids uuid[],
  p_target_id uuid
)
RETURNS TABLE(moved_finds int, reparented_children int, deleted_sources int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_moved int := 0;
  v_reparented int := 0;
  v_deleted int := 0;
  v_source_count int;
  v_owned_count int;
BEGIN
  -- Guard: target must not be in sources
  IF p_target_id = ANY(p_source_ids) THEN
    RAISE EXCEPTION 'Target cannot be in source list' USING ERRCODE = 'check_violation';
  END IF;

  v_source_count := array_length(p_source_ids, 1);
  IF v_source_count IS NULL OR v_source_count = 0 THEN
    RAISE EXCEPTION 'At least one source is required' USING ERRCODE = 'check_violation';
  END IF;

  -- Guard: all stashes (sources + target) must belong to user
  SELECT count(*) INTO v_owned_count
  FROM public.stashes
  WHERE id = ANY(p_source_ids || ARRAY[p_target_id]::uuid[])
    AND user_id = p_user_id;

  IF v_owned_count <> v_source_count + 1 THEN
    RAISE EXCEPTION 'One or more stashes not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- 1. Move finds from source stashes to target
  WITH updated AS (
    UPDATE public.finds
    SET stash_id = p_target_id, updated_at = now()
    WHERE stash_id = ANY(p_source_ids) AND user_id = p_user_id
    RETURNING id
  )
  SELECT count(*) INTO v_moved FROM updated;

  -- 2. Log activity for each moved find
  INSERT INTO public.stash_activity (user_id, stash_id, find_id, action, note)
  SELECT p_user_id, p_target_id, f.id, 'merged',
         'Merged from ' || v_source_count || ' stash' || CASE WHEN v_source_count = 1 THEN '' ELSE 'es' END
  FROM public.finds f
  WHERE f.stash_id = p_target_id
    AND f.user_id = p_user_id
    AND f.updated_at >= now() - interval '1 minute';

  -- 3. Reparent child stashes (any stash whose parent is a source → becomes target)
  WITH reparented AS (
    UPDATE public.stashes
    SET parent_stash_id = p_target_id, updated_at = now()
    WHERE parent_stash_id = ANY(p_source_ids) AND user_id = p_user_id
    RETURNING id
  )
  SELECT count(*) INTO v_reparented FROM reparented;

  -- 4. Delete source stashes
  WITH deleted AS (
    DELETE FROM public.stashes
    WHERE id = ANY(p_source_ids) AND user_id = p_user_id
    RETURNING id
  )
  SELECT count(*) INTO v_deleted FROM deleted;

  RETURN QUERY SELECT v_moved, v_reparented, v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_stashes(uuid, uuid[], uuid) TO authenticated;
