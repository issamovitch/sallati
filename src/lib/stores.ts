import { readSessionToken } from "@/lib/settings";

function mid(merchantId: number | null) {
  return merchantId ?? 0;
}

/** Read through our API: the browser no longer has table access. */
export async function readStoreUrl(merchantId: number | null): Promise<string | null> {
  if (merchantId === null) return null;
  try {
    const response = await fetch(`/api/store/status?merchant_id=${mid(merchantId)}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { storeUrl?: string | null };
    return payload.storeUrl ?? null;
  } catch {
    return null;
  }
}

/** Writes go through the server: anon RLS no longer allows store updates. */
export async function saveStoreUrl(
  _merchantId: number | null,
  url: string,
): Promise<boolean> {
  try {
    const response = await fetch("/api/store/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: readSessionToken(), url }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
