import { NextResponse } from "next/server";

const INTROSPECT_URL = "https://api.salla.dev/exchange-authority/v1/introspect";

type IntrospectBody = {
  status?: number;
  success?: boolean;
  data?: { merchant_id?: number; user_id?: number; exp?: string } | null;
};

export async function POST(request: Request) {
  const appId = process.env.SALLA_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "SALLA_APP_ID is not configured" }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = body?.token;
  if (typeof token !== "string" || token.length === 0) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(INTROSPECT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "S-Source": appId },
      body: JSON.stringify({ token }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Could not reach Salla introspection API" }, { status: 502 });
  }

  const result = (await upstream.json().catch(() => null)) as IntrospectBody | null;

  if (!upstream.ok || !result?.success || !result.data?.merchant_id) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  return NextResponse.json({
    merchant_id: result.data.merchant_id,
    user_id: result.data.user_id,
    exp: result.data.exp,
  });
}
