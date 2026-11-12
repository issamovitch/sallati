import { NextResponse } from "next/server";
import { createSupabaseAdminClient, verifySallaSession } from "@/lib/server-auth";

/**
 * Only writes. Reads stay public so the dashboard and Realtime can use the
 * publishable key; mutations destroy data, so they require a Salla session.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { token?: unknown; moduleNum?: unknown; settings?: unknown }
    | null;

  const merchantId = await verifySallaSession(body?.token);
  if (!merchantId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const moduleNum = Number(body?.moduleNum);
  if (!Number.isInteger(moduleNum) || moduleNum < 1 || moduleNum > 99) {
    return NextResponse.json({ ok: false, error: "bad_module" }, { status: 400 });
  }

  const settings = body?.settings;
  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ ok: false, error: "bad_settings" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { error } = await supabase
    .from("settings")
    .upsert(
      { merchant_id: merchantId, module_num: moduleNum, settings },
      { onConflict: "merchant_id,module_num" },
    );

  if (error) {
    return NextResponse.json({ ok: false, error: "write_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
