import { NextResponse } from "next/server";
import { getStore } from "@/lib/store-registry";
import { discoverStoreUrl } from "@/lib/salla-store";

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