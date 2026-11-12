import { NextResponse } from "next/server";
import { getStore } from "@/lib/store-registry";
import { discoverStoreUrl } from "@/lib/salla-store";
import { createSupabaseAdminClient, verifySallaSession } from "@/lib/server-auth";
import { normalizeStoreUrl } from "@/lib/store-link";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantId = Number(searchParams.get("merchant_id"));
  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    return NextResponse.json({ url: null, reason: "bad_merchant" }, { status: 400 });
  }

  const store = await getStore(merchantId);
  if (store?.storeUrl) {
    return NextResponse.json({ url: store.storeUrl });
  }

  // Try to discover now if we have a token.
  if (store?.accessToken) {
    const url = await discoverStoreUrl(store.accessToken, merchantId);
    if (url) {
      await (await import("@/lib/store-registry")).upsertStore({
        ...store,
        storeUrl: url,
      });
      return NextResponse.json({ url });
    }
  }

  return NextResponse.json({ url: null, reason: "not_authorized" });
}

/** Manual store URL, used only when discovery failed during installation. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: unknown; url?: unknown }
    | null;

  const merchantId = await verifySallaSession(body?.token);
  if (!merchantId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = typeof body?.url === "string" ? normalizeStoreUrl(body.url) : null;
  if (!url) {
    return NextResponse.json({ ok: false, error: "bad_url" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { error } = await supabase
    .from("stores")
    .upsert({ merchant_id: merchantId, store_url: url }, { onConflict: "merchant_id" });

  if (error) {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url });
}
