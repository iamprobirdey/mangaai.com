import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { chapterLabel, type Chapter, type Series, type Volume } from "@/lib/content";
import { coverUrl } from "@/lib/storage";
import { formatDate, requestTime } from "@/lib/dates";
import { Cover } from "@/components/ui";
import { ActionForm } from "../../forms";
import { SeriesFields } from "../../series-fields";
import { CoverUploader } from "../../uploaders";
import { addChapter, addVolume, setSeriesStatus, updateSeries } from "../../actions";

function chapterState(c: Chapter) {
  if (c.status === "approved") {
    return c.publish_at && Date.parse(c.publish_at) > requestTime() ? `Scheduled ${formatDate(c.publish_at)}` : "Live";
  }
  if (c.page_count === 0) return "Needs pages";
  return c.status === "in_review" ? "Needs review" : "Draft";
}

export default async function AdminSeriesDetail({ params }: PageProps<"/admin/series/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("series").select("*").eq("id", id).maybeSingle();
  const series = data as Series | null;
  if (!series) notFound();

  const [{ data: volumes }, { data: chapters }] = await Promise.all([
    supabase.from("volumes").select("*").eq("series_id", id).order("number"),
    supabase.from("chapters").select("*").eq("series_id", id).order("number"),
  ]);
  const vols = (volumes ?? []) as Volume[];
  const list = (chapters ?? []) as Chapter[];
  const nextNumber = list.length ? Math.floor(Number(list[list.length - 1].number)) + 1 : 1;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/series" className="hint underline">All series</Link>
          <h1 className="mt-1 text-3xl">{series.title}</h1>
          <p className="mt-1">
            Status: <span className="tag">{series.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {series.status !== "published" ? (
            <form action={setSeriesStatus.bind(null, id, "published")}>
              <button className="btn btn-primary" type="submit">Publish series</button>
            </form>
          ) : (
            <form action={setSeriesStatus.bind(null, id, "draft")}>
              <button className="btn" type="submit">Unpublish</button>
            </form>
          )}
          {series.status !== "archived" ? (
            <form action={setSeriesStatus.bind(null, id, "archived")}>
              <button className="btn" type="submit">Archive</button>
            </form>
          ) : null}
        </div>
      </div>

      <section className="panel p-5">
        <h2 className="text-xl">Chapters</h2>
        <p className="hint mt-1">Readers only see approved chapters after their release time, in a published series.</p>
        <ul className="mt-4 divide-y-2 divide-tone-deep rounded-lg border-2 border-ink">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/chapters/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-tone">
                <span className="font-bold">{chapterLabel(c)}</span>
                <span className="flex items-center gap-2 text-sm">
                  {c.is_free_preview ? <span className="tag border-leaf text-leaf">Free preview</span> : null}
                  <span>{c.page_count} pages</span>
                  <span className="tag">{chapterState(c)}</span>
                </span>
              </Link>
            </li>
          ))}
          {list.length === 0 ? <li className="px-4 py-3">No chapters yet.</li> : null}
        </ul>
        <div className="mt-6 border-t-2 border-tone-deep pt-5">
          <h3 className="text-lg">Add a chapter</h3>
          <ActionForm action={addChapter} submit="Add chapter and upload pages" className="mt-3 grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="series_id" value={id} />
            <div>
              <label className="label" htmlFor="ch-number">Chapter number</label>
              <input className="field" id="ch-number" name="number" type="number" step="0.1" min="0.1" defaultValue={nextNumber} required />
            </div>
            <div>
              <label className="label" htmlFor="ch-title">Title (optional)</label>
              <input className="field" id="ch-title" name="title" maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="ch-volume">Volume</label>
              <select className="field" id="ch-volume" name="volume_id" defaultValue={vols.at(-1)?.id ?? ""}>
                <option value="">No volume</option>
                {vols.map((v) => (
                  <option key={v.id} value={v.id}>Volume {v.number}{v.title ? `: ${v.title}` : ""}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 self-end pb-3">
              <input type="checkbox" name="is_free_preview" defaultChecked={list.length === 0} className="h-5 w-5 accent-ink" />
              Free preview (readable without a subscription)
            </label>
          </ActionForm>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="panel-flat p-4">
          <h2 className="text-lg">Cover</h2>
          <Cover src={coverUrl(series.cover_path)} title={series.title} className="mt-3" />
          <CoverUploader seriesId={id} />
        </div>
        <div className="panel-flat p-5">
          <h2 className="text-lg">Details</h2>
          <ActionForm action={updateSeries} submit="Save series" className="mt-3 space-y-4">
            <input type="hidden" name="id" value={id} />
            <SeriesFields series={series} />
          </ActionForm>
        </div>
      </section>

      <section className="panel-flat p-5">
        <h2 className="text-lg">Volumes</h2>
        <p className="hint mt-1">Optional. Group chapters into volumes for longer series.</p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {vols.map((v) => (
            <li key={v.id} className="tag">Volume {v.number}{v.title ? `: ${v.title}` : ""}</li>
          ))}
        </ul>
        <ActionForm action={addVolume} submit="Add volume" className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="series_id" value={id} />
          <div>
            <label className="label" htmlFor="vol-number">Number</label>
            <input className="field w-24" id="vol-number" name="number" type="number" min="1" defaultValue={(vols.at(-1)?.number ?? 0) + 1} required />
          </div>
          <div>
            <label className="label" htmlFor="vol-title">Title (optional)</label>
            <input className="field" id="vol-title" name="title" maxLength={120} />
          </div>
        </ActionForm>
      </section>
    </div>
  );
}
