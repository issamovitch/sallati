import { NextResponse } from "next/server";
import { getStore } from "@/lib/store-registry";
import { verifySallaSession } from "@/lib/server-auth";

const COUPONS_URL = "https://api.salla.dev/admin/v2/coupons?per_page=50";

export type Coupon = {
  id: string;
  code: string;
  type: string;
  amount: number | null;
  expiry: string | null;
  status: string | null;
};

type RawCoupon = {
  id?: number | string;
  code?: string;
  type?: string;
  amount?: number | string;
  expiry?: string | null;
  expiry_date?: string | null;
  status?: string | { name?: string } | null;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Coupons the merchant already created in Salla's dashboard. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const merchantId = await verifySallaSession(token);
  if (!merchantId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const store = await getStore(merchantId);
  if (!store?.accessToken) {
    return NextResponse.json({ ok: false, error: "not_linked" }, { status: 409 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(COUPONS_URL, {
      headers: {
        Authorization: `Bearer ${store.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "unreachable" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { ok: false, error: "salla_error", status: upstream.status },
      { status: 502 },
    );
  }

  const payload = (await upstream.json().catch(() => null)) as
    | { data?: RawCoupon[] }
    | null;

  const coupons: Coupon[] = (payload?.data ?? [])
    .map((row) => ({
      id: String(row.id ?? ""),
      code: text(row.code),
      type: text(row.type),
      amount:
        Number.isFinite(Number(row.amount)) && row.amount !== "" && row.amount != null
          ? Number(row.amount)
          : null,
      expiry: row.expiry ?? row.expiry_date ?? null,
      status:
        typeof row.status === "string"
          ? row.status
          : (row.status?.name ?? null),
    }))
    .filter((coupon) => coupon.id && coupon.code);

  return NextResponse.json(
    { ok: true, coupons },
    { headers: { "Cache-Control": "no-store" } },
  );
}
