-- Public roadmap with user submissions + upvoting
--
-- Two tables:
--   roadmap_items  — the feature requests (readable by anyone, writable by service role + owner for pending)
--   roadmap_votes  — one row per (user, item) — enforces one vote per user per item via PK
--
-- Page is public, voting and submission are gated behind auth at the API layer.

CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  description text NOT NULL CHECK (char_length(description) BETWEEN 0 AND 600),
  tag text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'under_consideration'
    CHECK (status IN ('under_consideration', 'planned', 'in_progress', 'released', 'rejected')),
  featured boolean NOT NULL DEFAULT false,
  submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS roadmap_items_status_idx ON public.roadmap_items(status);
CREATE INDEX IF NOT EXISTS roadmap_items_created_at_idx ON public.roadmap_items(created_at DESC);

CREATE TABLE IF NOT EXISTS public.roadmap_votes (
  item_id uuid NOT NULL REFERENCES public.roadmap_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS roadmap_votes_user_idx ON public.roadmap_votes(user_id);

-- RLS
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_votes ENABLE ROW LEVEL SECURITY;

-- roadmap_items: anyone (including anon) can read; only service role writes.
-- Submissions go through an authenticated API route that uses the service role client,
-- so we don't need an INSERT policy for authenticated users here.
DROP POLICY IF EXISTS "Anyone can read roadmap items" ON public.roadmap_items;
CREATE POLICY "Anyone can read roadmap items"
  ON public.roadmap_items
  AS PERMISSIVE FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role manages roadmap items" ON public.roadmap_items;
CREATE POLICY "Service role manages roadmap items"
  ON public.roadmap_items
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- roadmap_votes: anyone can read aggregate counts via SELECT; users can insert/delete their own.
DROP POLICY IF EXISTS "Anyone can read roadmap votes" ON public.roadmap_votes;
CREATE POLICY "Anyone can read roadmap votes"
  ON public.roadmap_votes
  AS PERMISSIVE FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert own vote" ON public.roadmap_votes;
CREATE POLICY "Users can insert own vote"
  ON public.roadmap_votes
  AS PERMISSIVE FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own vote" ON public.roadmap_votes;
CREATE POLICY "Users can delete own vote"
  ON public.roadmap_votes
  AS PERMISSIVE FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role manages roadmap votes" ON public.roadmap_votes;
CREATE POLICY "Service role manages roadmap votes"
  ON public.roadmap_votes
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_roadmap_items_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS roadmap_items_touch_updated_at ON public.roadmap_items;
CREATE TRIGGER roadmap_items_touch_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_roadmap_items_updated_at();

-- Seed with the existing hardcoded items from src/app/(marketing)/roadmap/page.tsx
-- (vote counts become real starting from 0 — the old numbers were fictional)
INSERT INTO public.roadmap_items (title, description, tag, status, featured) VALUES
  -- In progress
  ('Mobile add-find (full flow)', 'Complete mobile-optimised add-find experience with photo capture, barcode scan, and instant crosslist from your phone at the rack.', 'mobile', 'in_progress', false),
  ('Sourcing analytics', 'Deep analytics on which sourcing locations (charity shops, car boots, house clearances) give you the best ROI and sell-through rates.', 'analytics', 'in_progress', false),
  ('Wren AI pricing engine v2', 'Smarter comp pricing that shows sold comps, not just list prices, for more accurate price suggestions across all platforms.', 'ai', 'in_progress', false),
  -- Planned
  ('Depop integration', 'List and sync inventory to Depop — popular with Gen Z vintage buyers.', 'marketplace', 'planned', true),
  ('eBay Simple Delivery support', 'Automatically select eBay''s Simple Delivery option when listing, reducing friction for new sellers.', 'ebay', 'planned', false),
  ('Shopify collections & tags sync', 'Map Wrenlist categories to Shopify collections and auto-tag products on publish.', 'shopify', 'planned', false),
  ('Wren AI listing improvements', 'Better category-specific prompts, brand recognition, and condition language for AI-generated listings.', 'ai', 'planned', false),
  ('Price drop automation', 'Auto-reduce asking price by X% after Y days without a sale, across all platforms.', 'automation', 'planned', false),
  -- Under consideration
  ('Facebook Marketplace integration', 'Crosslist finds to local Facebook Marketplace listings.', 'marketplace', 'under_consideration', false),
  ('Bulk price update across platforms', 'Change asking price on one find and push it to all active listings simultaneously.', 'listings', 'under_consideration', false),
  ('Scheduled relisting', 'Auto-relist unsold finds after X days to refresh their position in search results.', 'automation', 'under_consideration', false),
  ('Vinted Pro / Business account support', 'Specific support for Vinted Pro seller accounts and their additional features.', 'vinted', 'under_consideration', false),
  ('Native iOS & Android app', 'A dedicated mobile app for logging finds at the rack, beyond the mobile-optimised web version.', 'mobile', 'under_consideration', false),
  -- Released
  ('Vinted integration', 'Full Vinted publish + sync support.', 'marketplace', 'released', false),
  ('eBay UK integration', 'Full eBay UK publish + sync support.', 'marketplace', 'released', false),
  ('Etsy integration', 'Full Etsy publish + sync support.', 'marketplace', 'released', false),
  ('Shopify integration', 'Full Shopify publish + sync support.', 'marketplace', 'released', false),
  ('AI listing writer (Wren AI)', 'AI-generated titles, descriptions, and tags.', 'ai', 'released', false),
  ('Auto-delist on sale', 'Automatically delist from other platforms when an item sells.', 'automation', 'released', false),
  ('Bulk actions (relist, reprice)', 'Bulk operations across multiple finds at once.', 'listings', 'released', false),
  ('Cost & margin tracking', 'Track cost of goods and margin per find.', 'analytics', 'released', false),
  ('Sourcing log', 'Log sourcing trips with location, mileage, and finds.', 'analytics', 'released', false),
  ('Revenue analytics', 'Dashboard for revenue, profit, and trends.', 'analytics', 'released', false),
  ('Background removal', 'One-click photo background removal.', 'ai', 'released', false),
  ('ISBN barcode lookup', 'Auto-fill book metadata from ISBN scan.', 'books', 'released', false)
ON CONFLICT DO NOTHING;
