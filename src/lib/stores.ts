import { createSupabaseServerClient, getSupabaseBrowserClient } from "@/lib/supabase";

export type StoreRow = { merchant_id: number; store_url: string | null };

function client() {
  if (typeof window === "undefined") return createSupabaseServerClient();
  return getSupabaseBrowserClient();
}

function mid(merchantId: number | null) {
  return merchantId ?? 0;
}

export async function readStoreUrl(merchantId: number | null): Promise<string | null> {
  const supabase = client();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stores")
    .select("store_url")
    .eq("merchant_id", mid(merchantId))
    .maybeSingle();
  if (error || !data) return null;
  return (data.store_url as string | null) ?? null;
}

export async function saveStoreUrl(merchantId: number | null, url: string): Promise<boolean> {
  const supabase = client();
  if (!supabase) return false;
  const { error } = await supabase
    .from("stores")
    .upsert({ merchant_id: mid(merchantId), store_url: url }, { onConflict: "merchant_id" });
  return !error;
}