import Link from "next/link";
import { notFound } from "next/navigation";
import { Cover } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getAccess, requireChild } from "@/lib/dal";
import { PREVIEW_PAGES, volumeLabel, childCanSee, hiddenSeriesIds, liveCutoff, type Chapter, type Series } from "@/lib/content";
import { coverUrl } from "@/lib/storage";
import { AGE_BAND_LABELS } from "@/lib/constants";
import { toggleShelf } from "../../../actions";

export default async function SeriesPage({ params }: PageProps<"/read/series/[slug]">) {
  const { slug } = await params;
  const child = await requireChild();
  const supabase = await createClient();
  const { data } = await supabase.from("series").select("*").eq("slug", slug).maybeSingle();
  const series = data as Series | null;
  if (!series || !childCanSee(child, series, await hiddenSeriesIds(child.id))) notFound();

  const [{ data: chapters }, { data: progress }, { data: shelf }, access] = await Promise.all([
    supabase.from("chapters").select("*").eq("series_id", series.id).eq("status", "approved").lte("publish_at", liveCutoff()).order("number"),
    supabase.from("reading_progress").select("chapter_id,last_page,completed_at").eq("child_id", child.id).eq("series_id", series.id),
    supabase.from("shelf").select("series_id").eq("child_id", child.id).eq("series_id", series.id).maybeSingle(),
    getAccess(child.parent_id),
  ]);
  const chapterList = (chapters ?? []) as Chapter[];
  const progressMap = new Map((progress ?? []).map((p) => [p.chapter_id as string, p]));
  const onShelf = Boolean(shelf);
  const firstUnread = chapterList.find((c) => !progressMap.get(c.id)?.completed_at) ?? chapterList[0];

  return (
    <div className="grid gap-10 md:grid-cols-[260px_1fr]">
      <div>
        <Cover src={coverUrl(series.cover_path ?? chapterList.find((c) => c.cover_path)?.cover_path)} title={series.title} />
        <div className="mt-4 flex flex-col gap-2">
          {firstUnread ? (
            <Link href={`/read/volume/${firstUnread.id}`} className="btn btn-primary">
              {progressMap.size ? "Keep reading" : "Start reading"}
            </Link>
          ) : null}
          <form action={toggleShelf.bind(null, series.id, series.slug, onShelf)}>
            <button type="submit" className="btn w-full">{onShelf ? "On my shelf ✓" : "Add to my shelf"}</button>
          </form>
        </div>
      </div>
      <div>
        <Link href="/read" className="hint underline">Back to all stories</Link>
        <h1 className="mt-2 text-3xl">{series.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="tag">{AGE_BAND_LABELS[series.age_band]}</span>
          {series.genres.map((g) => (
            <span key={g} className="tag">{g}</span>
          ))}
          {series.reading_direction === "rtl" ? <span className="tag">Reads right to left</span> : null}
        </div>
        <p className="mt-4 max-w-prose text-lg">{series.synopsis}</p>
        {series.is_ai_generated ? <p className="hint mt-2">Made with AI and checked by our team before publishing.</p> : null}

        {!access.active && chapterList.length ? (
          <p className="panel-flat mt-6 p-3">You can peek at the first {PREVIEW_PAGES} pages of each book. Ask a grown-up to start the free trial to read them all.</p>
        ) : null}
        <section className="mt-8">
          <h2 className="text-xl">{chapterList.length === 1 ? "1 book" : `${chapterList.length} books`}</h2>
          <ul className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {chapterList.map((c) => {
              const p = progressMap.get(c.id);
              return (
                <li key={c.id}>
                  <Link href={`/read/volume/${c.id}`} className="block">
                    <Cover src={coverUrl(c.cover_path ?? series.cover_path)} title={volumeLabel(c)} />
                    <p className="mt-2 font-bold leading-tight">{volumeLabel(c)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="hint">{c.page_count} pages</span>
                      {p?.completed_at ? <span className="tag border-leaf text-leaf">Read ✓</span> : p ? <span className="tag">Page {p.last_page}</span> : null}
                      {!access.active ? <span className="tag">Peek</span> : null}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        {chapterList.length === 0 ? <p className="mt-8">The first book is coming soon!</p> : null}
      </div>
    </div>
  );
}
