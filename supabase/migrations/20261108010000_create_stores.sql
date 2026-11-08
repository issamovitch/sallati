create table if not exists public.stores (
  merchant_id bigint primary key,
  store_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists stores_set_updated_at on public.stores;
create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

alter table public.stores enable row level security;
drop policy if exists "stores read" on public.stores;
drop policy if exists "stores write" on public.stores;
drop policy if exists "stores update" on public.stores;
create policy "stores read" on public.stores for select using (true);
create policy "stores write" on public.stores for insert with check (true);
create policy "stores update" on public.stores for update using (true) with check (true);