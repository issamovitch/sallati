import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantId = Number(searchParams.get("merchant_id"));

  const empty = { enabled: false, message: "", color: "" };

  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    return NextResponse.json(empty, { headers: CORS_HEADERS });
  }

  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(empty, { headers: CORS_HEADERS });
  }

  const { data, error } = await supabase
    .from("settings")
    .select("settings")
    .eq("merchant_id", merchantId)
    .eq("module_num", 1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(empty, { headers: CORS_HEADERS });
  }

  const s = (data.settings ?? {}) as { enabled?: boolean; message?: string; color?: string; height?: number; fontFamily?: string; fontSize?: number };
  const enabled = s.enabled === true;
  if (!enabled) {
    return NextResponse.json({ enabled: false, message: "", color: "", height: 0, fontFamily: "", fontSize: 0 }, { headers: CORS_HEADERS });
  }

  return NextResponse.json(
    {
      enabled: true,
      message: s.message ?? "",
      color: s.color ?? "#000000",
      height: s.height ?? 46,
      fontFamily: s.fontFamily ?? "Cairo",
      fontSize: s.fontSize ?? 16,
    },
    { headers: CORS_HEADERS },
  );
}