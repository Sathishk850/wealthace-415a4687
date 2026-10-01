alter table public.payment_accounts
  add column if not exists currency text not null default 'INR';
alter table public.money_transactions
  add column if not exists is_transfer boolean not null default false,
  add column if not exists transfer_ref text;
create index if not exists idx_money_transactions_transfer_ref
  on public.money_transactions (transfer_ref)
  where transfer_ref is not null;