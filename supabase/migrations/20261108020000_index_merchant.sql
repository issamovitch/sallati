-- Ensure merchant_id is indexed for per-store lookups.
create index if not exists settings_merchant_id_idx
  on public.settings (merchant_id);

create index if not exists stores_merchant_id_idx
  on public.stores (merchant_id);