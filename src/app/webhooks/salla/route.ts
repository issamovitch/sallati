import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { removeStore, upsertStore } from "@/lib/store-registry";
import { discoverStoreUrl } from "@/lib/salla-store";

type SallaEvent = {
  event?: string;
  merchant?: number;
  created_at?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    expires?: number;
    [key: string]: unknown;
  };
};

function verifySignature(rawBody: string, provided: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.SALLA_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "SALLA_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-salla-signature") ?? "";
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SallaEvent;
  try {
    payload = JSON.parse(rawBody) as SallaEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const merchantId = Number(payload.merchant);
  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    return NextResponse.json({ ok: true, ignored: "missing_merchant" });
  }

  switch (payload.event) {
    case "app.store.authorize": {
      const accessToken = payload.data?.access_token;
      if (typeof accessToken !== "string" || !accessToken) {
        return NextResponse.json({ ok: true, ignored: "missing_token" });
      }

      const refreshToken =
        typeof payload.data?.refresh_token === "string" ? payload.data.refresh_token : undefined;
      const expires = Number(payload.data?.expires);
      const expiresAt = Number.isFinite(expires) ? expires * 1000 : undefined;

      const storeUrl = await discoverStoreUrl(accessToken, merchantId);

      await upsertStore({
        merchantId,
        accessToken,
        refreshToken,
        expiresAt,
        storeUrl: storeUrl ?? undefined,
      });

      return NextResponse.json({ ok: true });
    }

    case "app.uninstalled": {
      await removeStore(merchantId);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ ok: true, ignored: payload.event ?? "unknown_event" });
  }
}