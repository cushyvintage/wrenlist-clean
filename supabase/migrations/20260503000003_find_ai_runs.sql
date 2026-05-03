-- find_ai_runs — per-identify-call audit log.
--
-- Each row is one identify-from-photo invocation. Stores the raw
-- pre-pass outputs (LLM mark scanner, eBay searchByImage, Google
-- Vision) alongside the identifier's output and our post-hoc
-- validation result. Indexed by user + image hash so we can
-- correlate with ai_corrections rows (which key off the same hash)
-- and aggregate for the AI-stats admin dashboard.
--
-- Powers four metrics:
--   1. Acceptance rate by confidence (join with ai_corrections)
--   2. Maker validation rate over time (group by created_at week)
--   3. Per-source contribution (which layers actually surface useful
--      data — non-empty marks, ebay listings returned, vision logos)
--   4. Cost / cache hit indirectly (via run count vs cache_hit_count
--      on ai_image_cache)

create table if not exists find_ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  image_hash_set text not null,
  photo_count int not null,
  prompt_version int not null,

  -- Pre-pass results
  marks jsonb,
  ebay_similar jsonb,
  google_vision jsonb,

  -- Identifier output + validation
  identify_result jsonb,
  maker text,
  maker_validated boolean,
  confidence text,

  -- Telemetry
  latency_ms int,
  error text,

  created_at timestamptz not null default now()
);

create index if not exists idx_find_ai_runs_user_created on find_ai_runs (user_id, created_at desc);
create index if not exists idx_find_ai_runs_created on find_ai_runs (created_at desc);
create index if not exists idx_find_ai_runs_confidence on find_ai_runs (confidence);
create index if not exists idx_find_ai_runs_maker_validated on find_ai_runs (maker_validated);
create index if not exists idx_find_ai_runs_image_hash on find_ai_runs (image_hash_set);

alter table find_ai_runs enable row level security;

create policy "find_ai_runs_select_own"
  on find_ai_runs for select
  using (auth.uid() = user_id);

create policy "find_ai_runs_service_write"
  on find_ai_runs for all
  to service_role
  using (true)
  with check (true);

comment on table find_ai_runs is 'Per-identify-call audit log. Links pre-pass outputs (scanner, eBay, Vision) with the identifier output and validation result, indexed by user + image hash. Powers the AI-stats admin dashboard.';
