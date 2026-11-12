-- Easy Mode tokens live on the per-store row. Token values are stored as
-- AES-256-GCM ciphertext (see src/lib/token-crypto.ts), so the row stays safe
-- even though the table is readable with the public key.
alter table public.stores
  add column if not exists store_name text,
  add column if not exists access_token text,
  add column if not exists refresh_token text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists token_updated_at timestamptz;
