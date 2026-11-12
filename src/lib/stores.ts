import { createSupabaseServerClient, getSupabaseBrowserClient } from "@/lib/supabase";
import { readSessionToken } from "@/lib/settings";

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
