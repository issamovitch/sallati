export function readMerchantId(): number | null {
  try {
    const raw = sessionStorage.getItem("sallati.merchant-id");
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/** Salla iframe session token, needed for every server-side write. */
export function readSessionToken(): string {
  try {
    return sessionStorage.getItem("sallati.session-token") ?? "";
  } catch {
    return "";
  }
}

/**
 * Writes go through the server: public RLS no longer allows anon writes, and
 * the route proves ownership with the Salla session token before writing.
 * "unauthorized" means that token expired (Salla tokens last ~5 minutes).
 */
export type WriteResult = "ok" | "unauthorized" | "failed";

export async function writeModuleSettings<T>(
  _merchantId: number | null,
  moduleNum: number,
  settings: T,
): Promise<WriteResult> {
  try {
    const response = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: readSessionToken(),
        moduleNum,
        settings,
      }),
    });
    if (response.status === 401) return "unauthorized";
    return response.ok ? "ok" : "failed";
  } catch {
    return "failed";
  }
}

/**
 * Pending save kept across the iframe reload that follows a token refresh.
 * Transient, scoped by merchant + module, removed as soon as it is replayed.
 */
const PENDING_PREFIX = "sallati.pending-save";

function pendingKey(merchantId: number | null, moduleNum: number) {
  return `${PENDING_PREFIX}.${merchantId ?? 0}.${moduleNum}`;
}

export function queuePendingSave(
  merchantId: number | null,
  moduleNum: number,
  settings: unknown,
) {
  try {
    sessionStorage.setItem(
      pendingKey(merchantId, moduleNum),
      JSON.stringify(settings),
    );
  } catch {
    /* storage unavailable */
  }
}

export function takePendingSave(
  merchantId: number | null,
  moduleNum: number,
): Record<string, unknown> | null {
  try {
    const key = pendingKey(merchantId, moduleNum);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    sessionStorage.removeItem(key);
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** A module counts as enabled only when its row exists and `enabled` is true. */
export function isEnabled(settings: unknown): boolean {
  return Boolean(
    settings &&
      typeof settings === "object" &&
      (settings as Record<string, unknown>).enabled === true,
  );
}

/**
 * Every settings row for a merchant, keyed by `module_num`. Read through our
 * own API so the browser never queries the database (or holds a table key).
 */
export async function readMerchantSettings(
  merchantId: number | null,
): Promise<Record<number, unknown>> {
  if (merchantId === null) return {};

  try {
    const response = await fetch(
      `/api/settings?token=${encodeURIComponent(readSessionToken())}`,
      { cache: "no-store" },
    );
    if (!response.ok) return {};
    const payload = (await response.json()) as {
      rows?: Record<string, unknown>;
    };
    const rows: Record<number, unknown> = {};
    for (const [key, value] of Object.entries(payload.rows ?? {})) {
      rows[Number(key)] = value;
    }
    return rows;
  } catch {
    return {};
  }
}
