-- Stash expansion: capacity, archive, nesting, activity log, count RPC
-- See stash plan in conversation 2026-04-10

-- 1. New columns on stashes
ALTER TABLE public.stashes
  ADD COLUMN IF NOT EXISTS capacity int,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_stash_id uuid REFERENCES public.stashes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS stashes_parent_stash_id_idx ON public.stashes(parent_stash_id);
CREATE INDEX IF NOT EXISTS stashes_archived_at_idx ON public.stashes(archived_at);

-- 2. Activity log table
CREATE TABLE IF NOT EXISTS public.stash_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stash_id uuid REFERENCES public.stashes(id) ON DELETE SET NULL,
  find_id uuid REFERENCES public.finds(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('added','removed','moved','merged')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stash_activity_user_id_idx ON public.stash_activity(user_id);
CREATE INDEX IF NOT EXISTS stash_activity_stash_id_idx ON public.stash_activity(stash_id);
CREATE INDEX IF NOT EXISTS stash_activity_find_id_idx ON public.stash_activity(find_id);
CREATE INDEX IF NOT EXISTS stash_activity_created_at_idx ON public.stash_activity(created_at DESC);

ALTER TABLE public.stash_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own stash_activity" ON public.stash_activity;
CREATE POLICY "Users read own stash_activity" ON public.stash_activity
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own stash_activity" ON public.stash_activity;
CREATE POLICY "Users insert own stash_activity" ON public.stash_activity
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Count RPC — one query instead of paginating finds
CREATE OR REPLACE FUNCTION public.get_stash_item_counts(p_user_id uuid)
RETURNS TABLE(stash_id uuid, item_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.stash_id, count(*)::bigint AS item_count
  FROM public.finds f
  WHERE f.user_id = p_user_id
    AND f.stash_id IS NOT NULL
  GROUP BY f.stash_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_stash_item_counts(uuid) TO authenticated;
