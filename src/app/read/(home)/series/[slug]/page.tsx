import Link from "next/link";
import { notFound } from "next/navigation";
import { Cover } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getAccess, requireChild } from "@/lib/dal";
import { chapterLabel, childCanSee, hiddenSeriesIds, liveCutoff, type Chapter, type Series, type Volume } from "@/lib/content";
import { coverUrl } from "@/lib/storage";
import { AGE_BAND_LABELS, DAYS } from "@/lib/constants";
import { toggleShelf } from "../../../actions";

export default async function SeriesPage({ params }: PageProps<"/read/series/[slug]">) {
  const { slug } = await params;
  const child = await requireChild();
  const supabase = await createClient();
  const { data } = await supabase.from("series").select("*").eq("slug", slug).maybeSingle();
  const series = data as Series | null;
  if (!series || !childCanSee(child, series, await hiddenSeriesIds(child.id))) notFound();

  const [{ data: volumes }, { data: chapters }, { data: progress }, { data: shelf }, access] = await Promise.all([
    supabase.from("volumes").select("*").eq("series_id", series.id).order("number"),
    supabase.from("chapters").select("*").eq("series_id", series.id).eq("status", "approved").lte("publish_at", liveCutoff()).order("number"),
    supabase.from("reading_progress").select("chapter_id,last_page,completed_at").eq("child_id", child.id).eq("series_id", series.id),
    supabase.from("shelf").select("series_id").eq("child_id", child.id).eq("series_id", series.id).maybeSingle(),
    getAccess(child.parent_id),
  ]);
  const chapterList = (chapters ?? []) as Chapter[];
  const progressMap = new Map((progress ?? []).map((p) => [p.chapter_id as string, p]));
  const onShelf = Boolean(shelf);
  const firstUnread = chapterList.find((c) => !progressMap.get(c.id)?.completed_at) ?? chapterList[0];

  const groups: { title: string | null; items: Chapter[] }[] = [];
  const vols = (volumes ?? []) as Volume[];
  for (const v of vols) {
    const items = chapterList.filter((c) => c.volume_id === v.id);
    if (items.length) groups.push({ title: v.title ? `Volume ${v.number}: ${v.title}` : `Volume ${v.number}`, items });
  }
  const loose = chapterList.filter((c) => !c.volume_id || !vols.some((v) => v.id === c.volume_id));
  if (loose.length) groups.push({ title: vols.length ? "More chapters" : null, items: loose });

  return (
    <div className="grid gap-10 md:grid-cols-[260px_1fr]">
      <div>
        <Cover src={coverUrl(series.cover_path)} title={series.title} />
        <div className="mt-4 flex flex-col gap-2">
          {firstUnread ? (
            <Link href={`/read/chapter/${firstUnread.id}`} className="btn btn-primary">
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
        {series.release_day !== null ? <p className="mt-2 font-bold">New chapters every {DAYS[series.release_day]}.</p> : null}
        {series.is_ai_generated ? <p className="hint mt-2">Made with AI and checked by our team before publishing.</p> : null}

        {groups.map((g, i) => (
          <section key={i} className="mt-8">
            {g.title ? <h2 className="text-xl">{g.title}</h2> : <h2 className="sr-only">Chapters</h2>}
            <ul className="mt-3 divide-y-2 divide-tone-deep rounded-lg border-[3px] border-ink bg-paper">
              {g.items.map((c) => {
                const p = progressMap.get(c.id);
                const locked = !access.active && !c.is_free_preview;
                return (
                  <li key={c.id}>
                    <Link href={`/read/chapter/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-tone">
                      <span className="font-bold">{chapterLabel(c)}</span>
                      <span className="flex items-center gap-2 text-sm">
                        {c.is_free_preview && !access.active ? <span className="tag border-leaf text-leaf">Free</span> : null}
                        {p?.completed_at ? <span className="tag border-leaf text-leaf">Read ✓</span> : p ? <span className="tag">Page {p.last_page}</span> : null}
                        {locked ? <span aria-label="Locked">🔒</span> : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {chapterList.length === 0 ? <p className="mt-8">The first chapter is coming soon!</p> : null}
      </div>
    </div>
  );
}
