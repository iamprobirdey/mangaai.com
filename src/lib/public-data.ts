import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AgeBand } from "@/lib/constants";

/**
 * Data for public (logged-out, indexable) pages. Uses the publishable key without cookies,
 * so row level security limits it to published series and live chapters, and pages can be cached.
 */
function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type PublicSeries = {
  id: string;
  slug: string;
  title: string;
  synopsis: string;
  cover_path: string | null;
  age_band: AgeBand;
  genres: string[];
  reading_direction: "rtl" | "ltr" | "vertical";
  release_day: number | null;
  is_ai_generated: boolean;
  updated_at: string;
};

export type PublicChapter = { id: string; number: number; title: string | null; is_free_preview: boolean; publish_at: string };

const SERIES_FIELDS = "id,slug,title,synopsis,cover_path,age_band,genres,reading_direction,release_day,is_ai_generated,updated_at";

export async function publishedSeries(): Promise<PublicSeries[]> {
  const db = anon();
  if (!db) return [];
  try {
    const { data } = await db.from("series").select(SERIES_FIELDS).eq("status", "published").order("title");
    return (data ?? []) as PublicSeries[];
  } catch {
    return [];
  }
}

export async function publicSeriesBySlug(slug: string) {
  const db = anon();
  if (!db) return null;
  const { data: series } = await db.from("series").select(SERIES_FIELDS).eq("slug", slug).eq("status", "published").maybeSingle();
  if (!series) return null;
  const { data: chapters } = await db
    .from("chapters")
    .select("id,number,title,is_free_preview,publish_at")
    .eq("series_id", series.id)
    .order("number");
  return { series: series as PublicSeries, chapters: (chapters ?? []) as PublicChapter[] };
}

/** First few pages of the series' first free chapter, as short-lived signed URLs (phone-sized rendition). */
export async function samplePages(chapters: PublicChapter[], count = 3) {
  const free = chapters.find((c) => c.is_free_preview);
  if (!free) return [];
  const admin = createAdminClient();
  const { data: pages } = await admin
    .from("pages")
    .select("page_number,image_path,image_path_sm,width,height")
    .eq("chapter_id", free.id)
    .order("page_number")
    .limit(count);
  if (!pages?.length) return [];
  const paths = pages.map((p) => p.image_path_sm ?? p.image_path);
  const { data: signed } = await admin.storage.from("pages").createSignedUrls(paths, 60 * 60 * 6);
  return pages.map((p, i) => ({ n: p.page_number, url: signed?.[i]?.signedUrl ?? "", w: p.width, h: p.height }));
}
