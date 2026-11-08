const CACHE_PREFIX = "sallati.store-url";
const MANUAL_PREFIX = "sallati.store-url.manual";
export const STORE_URL_EVENT = "sallati.store-url";

function cacheKey(merchantId: number | null) {
  return merchantId === null ? CACHE_PREFIX : `${CACHE_PREFIX}.${merchantId}`;
}

function manualKey(merchantId: number | null) {
  return merchantId === null ? MANUAL_PREFIX : `${MANUAL_PREFIX}.${merchantId}`;
}

export function normalizeStoreUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
}

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, url: string) {
  try {
    localStorage.setItem(key, url);
    window.dispatchEvent(new Event(STORE_URL_EVENT));
  } catch {
    /* storage unavailable */
  }
}

export function getConfiguredStoreUrl(merchantId: number | null): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_STORE_URL?.trim();
  if (fromEnv) return normalizeStoreUrl(fromEnv) ?? fromEnv;

  return readStored(manualKey(merchantId)) ?? readStored(cacheKey(merchantId));
}

export function setManualStoreUrl(merchantId: number | null, value: string): string | null {
  const url = normalizeStoreUrl(value);
  if (!url) return null;
  writeStored(manualKey(merchantId), url);
  return url;
}

export async function resolveStoreUrl(merchantId: number | null): Promise<string | null> {
  const configured = getConfiguredStoreUrl(merchantId);
  if (configured) return configured;

  if (merchantId !== null) {
    try {
      const response = await fetch(`/api/store/link?merchant_id=${merchantId}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const payload = (await response.json()) as { url?: string | null };
        const url = payload.url ? normalizeStoreUrl(payload.url) : null;
        if (url) {
          writeStored(cacheKey(merchantId), url);
          return url;
        }
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}