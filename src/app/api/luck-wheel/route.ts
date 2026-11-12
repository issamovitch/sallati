import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { normalizeLuckWheel } from "@/lib/luck-wheel";
import { moduleNumbers } from "@/lib/modules";

const MODULE_NUM = moduleNumbers["luck-wheel"] ?? 2;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantId = Number(searchParams.get("merchant_id"));

  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    return NextResponse.json({ enabled: false }, { headers: CORS_HEADERS });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ enabled: false }, { headers: CORS_HEADERS });
  }

  const { data, error } = await supabase
    .from("settings")
    .select("settings")
    .eq("merchant_id", merchantId)
    .eq("module_num", MODULE_NUM)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ enabled: false }, { headers: CORS_HEADERS });
  }

  const config = normalizeLuckWheel(data.settings);
  if (!config.enabled) {
    return NextResponse.json({ enabled: false }, { headers: CORS_HEADERS });
  }

  return NextResponse.json(config, { headers: CORS_HEADERS });
}
