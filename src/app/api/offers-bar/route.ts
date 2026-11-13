import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/server-auth";
import { DEFAULT_TOP_OFFERS_BAR, clampAnimationSpeed } from "@/lib/top-offers-bar";

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

  const empty = {
    enabled: false,
    texts: [],
    message: "",
    color: "",
    height: 0,
    fontFamily: "",
    fontSize: 0,
    animationSpeed: 0,
  };

  if (!Number.isFinite(merchantId) || merchantId <= 0) {
    return NextResponse.json(empty, { headers: CORS_HEADERS });
  }

  const supabase = createSupabaseAdminClient();
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

  const s = (data.settings ?? {}) as Partial<typeof DEFAULT_TOP_OFFERS_BAR> & {
    message?: string;
  };

  const texts =
    Array.isArray(s.texts) && s.texts.length
      ? s.texts.map((t) => ({
          message: typeof t.message === "string" ? t.message : "",
          duration:
            typeof t.duration === "number" && t.duration >= 1
              ? t.duration
              : DEFAULT_TOP_OFFERS_BAR.texts[0].duration,
        }))
      : typeof s.message === "string"
        ? [{ message: s.message, duration: DEFAULT_TOP_OFFERS_BAR.texts[0].duration }]
        : [];

  if (s.enabled !== true) {
    return NextResponse.json({ ...empty, height: 0, fontFamily: "", fontSize: 0 }, { headers: CORS_HEADERS });
  }

  return NextResponse.json(
    {
      enabled: true,
      texts,
      message: texts[0]?.message ?? "",
      color: s.color ?? DEFAULT_TOP_OFFERS_BAR.color,
      height: s.height ?? DEFAULT_TOP_OFFERS_BAR.height,
      fontFamily: s.fontFamily ?? DEFAULT_TOP_OFFERS_BAR.fontFamily,
      fontSize: s.fontSize ?? DEFAULT_TOP_OFFERS_BAR.fontSize,
      animationSpeed: clampAnimationSpeed(
        s.animationSpeed ?? DEFAULT_TOP_OFFERS_BAR.animationSpeed,
      ),
    },
    { headers: CORS_HEADERS },
  );
}
