import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  verifySallaSession,
} from "@/lib/server-auth";

/** Rows for the authenticated merchant only. The browser never reads the DB. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const merchantId = await verifySallaSession(token);
  if (!merchantId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("settings")
    .select("module_num, settings")
    .eq("merchant_id", merchantId);

  if (error) {
    return NextResponse.json({ ok: false, error: "read_failed" }, { status: 500 });
  }

  const rows: Record<number, unknown> = {};
  for (const row of (data ?? []) as { module_num: number; settings: unknown }[]) {
    rows[row.module_num] = row.settings;
  }

  return NextResponse.json(
    { ok: true, rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}

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

  await publishSettingsChanged(merchantId, moduleNum);

  return NextResponse.json({ ok: true });
}

/** Wake every open dashboard of this merchant; clients then refetch. */
async function publishSettingsChanged(merchantId: number, moduleNum: number) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return;

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `settings:${merchantId}`,
            event: "updated",
            payload: { moduleNum },
          },
        ],
      }),
      cache: "no-store",
    });
  } catch {
    /* clients also refetch on focus, so a missed ping is not fatal */
  }
}
