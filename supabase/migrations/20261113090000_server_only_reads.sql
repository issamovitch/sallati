-- Reads move server-side. The browser keeps only a Realtime socket for
-- broadcast pings (no table access), so no row may be selectable with the
-- publishable key any more.
drop policy if exists "settings read" on public.settings;
drop policy if exists "stores read" on public.stores;
