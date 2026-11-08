-- Settings table for سلتي modules.
-- module_num is the 1-based sidebar position (1 = شريط العروض العلوي).
-- `settings` is JSONB so each module can store its own shape.

create table if not exists public.settings (
  id bigint generated always as identity primary key,
  module_num smallint not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint settings_module_num_key unique (module_num)
);

comment on table public.settings is
  'Per-module settings for سلتي. module_num 1 = شريط العروض العلوي.';

-- Indexed lookup by module_num (also covered by the unique constraint, but
-- kept explicit per request).
create index if not exists settings_module_num_idx
  on public.settings (module_num);

-- Auto-update updated_at on every change.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row
  execute function public.set_updated_at();

-- RLS: permissive for now (single-store demo). Tighten by merchant/session later.
alter table public.settings enable row level security;

drop policy if exists "settings read" on public.settings;
drop policy if exists "settings write" on public.settings;
drop policy if exists "settings update" on public.settings;

create policy "settings read"   on public.settings for select using (true);
create policy "settings write"  on public.settings for insert with check (true);
create policy "settings update" on public.settings for update using (true) with check (true);

-- Seed one row per module (1..21). Module 1 keeps an empty settings object;
-- the app fills in the offers-bar default config on first read.
insert into public.settings (module_num)
select g from generate_series(1, 21) as g
on conflict (module_num) do nothing;