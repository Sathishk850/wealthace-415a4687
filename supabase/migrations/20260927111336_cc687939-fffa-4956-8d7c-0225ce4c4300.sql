create table if not exists public.snapshot_preferences (
  user_id uuid primary key,
  enabled boolean not null default false,
  frequency text not null default 'monthly',
  last_run_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.snapshot_preferences to authenticated;
grant all on public.snapshot_preferences to service_role;
alter table public.snapshot_preferences enable row level security;
drop policy if exists "own snapshot prefs" on public.snapshot_preferences;
create policy "own snapshot prefs" on public.snapshot_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists snapshot_prefs_touch on public.snapshot_preferences;
create trigger snapshot_prefs_touch before update on public.snapshot_preferences for each row execute function public.touch_updated_at();