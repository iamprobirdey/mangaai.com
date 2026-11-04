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
  created_at: string;
};

/**
 * One volume of a series: a single uploaded PDF (one book). Stored in the `chapters` table.
 */
export type Chapter = {
  id: string;
  series_id: string;
  number: number;
  title: string | null;
  status: "draft" | "in_review" | "approved";
  publish_at: string | null;
  page_count: number;
  reviewed_at: string | null;
};

/** Families without a trial or plan can read this many pages of every volume. */
export const PREVIEW_PAGES = 3;

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

/**
 * Kids only ever see approved volumes. RLS enforces this for parents, but admins can read every
 * row, so reader screens filter explicitly too (status = approved, publish_at <= now) and
 * readableChapter re-checks here.
 */
export function liveCutoff() {
  return new Date().toISOString();
}

export function chapterIsLive(c: Pick<Chapter, "status" | "publish_at">) {
  return c.status === "approved" && !!c.publish_at && Date.parse(c.publish_at) <= Date.now();
}

/** A live volume plus its series, or null if the child may not open it. */
export async function readableChapter(child: Child, chapterId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("chapters").select("*, series(*)").eq("id", chapterId).maybeSingle();
  if (!data || !data.series) return null;
  const { series, ...chapter } = data as Chapter & { series: Series };
  if (!chapterIsLive(chapter)) return null;
  if (!childCanSee(child, series, await hiddenSeriesIds(child.id))) return null;
  return { chapter: chapter as Chapter, series };
}

export function volumeLabel(c: Pick<Chapter, "number" | "title">) {
  const n = Number(c.number) % 1 === 0 ? Number(c.number).toFixed(0) : String(c.number);
  return c.title ? `Volume ${n}: ${c.title}` : `Volume ${n}`;
}
