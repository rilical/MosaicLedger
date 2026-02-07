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

  -- Stored encrypted at rest (app-layer AES-256-GCM).
  -- Required env: PLAID_TOKEN_ENCRYPTION_KEY (32 bytes, base64).
  access_token text not null,

  -- Plaid Transactions Sync cursor (for incremental sync).
  transactions_cursor text,

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

-- 2b) Plaid transactions (per user). Enables cursor-based sync + modified/removed reconciliation.
create table if not exists public.plaid_transactions (
  user_id uuid not null references auth.users (id) on delete cascade,
  transaction_id text not null,
  item_id text,

  date date not null,
  name text not null,
  merchant_name text,
  amount numeric not null,
  category text,
  pending boolean not null default false,
  deleted boolean not null default false,

  raw_json jsonb not null,
  updated_at timestamptz not null default now(),

  primary key (user_id, transaction_id)
);

create index if not exists plaid_transactions_user_date_idx on public.plaid_transactions (user_id, date desc);
create index if not exists plaid_transactions_user_item_idx on public.plaid_transactions (user_id, item_id);

alter table public.plaid_transactions enable row level security;

drop policy if exists "plaid_tx_select_own" on public.plaid_transactions;
create policy "plaid_tx_select_own"
on public.plaid_transactions
for select
using (auth.uid() = user_id);

drop policy if exists "plaid_tx_insert_own" on public.plaid_transactions;
create policy "plaid_tx_insert_own"
on public.plaid_transactions
for insert
with check (auth.uid() = user_id);

drop policy if exists "plaid_tx_update_own" on public.plaid_transactions;
create policy "plaid_tx_update_own"
on public.plaid_transactions
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


-- 5) Nessie customer binding (per user)
-- Capital One DevExchange / Nessie mock bank identity should be stable per Supabase user.
create table if not exists public.nessie_customers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nessie_customer_id text not null,
  nessie_account_id text
);

alter table public.nessie_customers enable row level security;

drop policy if exists "nessie_customers_select_own" on public.nessie_customers;
create policy "nessie_customers_select_own"
on public.nessie_customers
for select
using (auth.uid() = user_id);

drop policy if exists "nessie_customers_upsert_own" on public.nessie_customers;
create policy "nessie_customers_upsert_own"
on public.nessie_customers
for insert
with check (auth.uid() = user_id);

drop policy if exists "nessie_customers_update_own" on public.nessie_customers;
create policy "nessie_customers_update_own"
on public.nessie_customers
for update
using (auth.uid() = user_id);


-- 6) Normalized transactions cache (per user)
-- Hackathon MVP: JSON cache for deterministic engine outputs + re-runs without vendor calls.
create table if not exists public.transactions_normalized (
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null, -- 'plaid' | 'nessie' | 'demo' | etc
  txn_id text not null,

  date date not null,
  amount numeric not null,
  merchant_raw text not null,
  merchant text not null,
  category text not null default 'Uncategorized',
  account_id text,
  pending boolean not null default false,

  raw_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  primary key (user_id, source, txn_id)
);

create index if not exists transactions_normalized_user_date_idx
on public.transactions_normalized (user_id, date desc);
create index if not exists transactions_normalized_user_source_idx
on public.transactions_normalized (user_id, source);

alter table public.transactions_normalized enable row level security;

drop policy if exists "tx_norm_select_own" on public.transactions_normalized;
create policy "tx_norm_select_own"
on public.transactions_normalized
for select
using (auth.uid() = user_id);

drop policy if exists "tx_norm_insert_own" on public.transactions_normalized;
create policy "tx_norm_insert_own"
on public.transactions_normalized
for insert
with check (auth.uid() = user_id);

drop policy if exists "tx_norm_update_own" on public.transactions_normalized;
create policy "tx_norm_update_own"
on public.transactions_normalized
for update
using (auth.uid() = user_id);
