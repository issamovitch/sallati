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

  // Keep the sidebar dots in sync without a full reload.
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SETTINGS_CHANGED_EVENT, {
        detail: {
          merchantId: mid(merchantId),
          moduleNum,
          enabled: isEnabled(settings),
        },
      }),
    );
  }

  return true;
}

export const SETTINGS_CHANGED_EVENT = "sallati:settings-changed";

export type SettingsChangedDetail = {
  merchantId: number;
  moduleNum: number;
  enabled: boolean;
};

/** A module counts as enabled only when its row exists and `enabled` is true. */
export function isEnabled(settings: unknown): boolean {
  return Boolean(
    settings &&
      typeof settings === "object" &&
      (settings as Record<string, unknown>).enabled === true,
  );
}

/**
 * Enabled state for every module that has a settings row for this merchant.
 * Modules without a row are simply absent, which the sidebar renders as off.
 */export async function readModuleStates(
  merchantId: number | null,
): Promise<Record<number, boolean>> {
  const supabase = client();
  if (!supabase) return {};

  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("module_num, settings")
    .eq("merchant_id", mid(merchantId));

  if (error || !data) return {};

  const states: Record<number, boolean> = {};
  for (const row of data as { module_num: number; settings: unknown }[]) {
    states[row.module_num] = isEnabled(row.settings);
  }
  return states;
}

/**
 * Live updates for one module (`moduleNum`) or the whole merchant (null).
 * Requires `public.settings` in the `supabase_realtime` publication.
 */
export function subscribeModuleSettings(
  merchantId: number | null,
  moduleNum: number | null,
  onChange: (moduleNum: number, settings: unknown) => void,
): () => void {
  const supabase = client();
  if (!supabase || merchantId === null) return () => {};

  const channel = supabase
    .channel(`settings:${merchantId}:${moduleNum ?? "all"}`)
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
        if (moduleNum !== null && row.module_num !== moduleNum) return;
        onChange(row.module_num, row.settings);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}