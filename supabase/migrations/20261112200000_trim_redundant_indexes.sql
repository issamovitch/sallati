-- Redundant indexes: the unique/PK indexes already cover these leading
-- columns, so these only add write cost and bloat.
--   settings_merchant_id_idx      ⊂ settings_merchant_module_key (merchant_id, module_num)
--   settings_merchant_module_idx  = settings_merchant_module_key (exact duplicate)
--   stores_merchant_id_idx        = stores_pkey (merchant_id)
drop index if exists public.settings_merchant_id_idx;
drop index if exists public.settings_merchant_module_idx;
drop index if exists public.stores_merchant_id_idx;

-- Existing coverage that stays:
--   settings(merchant_id, module_num) unique  → single-row config reads and upserts
--   stores(merchant_id) primary key           → token lookups
--   luck_wheel_leads(merchant_id, created_at DESC) → per-merchant lead lists
