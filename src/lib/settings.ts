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

export async function writeModuleSettings<T>(
  merchantId: number | null,
  moduleNum: number,
  settings: T,
): Promise<boolean> {
  const supabase = client();
  if (!supabase) return false;
  const { error } = await supabase
    .from(SETTINGS_TABLE)
    .upsert(
      { merchant_id: mid(merchantId), module_num: moduleNum, settings },
      { onConflict: "merchant_id,module_num" },
    );
  if (error) return false;

  return true;
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