import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { volumeLabel, type Chapter, type Series } from "@/lib/content";
import { coverUrl } from "@/lib/storage";
import { Cover } from "@/components/ui";
import { ActionForm } from "../../forms";
import { SeriesFields } from "../../series-fields";
import { CoverUploader } from "../../uploaders";
import { addVolume, setSeriesStatus, updateSeries } from "../../actions";

function volumeState(c: Chapter) {
  if (c.status === "approved") return "Live";
  if (c.page_count === 0) return "Needs PDF";
  return c.status === "in_review" ? "Needs review" : "Draft";
}

export default async function AdminSeriesDetail({ params }: PageProps<"/admin/series/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("series").select("*").eq("id", id).maybeSingle();
  const series = data as Series | null;
  if (!series) notFound();

  const { data: chapters } = await supabase.from("chapters").select("*").eq("series_id", id).order("number");
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
        <h2 className="text-xl">Volumes</h2>
        <p className="hint mt-1">Each volume is one book, uploaded as one PDF. Readers see it as soon as you approve it, once the series is published.</p>
        <ul className="mt-4 divide-y-2 divide-tone-deep rounded-lg border-2 border-ink">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/volumes/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-tone">
                <span className="font-bold">{volumeLabel(c)}</span>
                <span className="flex items-center gap-2 text-sm">
                  <span>{c.page_count} pages</span>
                  <span className="tag">{volumeState(c)}</span>
                </span>
              </Link>
            </li>
          ))}
          {list.length === 0 ? <li className="px-4 py-3">No volumes yet.</li> : null}
        </ul>
        <div className="mt-6 border-t-2 border-tone-deep pt-5">
          <h3 className="text-lg">Add a volume</h3>
          <ActionForm action={addVolume} submit="Add volume and upload PDF" className="mt-3 grid gap-4 sm:grid-cols-[8rem_1fr]">
            <input type="hidden" name="series_id" value={id} />
            <div>
              <label className="label" htmlFor="vol-number">Volume</label>
              <input className="field" id="vol-number" name="number" type="number" step="1" min="1" defaultValue={nextNumber} required />
            </div>
            <div>
              <label className="label" htmlFor="vol-title">Title (optional)</label>
              <input className="field" id="vol-title" name="title" maxLength={120} />
            </div>
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

    </div>
  );
}
