import { createSupabaseAdminClient } from "@/lib/server-auth";
import { canEncryptTokens, decryptToken, encryptToken } from "@/lib/token-crypto";

const TABLE = "stores";

export type StoredStore = {
  merchantId: number;
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt?: number;
  storeUrl?: string;
  storeName?: string;
};

export type StoreStatus = {
  linked: boolean;
  storeName: string | null;
  storeUrl: string | null;
  /** Epoch milliseconds, null when Salla did not send an expiry. */
  expiresAt: number | null;
};

type StoreRow = {
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  store_url: string | null;
  store_name: string | null;
};

function client() {
  const supabase = createSupabaseAdminClient();
  if (!supabase || !canEncryptTokens()) return null;
  return supabase;
}

async function readRow(merchantId: number): Promise<StoreRow | null> {
  const supabase = client();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .select("access_token, refresh_token, token_expires_at, store_url, store_name")
    .eq("merchant_id", merchantId)
    .maybeSingle();

  if (error || !data) return null;
  return data as StoreRow;
}

export async function getStore(merchantId: number): Promise<StoredStore | null> {
  const row = await readRow(merchantId);
  if (!row) return null;

  const accessToken = decryptToken(row.access_token);
  if (!accessToken) return null;

  const refreshToken = decryptToken(row.refresh_token) ?? undefined;
  const expiresAt = row.token_expires_at ? Date.parse(row.token_expires_at) : NaN;

  return {
    merchantId,
    accessToken,
    refreshToken,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : undefined,
    storeUrl: row.store_url ?? undefined,
    storeName: row.store_name ?? undefined,
  };
}

export async function upsertStore(store: StoredStore): Promise<boolean> {
  const supabase = client();
  if (!supabase) return false;

  const accessToken = encryptToken(store.accessToken);
  if (!accessToken) return false;

  const refreshToken = store.refreshToken ? encryptToken(store.refreshToken) : null;
  if (store.refreshToken && !refreshToken) return false;

  // Keep whatever Salla sent earlier when this event does not include it.
  const existing =
    store.storeUrl && store.storeName ? null : await readRow(store.merchantId);

  const { error } = await supabase.from(TABLE).upsert(
    {
      merchant_id: store.merchantId,
      store_url: store.storeUrl ?? existing?.store_url ?? null,
      store_name: store.storeName ?? existing?.store_name ?? null,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: store.expiresAt ? new Date(store.expiresAt).toISOString() : null,
      token_updated_at: new Date().toISOString(),
    },
    { onConflict: "merchant_id" },
  );

  return !error;
}

/**
 * Writes a refreshed token pair only if the stored refresh token is still the
 * one we used. Salla's refresh tokens are single-use, so a second concurrent
 * refresh must lose this race instead of revoking the whole token chain.
 */
export async function replaceStoreTokens(
  merchantId: number,
  previousRefreshToken: string,
  next: { accessToken: string; refreshToken: string; expiresAt?: number },
): Promise<boolean> {
  const row = await readRow(merchantId);
  if (!row?.refresh_token) return false;
  if (decryptToken(row.refresh_token) !== previousRefreshToken) return false;

  const supabase = client();
  if (!supabase) return false;

  const accessToken = encryptToken(next.accessToken);
  const refreshToken = encryptToken(next.refreshToken);
  if (!accessToken || !refreshToken) return false;

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_expires_at: next.expiresAt ? new Date(next.expiresAt).toISOString() : null,
      token_updated_at: new Date().toISOString(),
    })
    .eq("merchant_id", merchantId)
    .eq("refresh_token", row.refresh_token)
    .select("merchant_id");

  return !error && Array.isArray(data) && data.length > 0;
}

export async function removeStore(merchantId: number): Promise<void> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return;

  await supabase
    .from(TABLE)
    .update({
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      token_updated_at: new Date().toISOString(),
    })
    .eq("merchant_id", merchantId);
}

export async function getStoreStatus(merchantId: number): Promise<StoreStatus> {
  const row = await readRow(merchantId);
  if (!row?.access_token) {
    return { linked: false, storeName: null, storeUrl: null, expiresAt: null };
  }

  const expiresAt = row.token_expires_at ? Date.parse(row.token_expires_at) : NaN;

  return {
    linked: true,
    storeName: row.store_name,
    storeUrl: row.store_url,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
  };
}
