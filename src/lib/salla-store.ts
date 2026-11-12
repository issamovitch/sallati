const API_BASE = "https://api.salla.dev/admin/v2";

const STOREFRONT_KEYS = ["store_url", "storeUrl", "domain", "url", "website"] as const;
const SLUG_KEYS = ["username", "slug", "subdomain"] as const;

function normalizeCandidate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  try {
    const url = new URL(withProtocol);
    if (!url.hostname.includes(".")) return null;
    // Demo/dev stores live under a path (…salla.sa/dev-xxxx), so keep it.
    const path = url.pathname.replace(/\/+$/, "");
    return `${url.origin}${path}`;
  } catch {
    return null;
  }
}

function extractStoreUrl(value: unknown, depth = 0): string | null {
  if (!value || typeof value !== "object" || depth > 2) return null;
  const data = value as Record<string, unknown>;

  for (const key of STOREFRONT_KEYS) {
    const candidate = data[key];
    if (typeof candidate === "string") {
      const normalized = normalizeCandidate(candidate);
      if (normalized) return normalized;
    }
  }

  for (const key of SLUG_KEYS) {
    const candidate = data[key];
    if (typeof candidate === "string" && /^[a-z0-9-]+$/i.test(candidate.trim())) {
      return `https://${candidate.trim()}.salla.sa`;
    }
  }

  for (const nested of Object.values(data)) {
    if (nested && typeof nested === "object") {
      const found = extractStoreUrl(nested, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

type ApiEnvelope = { data?: unknown } | null;

const NAME_KEYS = ["store_name", "name", "title"] as const;

function extractStoreName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;

  // /oauth2/user/info nests the store under `merchant`.
  const merchant =
    root.merchant && typeof root.merchant === "object"
      ? (root.merchant as Record<string, unknown>)
      : null;

  for (const source of [merchant, root]) {
    if (!source) continue;
    for (const key of NAME_KEYS) {
      const candidate = source[key];
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim().slice(0, 80);
      }
    }
  }

  return null;
}

export type StoreInfo = { url: string | null; name: string | null };

export async function discoverStoreInfo(
  accessToken: string,
  merchantId: number,
): Promise<StoreInfo> {
  const endpoints = [
    `${API_BASE}/stores/${merchantId}`,
    "https://accounts.salla.sa/oauth2/user/info",
  ];

  let url: string | null = null;
  let name: string | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!response.ok) continue;

      const payload = (await response.json().catch(() => null)) as ApiEnvelope;
      if (!payload) continue;

      const body = payload.data ?? payload;
      url = url ?? extractStoreUrl(body);
      name = name ?? extractStoreName(body);

      if (url && name) break;
    } catch {
      /* try the next endpoint */
    }
  }

  return { url, name };
}

export async function discoverStoreUrl(
  accessToken: string,
  merchantId: number,
): Promise<string | null> {
  const endpoints = [
    `${API_BASE}/stores/${merchantId}`,
    "https://accounts.salla.sa/oauth2/user/info",
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
      if (!response.ok) continue;

      const payload = (await response.json().catch(() => null)) as ApiEnvelope;
      if (!payload) continue;

      const found = extractStoreUrl(payload.data ?? payload);
      if (found) return found;
    } catch {
      /* try the next endpoint */
    }
  }

  return null;
}