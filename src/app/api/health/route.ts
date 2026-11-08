import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ ok: true, service: "sallati", ts: new Date().toISOString() });
}
