import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const INTROSPECT_URL = "https://api.salla.dev/exchange-authority/v1/introspect";

type IntrospectBody = {
  success?: boolean;
  data?: { merchant_id?: number } | null;
};

/** Merchant id for a Salla iframe session token, or null when it is invalid. */
export async function verifySallaSession(token: unknown): Promise<number | null> {
  const appId = process.env.SALLA_APP_ID;
  if (!appId || typeof token !== "string" || token.length === 0) return null;

  try {
    const upstream = await fetch(INTROSPECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "S-Source": appId },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
    if (!upstream.ok) return null;

    const result = (await upstream.json().catch(() => null)) as IntrospectBody | null;
    const merchantId = result?.data?.merchant_id;
    return result?.success && Number.isFinite(merchantId) ? Number(merchantId) : null;
  } catch {
    return null;
  }
}

/**
 * Service-role client for server writes. RLS no longer grants anon writes, so
 * every mutation must pass through a route that verified a Salla session.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
