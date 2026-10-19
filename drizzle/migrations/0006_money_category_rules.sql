create table if not exists public.money_category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  keywords text[] not null,
  category_id text not null,
  kind text not null check (kind in ('income','expense')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.money_category_rules to authenticated;
grant all on public.money_category_rules to service_role;
alter table public.money_category_rules enable row level security;
drop policy if exists "own" on public.money_category_rules;
create policy "own" on public.money_category_rules for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists idx_category_rules_user on public.money_category_rules(user_id);