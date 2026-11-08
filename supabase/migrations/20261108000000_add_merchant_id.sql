-- Multi-tenant: scope settings per store (merchant).
alter table public.settings
  add column if not exists merchant_id bigint not null default 0;

-- Replace the single-column unique with a composite one.
alter table public.settings
  drop constraint if exists settings_module_num_key;

alter table public.settings
  add constraint settings_merchant_module_key unique (merchant_id, module_num);

-- Replace the lookup index.
drop index if exists settings_module_num_idx;
create index if not exists settings_merchant_module_idx
  on public.settings (merchant_id, module_num);

comment on column public.settings.merchant_id is
  'Salla merchant (store) id. 0 is used for local development.';