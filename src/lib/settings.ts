export const SETTINGS_TABLE = "settings";

export type ModuleSettingsRow = {
  id: number;
  merchant_id: number;
  module_num: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

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
 */
export async function writeModuleSettings<T>(
  _merchantId: number | null,
  moduleNum: number,
  settings: T,
): Promise<boolean> {
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
    return response.ok;
  } catch {
    return false;
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
