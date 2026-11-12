/**
 * Normalizes a merchant-entered storefront URL. Kept path-preserving because
 * Salla demo stores live under a path (…salla.sa/dev-xxxxxxxx).
 */
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
