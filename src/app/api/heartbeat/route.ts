import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveReader } from "@/lib/reader-access";
import { awardBadges } from "@/lib/reading";
import { localDate } from "@/lib/dates";
import { serverEnv } from "@/lib/env";

const body = z.object({ chapterId: z.string().uuid(), seconds: z.number().int().min(1).max(120) });

/** The reader pings this every 30 seconds while visible. Adds reading time and enforces the daily limit. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const r = await resolveReader(parsed.data.chapterId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const { child } = r;
  const { data: total } = await createAdminClient().rpc("add_reading_time", {
    p_child: child.id,
    p_day: localDate(serverEnv.timezone()),
    p_seconds: parsed.data.seconds,
    p_pages: 0,
  });
  const seconds = Number(total ?? 0);

  // First read of the day can complete a streak badge.
  if (seconds <= parsed.data.seconds) await awardBadges(child.id, null);

  const limit = child.daily_limit_minutes ? child.daily_limit_minutes * 60 : null;
  return NextResponse.json({
    locked: limit !== null && seconds >= limit,
    remainingSeconds: limit === null ? null : Math.max(0, limit - seconds),
  });
}
