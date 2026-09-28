alter table public.wealth_snapshots add column if not exists annotation text;
alter table public.planner_goals add column if not exists linked_investment_ids uuid[] not null default '{}';