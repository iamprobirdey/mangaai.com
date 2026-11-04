import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays, localDate } from "@/lib/dates";
import { computeStreak } from "@/lib/streak";
import { serverEnv } from "@/lib/env";
import { BADGES, earnedBadges, type BadgeKey } from "@/lib/badges";
import type { Child } from "@/lib/dal";

export async function childSummary(child: Child) {
  const supabase = await createClient();
  const today = localDate(serverEnv.timezone());
  const [{ data: days }, { data: badges }] = await Promise.all([
    supabase.from("reading_days").select("day,seconds,pages_read").eq("child_id", child.id).gte("day", addDays(today, -120)),
    supabase.from("child_badges").select("badge_key,earned_at").eq("child_id", child.id).order("earned_at"),
  ]);
  const list = days ?? [];
  const weekStart = addDays(today, -6);
  return {
    today,
    streak: computeStreak(list.map((d) => d.day), today),
    daysThisWeek: list.filter((d) => d.day >= weekStart).length,
    secondsToday: list.find((d) => d.day === today)?.seconds ?? 0,
    badges: (badges ?? []).map((b) => b.badge_key as BadgeKey).filter((k) => k in BADGES),
  };
}

export function timeLeftSeconds(child: Child, secondsToday: number) {
  if (!child.daily_limit_minutes) return null;
  return Math.max(0, child.daily_limit_minutes * 60 - secondsToday);
}

/** Checks badge rules after reading activity and stores any new ones. Returns the newly earned keys. */
export async function awardBadges(childId: string, seriesId: string | null): Promise<BadgeKey[]> {
  const admin = createAdminClient();
  const today = localDate(serverEnv.timezone());
  const [{ data: existing }, { data: completed }, { data: days }] = await Promise.all([
    admin.from("child_badges").select("badge_key").eq("child_id", childId),
    admin.from("reading_progress").select("chapter_id,series_id,series(genres)").eq("child_id", childId).not("completed_at", "is", null),
    admin.from("reading_days").select("day").eq("child_id", childId).gte("day", addDays(today, -60)),
  ]);

  const done = completed ?? [];
  let finishedSeries = false;
  if (seriesId) {
    const nowIso = new Date().toISOString();
    const { data: live } = await admin
      .from("chapters")
      .select("id")
      .eq("series_id", seriesId)
      .eq("status", "approved")
      .lte("publish_at", nowIso);
    const doneIds = new Set(done.filter((d) => d.series_id === seriesId).map((d) => d.chapter_id));
    finishedSeries = (live ?? []).length > 0 && (live ?? []).every((c) => doneIds.has(c.id));
  }
  const genres = new Set(
    done.flatMap((d) => ((d.series as unknown as { genres: string[] } | null)?.genres ?? [])),
  );

  const earned = earnedBadges({
    chaptersCompleted: done.length,
    streak: computeStreak((days ?? []).map((d) => d.day), today),
    finishedSeries,
    genresCompleted: genres.size,
  });
  const have = new Set((existing ?? []).map((b) => b.badge_key));
  const fresh = earned.filter((k) => !have.has(k));
  if (fresh.length) {
    await admin.from("child_badges").upsert(
      fresh.map((badge_key) => ({ child_id: childId, badge_key })),
      { onConflict: "child_id,badge_key", ignoreDuplicates: true },
    );
  }
  return fresh;
}
