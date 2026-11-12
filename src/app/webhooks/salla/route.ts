import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { removeStore, upsertStore } from "@/lib/store-registry";
import { discoverStoreInfo } from "@/lib/salla-store";

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

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function verifySignature(rawBody: string, provided: string, secret: string) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(provided, expected);
}

/**
 * The portal can protect the endpoint with either strategy. Token sends the
 * shared secret in the Authorization header; Signature sends an HMAC of the
 * body in X-Salla-Signature. Accept either, both prove knowledge of the secret.
 */
function isAuthorized(
  rawBody: string,
  headers: { authorization: string; signature: string },
  secret: string,
) {
  const token = headers.authorization.replace(/^Bearer\s+/i, "").trim();
  if (token && safeEqual(token, secret)) return true;
  return Boolean(headers.signature) && verifySignature(rawBody, headers.signature, secret);
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
  const authorized = isAuthorized(
    rawBody,
    {
      authorization: request.headers.get("authorization") ?? "",
      signature: request.headers.get("x-salla-signature") ?? "",
    },
    secret,
  );
  if (!authorized) {
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

      const store = await discoverStoreInfo(accessToken, merchantId);

      const stored = await upsertStore({
        merchantId,
        accessToken,
        refreshToken,
        expiresAt,
        storeUrl: store.url ?? undefined,
        storeName: store.name ?? undefined,
      });

      return NextResponse.json({ ok: true, stored });
    }

    case "app.uninstalled": {
      await removeStore(merchantId);
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ ok: true, ignored: payload.event ?? "unknown_event" });
  }
}