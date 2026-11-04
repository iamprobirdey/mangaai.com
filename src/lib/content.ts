import "server-only";
import { createClient } from "@/lib/supabase/server";
import { bandsUpTo, type AgeBand, type Direction } from "@/lib/constants";
import type { Child } from "@/lib/dal";

export type Series = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  cover_path: string | null;
  age_band: AgeBand;
  genres: string[];
  reading_direction: Direction;
  status: "draft" | "published" | "archived";
  is_ai_generated: boolean;
  release_day: number | null;
  created_at: string;
};

export type Chapter = {
  id: string;
  series_id: string;
  volume_id: string | null;
  number: number;
  title: string | null;
  is_free_preview: boolean;
  status: "draft" | "in_review" | "approved";
  publish_at: string | null;
  page_count: number;
  reviewed_at: string | null;
};

export type Volume = { id: string; series_id: string; number: number; title: string | null };

export async function hiddenSeriesIds(childId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("child_hidden_series").select("series_id").eq("child_id", childId);
  return new Set((data ?? []).map((r) => r.series_id as string));
}

/** Published series this child is allowed to see (age band and parent's hidden list). */
export async function seriesForChild(child: Child): Promise<Series[]> {
  const supabase = await createClient();
  const [{ data }, hidden] = await Promise.all([
    supabase
      .from("series")
      .select("*")
      .eq("status", "published")
      .in("age_band", bandsUpTo(child.age_band))
      .order("title"),
    hiddenSeriesIds(child.id),
  ]);
  return ((data ?? []) as Series[]).filter((s) => !hidden.has(s.id));
}

export function childCanSee(child: Child, series: Series, hidden: Set<string>) {
  return series.status === "published" && bandsUpTo(child.age_band).includes(series.age_band) && !hidden.has(series.id);
}

/** A live chapter plus its series, or null if the child may not open it. */
export async function readableChapter(child: Child, chapterId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("chapters").select("*, series(*)").eq("id", chapterId).maybeSingle();
  if (!data || !data.series) return null;
  const { series, ...chapter } = data as Chapter & { series: Series };
  if (!childCanSee(child, series, await hiddenSeriesIds(child.id))) return null;
  return { chapter: chapter as Chapter, series };
}

export function chapterLabel(c: Pick<Chapter, "number" | "title">) {
  const n = Number(c.number) % 1 === 0 ? Number(c.number).toFixed(0) : String(c.number);
  return c.title ? `Chapter ${n}: ${c.title}` : `Chapter ${n}`;
}
