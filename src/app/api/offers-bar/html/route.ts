import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server-auth";
import { DEFAULT_TOP_OFFERS_BAR } from "@/lib/top-offers-bar";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const merchantId = Number(searchParams.get("merchant_id"));

  const empty = new NextResponse("", {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });

  if (!Number.isFinite(merchantId) || merchantId <= 0) return empty;

  const supabase = createSupabaseAdminClient();
  if (!supabase) return empty;

  const { data, error } = await supabase
    .from("settings")
    .select("settings")
    .eq("merchant_id", merchantId)
    .eq("module_num", 1)
    .maybeSingle();

  if (error || !data) return empty;

  const s = (data.settings ?? {}) as Partial<typeof DEFAULT_TOP_OFFERS_BAR> & {
    message?: string;
  };

  if (s.enabled !== true) return empty;

  const color = s.color ?? DEFAULT_TOP_OFFERS_BAR.color;
  const height = s.height ?? DEFAULT_TOP_OFFERS_BAR.height;
  const fontFamily = s.fontFamily ?? DEFAULT_TOP_OFFERS_BAR.fontFamily;
  const fontSize = s.fontSize ?? DEFAULT_TOP_OFFERS_BAR.fontSize;

  const firstText =
    (Array.isArray(s.texts) ? s.texts[0]?.message : undefined) ??
    (typeof s.message === "string" ? s.message : "");

  const fontParam = encodeURIComponent(fontFamily).replace(/%20/g, "+");
  const fontLink = `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${fontParam}:wght@400;600;700&display=swap">`;
  const html = `${fontLink}<div id="sallati-offers-bar" style="position:fixed;top:0;left:0;right:0;z-index:9999;height:${height}px;display:flex;align-items:center;justify-content:center;padding:0 16px;text-align:center;font-family:'${escapeHtml(fontFamily)}',sans-serif;font-size:${fontSize}px;font-weight:600;color:#fff;background:${escapeHtml(color)};box-shadow:0 2px 8px rgba(0,0,0,.15);">${firstText}</div>`;

  return new NextResponse(html, {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "text/html; charset=utf-8" },
  });
}
