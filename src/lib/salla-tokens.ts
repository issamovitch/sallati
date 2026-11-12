import { getStore, replaceStoreTokens, type StoredStore } from "@/lib/store-registry";

/**
 * Keeps a valid Easy Mode access token for a merchant.
 *
 * Refresh tokens are single-use, so refreshes are serialised per merchant:
 * in-process callers share one promise, and across instances the database
 * update only applies while the old refresh token is still the stored one.
 */

const TOKEN_URL = "https://accounts.salla.sa/oauth2/token";
const REFRESH_MARGIN_MS = 24 * 60 * 60 * 1000;

const inFlight = new Map<number, Promise<StoredStore | null>>();

function clientCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.SALLA_CLIENT_ID?.trim();
  const clientSecret = process.env.SALLA_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

async function refreshStore(merchantId: number): Promise<StoredStore | null> {
  const store = await getStore(merchantId);
  if (!store?.refreshToken) return null;

  const credentials = clientCredentials();
  if (!credentials) return null;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: store.refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
  });

  let payload: Record<string, unknown> | null = null;
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
    if (!response.ok) return null;
    payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  } catch {
    return null;
  }

  const accessToken = typeof payload?.access_token === "string" ? payload.access_token : null;
  if (!accessToken) return null;

  const refreshToken =
    typeof payload?.refresh_token === "string" && payload.refresh_token
      ? payload.refresh_token
      : store.refreshToken;

  const expiresIn = Number(payload?.expires_in);
  const expiresAt =
    Number.isFinite(expiresIn) && expiresIn > 0 ? Date.now() + expiresIn * 1000 : undefined;

  const saved = await replaceStoreTokens(merchantId, store.refreshToken, {
    accessToken,
    refreshToken,
    expiresAt,
  });

  // Someone else refreshed first: use their tokens instead of retrying.
  return saved ? { ...store, accessToken, refreshToken, expiresAt } : getStore(merchantId);
}

export async function getValidAccessToken(merchantId: number): Promise<string | null> {
  const store = await getStore(merchantId);
  if (!store) return null;

  const freshEnough = store.expiresAt ? store.expiresAt - Date.now() > REFRESH_MARGIN_MS : true;
  if (freshEnough) return store.accessToken;
  if (!store.refreshToken) return store.accessToken;

  const pending = inFlight.get(merchantId);
  if (pending) {
    const next = await pending;
    return next?.accessToken ?? null;
  }

  const task = refreshStore(merchantId).finally(() => inFlight.delete(merchantId));
  inFlight.set(merchantId, task);

  const next = await task;
  return next?.accessToken ?? null;
}
