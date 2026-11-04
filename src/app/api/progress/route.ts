import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveReader } from "@/lib/reader-access";
import { awardBadges } from "@/lib/reading";
import { localDate } from "@/lib/dates";
import { serverEnv } from "@/lib/env";
import { BADGES } from "@/lib/badges";

const body = z.object({ chapterId: z.string().uuid(), page: z.number().int().min(1).max(2000) });

/** Saves the reader's current page. Finishing the last page completes the chapter and may earn badges. */
export async function POST(request: NextRequest) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const r = await resolveReader(parsed.data.chapterId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });

  const { child, chapter, series } = r;
  const page = Math.min(parsed.data.page, Math.max(chapter.page_count, 1));
  const admin = createAdminClient();
  const { data: prev } = await admin
    .from("reading_progress")
    .select("max_page,completed_at")
    .eq("child_id", child.id)
    .eq("chapter_id", chapter.id)
    .maybeSingle();

  const prevMax = prev?.max_page ?? 0;
  const finishing = page >= chapter.page_count && !prev?.completed_at;
  await admin.from("reading_progress").upsert(
    {
      child_id: child.id,
      chapter_id: chapter.id,
      series_id: series.id,
      last_page: page,
      max_page: Math.max(prevMax, page),
      completed_at: prev?.completed_at ?? (finishing ? new Date().toISOString() : null),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,chapter_id" },
  );

  const newPages = Math.max(0, page - prevMax);
  if (newPages > 0) {
    await admin.rpc("add_reading_time", {
      p_child: child.id,
      p_day: localDate(serverEnv.timezone()),
      p_seconds: 0,
      p_pages: newPages,
    });
  }

  const badges = finishing ? await awardBadges(child.id, series.id) : [];
  return NextResponse.json({
    ok: true,
    completed: finishing || Boolean(prev?.completed_at),
    badges: badges.map((k) => ({ key: k, ...BADGES[k] })),
  });
}
