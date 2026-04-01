-- eBay OAuth state tracking (CSRF protection)
create table if not exists ebay_oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state text not null unique,
  marketplace_id text default 'EBAY_GB',
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- eBay OAuth tokens (per user + marketplace)
create table if not exists ebay_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  marketplace_id text not null default 'EBAY_GB',
  ebay_user text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamp with time zone not null,
  scope text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique(user_id, marketplace_id)
);

-- Indexes
create index if not exists idx_ebay_oauth_states_user on ebay_oauth_states(user_id);
create index if not exists idx_ebay_oauth_states_state on ebay_oauth_states(state);
create index if not exists idx_ebay_tokens_user on ebay_tokens(user_id);

-- RLS policies
alter table ebay_oauth_states enable row level security;
alter table ebay_tokens enable row level security;

create policy "Users can view own OAuth states" on ebay_oauth_states
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own OAuth states" on ebay_oauth_states
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own OAuth states" on ebay_oauth_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view own tokens" on ebay_tokens
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own tokens" on ebay_tokens
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tokens" on ebay_tokens
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
