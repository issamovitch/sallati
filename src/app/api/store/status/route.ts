import { NextResponse } from "next/server";
import { getStoreStatus } from "@/lib/store-registry";

const APP_ID = process.env.SALLA_APP_ID?.trim() ?? "";

function installUrl(): string | null {
  return APP_ID ? `https://s.salla.sa/apps/install/${APP_ID}` : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantId = Number(searchParams.get("merchant_id"));

  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    return NextResponse.json({ error: "bad_merchant" }, { status: 400 });
  }

  const status = await getStoreStatus(merchantId);

  return NextResponse.json(
    {
      linked: status.linked,
      storeName: status.storeName,
      storeUrl: status.storeUrl,
      expiresAt: status.expiresAt,
      installUrl: installUrl(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
