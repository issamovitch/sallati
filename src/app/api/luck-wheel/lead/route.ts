import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: CORS_HEADERS });
  }

  const payload = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const merchantId = Number(payload.merchantId);
  const email = text(payload.email, 200);

  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    return NextResponse.json({ ok: false }, { status: 400, headers: CORS_HEADERS });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false }, { status: 400, headers: CORS_HEADERS });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503, headers: CORS_HEADERS });
  }

  const { error } = await supabase.from("luck_wheel_leads").insert({
    merchant_id: merchantId,
    email,
    prize_id: text(payload.prizeId, 60) || null,
    prize_label: text(payload.prizeLabel, 120) || null,
    coupon_code: text(payload.couponCode, 60) || null,
  });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
