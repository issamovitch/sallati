import { createSupabaseServerClient, getSupabaseBrowserClient } from "@/lib/supabase";

export const SETTINGS_TABLE = "settings";

export type ModuleSettingsRow = {
  id: number;
  merchant_id: number;
  module_num: number;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function client() {
  if (typeof window === "undefined") return createSupabaseServerClient();
  return getSupabaseBrowserClient();
}

function mid(merchantId: number | null) {
  return merchantId ?? 0;
}

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

export async function readModuleSettings<T>(
  merchantId: number | null,
  moduleNum: number,
): Promise<T | null> {
  const supabase = client();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("settings")
    .eq("merchant_id", mid(merchantId))
    .eq("module_num", moduleNum)
    .maybeSingle();
  if (error || !data) return null;
  return (data.settings ?? null) as T | null;
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

/** Every settings row for a merchant, keyed by `module_num`. */
export async function readMerchantSettings(
  merchantId: number | null,
): Promise<Record<number, unknown>> {
  const supabase = client();
  if (!supabase || merchantId === null) return {};

  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("module_num, settings")
    .eq("merchant_id", merchantId);

  if (error || !data) return {};

  const rows: Record<number, unknown> = {};
  for (const row of data as { module_num: number; settings: unknown }[]) {
    rows[row.module_num] = row.settings;
  }
  return rows;
}

/**
 * One Realtime channel per merchant. `onResync` fires after a reconnect
 * because events sent while the socket was down are never replayed.
 * Requires `public.settings` in the `supabase_realtime` publication.
 */
export function subscribeMerchantSettings(
  merchantId: number | null,
  handlers: {
    onRow: (moduleNum: number, settings: unknown) => void;
    onResync: () => void;
  },
): () => void {
  const supabase = client();
  if (!supabase || merchantId === null) return () => {};

  let joined = false;

  const channel = supabase
    .channel(`settings:${merchantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: SETTINGS_TABLE,
        filter: `merchant_id=eq.${merchantId}`,
      },
      (payload) => {
        const row = payload.new as { module_num?: number; settings?: unknown } | null;
        if (!row?.module_num) return;
        handlers.onRow(row.module_num, row.settings);
      },
    )
    .subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      if (joined) handlers.onResync();
      joined = true;
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}