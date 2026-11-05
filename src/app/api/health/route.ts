import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness check for the deploy script and uptime monitors. Touches no database or secrets. */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
