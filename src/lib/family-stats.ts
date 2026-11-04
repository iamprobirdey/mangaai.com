import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, localDate } from "@/lib/dates";
import { computeStreak } from "@/lib/streak";
import { serverEnv } from "@/lib/env";

export type ChildWeek = {
  childId: string;
  seconds: number;
  pages: number;
  daysRead: number;
  streak: number;
  chaptersFinished: { title: string; series: string }[];
  badges: string[];
};

/** Last-7-days summary per child. Works with either the parent's client (RLS) or the admin client. */
export async function weeklyStats(supabase: SupabaseClient, childIds: string[]): Promise<Map<string, ChildWeek>> {
  const out = new Map<string, ChildWeek>();
  if (childIds.length === 0) return out;
  const today = localDate(serverEnv.timezone());
  const weekStart = addDays(today, -6);
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [days, finished, badges] = await Promise.all([
    supabase.from("reading_days").select("child_id,day,seconds,pages_read").in("child_id", childIds).gte("day", addDays(today, -90)),
    supabase
      .from("reading_progress")
      .select("child_id,completed_at,chapters(number,title),series(title)")
      .in("child_id", childIds)
      .gte("completed_at", since),
    supabase.from("child_badges").select("child_id,badge_key").in("child_id", childIds).gte("earned_at", since),
  ]);

  for (const id of childIds) {
    const mine = (days.data ?? []).filter((d) => d.child_id === id);
    const week = mine.filter((d) => d.day >= weekStart);
    out.set(id, {
      childId: id,
      seconds: week.reduce((a, d) => a + d.seconds, 0),
      pages: week.reduce((a, d) => a + d.pages_read, 0),
      daysRead: week.filter((d) => d.seconds > 0 || d.pages_read > 0).length,
      streak: computeStreak(mine.map((d) => d.day), today),
      chaptersFinished: (finished.data ?? [])
        .filter((r) => r.child_id === id)
        .map((r) => {
          const ch = r.chapters as unknown as { number: number; title: string | null } | null;
          const se = r.series as unknown as { title: string } | null;
          return { title: ch?.title ? `Vol. ${Number(ch.number)}: ${ch.title}` : `Vol. ${Number(ch?.number)}`, series: se?.title ?? "" };
        }),
      badges: (badges.data ?? []).filter((b) => b.child_id === id).map((b) => b.badge_key),
    });
  }
  return out;
}
