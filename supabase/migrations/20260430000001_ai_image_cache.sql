-- AI image cache.
--
-- Same image uploaded twice → same OpenAI vision result, served from cache
-- without a second OpenAI call. Real-world reseller workflows hit this
-- constantly: re-shoot a photo, hit retry, paste the same Vinted dump twice.
-- Estimated 30%+ cache hit rate in normal use.
--
-- Key is (image_hash, purpose, model, prompt_version) — change any of those
-- and you get a fresh call. prompt_version bumps when the system prompt
-- changes meaningfully so cache invalidates with prompt changes.

create table if not exists ai_image_cache (
  id uuid primary key default gen_random_uuid(),

  -- Identity
  image_hash text not null,           -- sha-256 of image bytes
  purpose text not null,              -- AIPurpose value, e.g. 'identify_from_photo'
  model text not null,                -- e.g. 'gpt-4o'
  prompt_version int not null default 1,

  -- Cached result + telemetry
  result_json jsonb not null,
  hit_count int not null default 0,   -- incremented on each cache hit; useful for popularity / dedup analytics
  first_seen_at timestamptz not null default now(),
  last_hit_at timestamptz,

  -- Per-user shielding so one user's cached result isn't served to another
  -- (privacy + accuracy: same image hash but different prompt context might
  -- yield different categorisation for different sellers). Nullable for
  -- shared/global entries we might add later.
  user_id uuid references auth.users(id) on delete cascade,

  unique (image_hash, purpose, model, prompt_version, user_id)
);

create index if not exists idx_ai_image_cache_hash on ai_image_cache (image_hash);
create index if not exists idx_ai_image_cache_user on ai_image_cache (user_id);

-- RLS — users see only their own cache entries; service-role writes (the
-- AI route runs server-side and uses the service-role client to bypass RLS,
-- so this only matters if a client ever queries directly).
alter table ai_image_cache enable row level security;

create policy "ai_image_cache_select_own"
  on ai_image_cache for select
  using (auth.uid() = user_id);

create policy "ai_image_cache_service_write"
  on ai_image_cache for all
  to service_role
  using (true)
  with check (true);

comment on table ai_image_cache is 'Cache of OpenAI vision results keyed by image hash + purpose + model. Reduces duplicate OpenAI spend.';
