-- AI corrections log.
--
-- Captures every time the user accepts, rejects, or overrides an AI
-- suggestion when adding a find. This is the single source of truth for:
--   1. measuring how often the model gets each field wrong
--   2. building a per-user few-shot bank (retrieve nearest past corrections
--      and inject them into future prompts)
--   3. replaying historical corrections as an eval set when prompts change
--
-- Two kinds of rows:
--   action='applied'  — user clicked Apply on the AI banner. We snapshot
--                       the original suggestion and which fields were kept.
--   action='refined'  — user used the chat refinement to ask the model to
--                       try again. We store the user's feedback prompt and
--                       the new suggestion so we can see what kind of
--                       corrections actually help.
--   action='final'    — find got saved/published. final_values shows what
--                       actually shipped, so we can diff vs the AI's
--                       original suggestion at any granularity later.

create table if not exists ai_corrections (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users(id) on delete cascade,
  find_id uuid references finds(id) on delete set null,

  action text not null check (action in ('applied', 'refined', 'final')),

  -- Snapshot of the AI suggestion at the moment of this row.
  -- Shape mirrors the identify-from-photo response: {title, description,
  -- category, condition, confidence, suggestedQuery, suggestedPrice}.
  suggestion jsonb not null,

  -- Per-field outcome for action='applied':
  --   { title: 'kept', description: 'rejected', category: 'overridden', ... }
  -- 'kept'       = checkbox left on, value taken as-is
  -- 'rejected'   = checkbox unchecked
  -- 'overridden' = applied but a different value already in the form (we
  --                store both via final_values)
  field_outcomes jsonb,

  -- For action='refined': what the user typed to ask Wren to try again.
  user_feedback text,

  -- For action='final': what actually got saved (subset of FormData).
  final_values jsonb,

  -- Free-form context useful for debugging + future analysis.
  prompt_version int,
  model text,
  confidence text,                -- 'high' | 'medium' | 'low' from the suggestion
  photo_count int,

  created_at timestamptz not null default now()
);

create index if not exists idx_ai_corrections_user on ai_corrections (user_id);
create index if not exists idx_ai_corrections_find on ai_corrections (find_id);
create index if not exists idx_ai_corrections_action on ai_corrections (action);
create index if not exists idx_ai_corrections_created on ai_corrections (created_at desc);

alter table ai_corrections enable row level security;

create policy "ai_corrections_select_own"
  on ai_corrections for select
  using (auth.uid() = user_id);

create policy "ai_corrections_service_write"
  on ai_corrections for all
  to service_role
  using (true)
  with check (true);

comment on table ai_corrections is 'Per-user AI suggestion outcomes. Source of truth for retraining prompts and building a few-shot bank.';
