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

  const empty = new NextResponse("", { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" } });

  if (!Number.isFinite(merchantId) || merchantId <= 0) return empty;

  const supabase = createSupabaseServerClient();
  if (!supabase) return empty;

  const { data, error } = await supabase
    .from("settings")
    .select("settings")
    .eq("merchant_id", merchantId)
    .eq("module_num", 1)
    .maybeSingle();

  if (error || !data) return empty;

  const s = (data.settings ?? {}) as { enabled?: boolean; message?: string; color?: string; height?: number; fontFamily?: string; fontSize?: number };
  if (s.enabled !== true) return empty;

  const color = s.color ?? "#000000";
  const height = s.height ?? 46;
  const fontFamily = s.fontFamily ?? "Cairo";
  const fontSize = s.fontSize ?? 16;
  const message = s.message ?? "";

  const fontParam = encodeURIComponent(fontFamily).replace(/%20/g, "+");
  const fontLink = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;600;700&display=swap">`;
  const html = `${fontLink}<div id="sallati-offers-bar" style="position:fixed;top:0;left:0;right:0;z-index:9999;height:${height}px;display:flex;align-items:center;justify-content:center;padding:0 16px;text-align:center;font-family:'${fontFamily}',sans-serif;font-size:${fontSize}px;font-weight:600;color:#fff;background:${color};box-shadow:0 2px 8px rgba(0,0,0,.15);">${message}</div>`;

  return new NextResponse(html, {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });
}