-- Leads captured by the luck wheel (عجلة الحظ).
-- One row per successful spin that captured an email.

create table if not exists public.luck_wheel_leads (
  id bigint generated always as identity primary key,
  merchant_id bigint not null,
  email text not null,
  prize_id text,
  prize_label text,
  coupon_code text,
  created_at timestamptz not null default now()
);

comment on table public.luck_wheel_leads is
  'Email leads captured by the luck wheel, one row per completed spin.';

create index if not exists luck_wheel_leads_merchant_created_idx
  on public.luck_wheel_leads (merchant_id, created_at desc);

alter table public.luck_wheel_leads enable row level security;

drop policy if exists "luck wheel leads insert" on public.luck_wheel_leads;
drop policy if exists "luck wheel leads read" on public.luck_wheel_leads;

-- Storefront writes with the publishable key. There is deliberately no select
-- policy: rows contain customer emails, so reading requires the service role.
create policy "luck wheel leads insert"
  on public.luck_wheel_leads for insert with check (true);
