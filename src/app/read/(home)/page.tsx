import Link from "next/link";
import { Cover } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getAccess, requireChild } from "@/lib/dal";
import { PREVIEW_PAGES, volumeLabel, liveCutoff, seriesForChild, type Chapter, type Series } from "@/lib/content";
import { coverUrl } from "@/lib/storage";
import { childSummary, timeLeftSeconds } from "@/lib/reading";
import { GENRES } from "@/lib/constants";
import { requestTime } from "@/lib/dates";

export const metadata = { title: "Read" };

type LiveChapter = Pick<Chapter, "id" | "series_id" | "number" | "title" | "cover_path" | "publish_at" | "page_count">;
type ProgressRow = { chapter_id: string; series_id: string; last_page: number; completed_at: string | null; updated_at: string };

export default async function KidHome({ searchParams }: PageProps<"/read">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";
  const child = await requireChild();
  const supabase = await createClient();
  const [series, access, summary] = await Promise.all([seriesForChild(child), getAccess(child.parent_id), childSummary(child)]);
  const seriesIds = series.map((s) => s.id);
  const byId = new Map(series.map((s) => [s.id, s]));

  const [{ data: chapterRows }, { data: progressRows }, { data: shelfRows }] = await Promise.all([
    seriesIds.length
      ? supabase.from("chapters").select("id,series_id,number,title,cover_path,publish_at,page_count").in("series_id", seriesIds).eq("status", "approved").lte("publish_at", liveCutoff()).order("number")
      : Promise.resolve({ data: [] }),
    supabase.from("reading_progress").select("chapter_id,series_id,last_page,completed_at,updated_at").eq("child_id", child.id).order("updated_at", { ascending: false }).limit(50),
    supabase.from("shelf").select("series_id").eq("child_id", child.id).order("created_at", { ascending: false }),
  ]);
  const chapters = (chapterRows ?? []) as LiveChapter[];
  const progress = (progressRows ?? []) as ProgressRow[];
  const progressByChapter = new Map(progress.map((p) => [p.chapter_id, p]));

  // Continue reading: one card per recently read series — the unfinished volume, or the next one.
  const seen = new Set<string>();
  const continueCards: { series: Series; chapter: LiveChapter; page: number }[] = [];
  for (const p of progress) {
    if (seen.has(p.series_id) || !byId.has(p.series_id)) continue;
    seen.add(p.series_id);
    const inSeries = chapters.filter((c) => c.series_id === p.series_id);
    const current = inSeries.find((c) => c.id === p.chapter_id);
    if (!current) continue;
    if (!p.completed_at) {
      continueCards.push({ series: byId.get(p.series_id)!, chapter: current, page: p.last_page });
    } else {
      const next = inSeries.find((c) => Number(c.number) > Number(current.number) && !progressByChapter.get(c.id)?.completed_at);
      if (next) continueCards.push({ series: byId.get(p.series_id)!, chapter: next, page: 1 });
    }
    if (continueCards.length >= 4) break;
  }

  const weekAgo = requestTime() - 7 * 86_400_000;
  const fresh = chapters
    .filter((c) => c.publish_at && Date.parse(c.publish_at) >= weekAgo)
    .sort((a, b) => Date.parse(b.publish_at!) - Date.parse(a.publish_at!))
    .slice(0, 8);
  const shelf = (shelfRows ?? []).map((r) => byId.get(r.series_id)).filter(Boolean) as Series[];
  const left = timeLeftSeconds(child, summary.secondsToday);
  const results = query ? series.filter((s) => s.title.toLowerCase().includes(query) || s.genres.some((g) => g.toLowerCase().includes(query))) : null;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="bubble">
          <h1 className="text-2xl sm:text-3xl">What are we reading, {child.nickname}?</h1>
        </div>
        <form role="search" className="flex gap-2" action="/read">
          <label htmlFor="q" className="sr-only">Search stories</label>
          <input id="q" name="q" defaultValue={query} placeholder="Search stories" className="field w-56" />
          <button className="btn" type="submit">Search</button>
        </form>
      </div>

      {left !== null ? (
        <p className="font-bold">
          {left > 0 ? `You have ${Math.ceil(left / 60)} minutes of reading left today.` : "That's all the reading time for today. See you tomorrow!"}
        </p>
      ) : null}
      {!access.active ? (
        <p className="panel-flat p-4">
          You can peek at the first {PREVIEW_PAGES} pages of every book. Ask a grown-up to start the free trial to read them all.
        </p>
      ) : null}

      {results ? (
        <Shelf title={`Results for “${query}”`} items={results} empty="No stories match that. Try another word." />
      ) : (
        <>
          {continueCards.length ? (
            <section>
              <h2 className="text-2xl">Continue reading</h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {continueCards.map(({ series: s, chapter, page }) => (
                  <li key={s.id}>
                    <Link href={`/read/volume/${chapter.id}`} className="panel flex gap-4 p-3 hover:-translate-y-0.5">
                      <Cover src={coverUrl(chapter.cover_path ?? s.cover_path)} title={s.title} className="w-20 shrink-0" />
                      <div className="flex flex-col justify-center">
                        <span className="font-display">{s.title}</span>
                        <span>{volumeLabel(chapter)}</span>
                        <span className="hint">
                          {page > 1 ? `Page ${page} of ${chapter.page_count}` : "Start the next volume"}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {fresh.length ? (
            <section>
              <h2 className="text-2xl">New books</h2>
              <ul className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4">
                {fresh.map((c) => {
                  const s = byId.get(c.series_id)!;
                  return (
                    <li key={c.id}>
                      <Link href={`/read/volume/${c.id}`} className="block">
                        <Cover src={coverUrl(c.cover_path ?? s.cover_path)} title={volumeLabel(c)} />
                        <p className="mt-2 font-bold">{s.title}</p>
                        <p className="hint">{volumeLabel(c)}</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          <Shelf title="My shelf" items={shelf} empty="Tap “Add to my shelf” on a story you like and it shows up here." />

          {GENRES.map((g) => {
            const items = series.filter((s) => s.genres.includes(g));
            return items.length ? <Shelf key={g} title={g} items={items} /> : null;
          })}
          {series.length === 0 ? <p>New stories are on their way. Check back soon!</p> : null}
          <Shelf title="All stories" items={series} />
        </>
      )}
    </div>
  );
}

function Shelf({ title, items, empty }: { title: string; items: Series[]; empty?: string }) {
  if (!items.length && !empty) return null;
  return (
    <section>
      <h2 className="text-2xl">{title}</h2>
      {items.length ? (
        <ul className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((s) => (
            <li key={s.id}>
              <Link href={`/read/series/${s.slug}`} className="block">
                <Cover src={coverUrl(s.cover_path)} title={s.title} />
                <p className="mt-2 font-bold leading-tight">{s.title}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint mt-2">{empty}</p>
      )}
    </section>
  );
}
