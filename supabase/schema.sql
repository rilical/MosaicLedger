-- Hackathon-grade schema. This is production-shaped, not production-complete.
-- Apply in Supabase SQL editor or via migrations later.

-- 1) User profiles
create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  display_name text,
  locale text,
  currency text default 'USD'
);

alter table public.user_profiles enable row level security;

drop policy if exists "profiles_select_own" on public.user_profiles;
create policy "profiles_select_own"
on public.user_profiles
for select
using (auth.uid() = user_id);

drop policy if exists "profiles_upsert_own" on public.user_profiles;
create policy "profiles_upsert_own"
on public.user_profiles
for insert
with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own"
on public.user_profiles
for update
using (auth.uid() = user_id);


-- 2) Plaid items (per user)
create table if not exists public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  provider text not null default 'plaid',
  item_id text,

  -- WARNING: Storing access tokens in plaintext is NOT acceptable for real production.
  -- For hackathon MVP only. Replace with Vault/KMS encryption before any real deployment.
  access_token text not null,

  status text not null default 'active'
);

create index if not exists plaid_items_user_id_idx on public.plaid_items (user_id);

alter table public.plaid_items enable row level security;

drop policy if exists "plaid_items_select_own" on public.plaid_items;
create policy "plaid_items_select_own"
on public.plaid_items
for select
using (auth.uid() = user_id);

drop policy if exists "plaid_items_insert_own" on public.plaid_items;
create policy "plaid_items_insert_own"
on public.plaid_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "plaid_items_update_own" on public.plaid_items;
create policy "plaid_items_update_own"
on public.plaid_items
for update
using (auth.uid() = user_id);


-- 3) User overrides (categorization / recurring fixes)
create table if not exists public.user_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  kind text not null, -- 'merchant_category' | 'ignore_recurring' | etc
  key text not null,
  value jsonb not null
);

create index if not exists user_overrides_user_id_idx on public.user_overrides (user_id);
create unique index if not exists user_overrides_user_kind_key_uniq on public.user_overrides (user_id, kind, key);

alter table public.user_overrides enable row level security;

drop policy if exists "overrides_select_own" on public.user_overrides;
create policy "overrides_select_own"
on public.user_overrides
for select
using (auth.uid() = user_id);

drop policy if exists "overrides_upsert_own" on public.user_overrides;
create policy "overrides_upsert_own"
on public.user_overrides
for insert
with check (auth.uid() = user_id);

drop policy if exists "overrides_update_own" on public.user_overrides;
create policy "overrides_update_own"
on public.user_overrides
for update
using (auth.uid() = user_id);


-- 4) Analysis artifacts (cached outputs)
create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  source text not null default 'engine',
  -- For hackathon: store outputs as JSON. Split tables can come later.
  summary_json jsonb not null,
  mosaic_json jsonb not null,
  recurring_json jsonb not null,
  action_plan_json jsonb not null
);

create index if not exists analysis_runs_user_created_idx on public.analysis_runs (user_id, created_at desc);

alter table public.analysis_runs enable row level security;

drop policy if exists "analysis_runs_select_own" on public.analysis_runs;
create policy "analysis_runs_select_own"
on public.analysis_runs
for select
using (auth.uid() = user_id);

drop policy if exists "analysis_runs_insert_own" on public.analysis_runs;
create policy "analysis_runs_insert_own"
on public.analysis_runs
for insert
with check (auth.uid() = user_id);
