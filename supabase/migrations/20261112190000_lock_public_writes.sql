-- Public RLS allowed anyone holding the anon key (shipped in the browser) to
-- overwrite or delete any merchant's settings/store row, and to insert leads.
-- Reads stay public (dashboard + Realtime use the publishable key); every write
-- now goes through a route that verified a Salla session and uses the service
-- role.

drop policy if exists "settings write" on public.settings;
drop policy if exists "settings update" on public.settings;
drop policy if exists "stores write" on public.stores;
drop policy if exists "stores update" on public.stores;
drop policy if exists "luck wheel leads insert" on public.luck_wheel_leads;
