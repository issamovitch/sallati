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
  return !error;
}