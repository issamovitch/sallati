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
    return url.origin;
  } catch {
    return null;
  }
}

function extractStoreUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
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
      const found = extractStoreUrl(nested);
      if (found) return found;
    }
  }

  return null;
}

type ApiEnvelope = { data?: unknown } | null;

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