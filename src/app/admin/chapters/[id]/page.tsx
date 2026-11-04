import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chapterLabel, type Chapter, type Series, type Volume } from "@/lib/content";
import { formatDate, requestTime } from "@/lib/dates";
import { Notice } from "@/components/ui";
import { ActionForm } from "../../forms";
import { ChapterUploader } from "../../uploaders";
import { ApproveForm } from "./approve-form";
import { deleteChapter, unpublishChapter, updateChapterDetails } from "../../actions";

/** Next occurrence of the series' release day at 08:00 local, as a datetime-local value. */
function defaultRelease(releaseDay: number | null) {
  const d = new Date();
  if (releaseDay !== null) {
    const add = (releaseDay - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + add);
    d.setHours(8, 0, 0, 0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminChapterPage({ params }: PageProps<"/admin/chapters/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("chapters").select("*, series(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { series, ...rest } = data as Chapter & { series: Series };
  const chapter = rest as Chapter;

  const admin = createAdminClient();
  const [{ data: pages }, { data: volumes }] = await Promise.all([
    admin.from("pages").select("page_number,image_path,width,height").eq("chapter_id", id).order("page_number"),
    supabase.from("volumes").select("*").eq("series_id", series.id).order("number"),
  ]);
  const { data: signed } = pages?.length
    ? await admin.storage.from("pages").createSignedUrls(pages.map((p) => p.image_path), 60 * 30)
    : { data: [] };
  const live = chapter.status === "approved" && chapter.publish_at && Date.parse(chapter.publish_at) <= requestTime();
  const scheduled = chapter.status === "approved" && !live;

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/series/${series.id}`} className="hint underline">{series.title}</Link>
        <h1 className="mt-1 text-3xl">{chapterLabel(chapter)}</h1>
      </div>

      {live ? <Notice tone="success">Live for readers since {formatDate(chapter.publish_at)}.</Notice> : null}
      {scheduled ? <Notice>Approved. Goes live {new Date(chapter.publish_at!).toLocaleString("en-IN")}.</Notice> : null}
      {series.status !== "published" ? <Notice>This series is still a draft, so readers can&apos;t see any chapters yet.</Notice> : null}

      <section className="panel p-5">
        <h2 className="text-xl">1. Pages</h2>
        <div className="mt-4">
          <ChapterUploader chapterId={id} hasPages={chapter.page_count > 0} />
        </div>
      </section>

      {pages?.length ? (
        <section className="panel p-5">
          <h2 className="text-xl">2. Review every page</h2>
          <p className="mt-1">These are for kids. Check each page for strange or unsuitable AI output before approving.</p>
          <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {pages.map((p, i) => (
              <li key={p.page_number}>
                <a href={signed?.[i]?.signedUrl ?? undefined} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signed?.[i]?.signedUrl ?? undefined} alt={`Page ${p.page_number}`} width={p.width} height={p.height} loading="lazy" className="h-auto w-full rounded border-2 border-ink" />
                  <span className="hint">Page {p.page_number}</span>
                </a>
              </li>
            ))}
          </ol>
          <div className="mt-6 border-t-2 border-tone-deep pt-5">
            <h3 className="text-lg">3. Approve and schedule</h3>
            {chapter.status === "approved" ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p>Approved {formatDate(chapter.reviewed_at)}.</p>
                <form action={unpublishChapter.bind(null, id)}>
                  <button type="submit" className="btn">Take it down for changes</button>
                </form>
              </div>
            ) : (
              <ApproveForm chapterId={id} defaultRelease={defaultRelease(series.release_day)} />
            )}
          </div>
        </section>
      ) : null}

      <section className="panel-flat p-5">
        <h2 className="text-lg">Chapter details</h2>
        <ActionForm action={updateChapterDetails} submit="Save details" className="mt-3 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={id} />
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input className="field" id="title" name="title" defaultValue={chapter.title ?? ""} maxLength={120} />
          </div>
          <div>
            <label className="label" htmlFor="volume_id">Volume</label>
            <select className="field" id="volume_id" name="volume_id" defaultValue={chapter.volume_id ?? ""}>
              <option value="">No volume</option>
              {((volumes ?? []) as Volume[]).map((v) => (
                <option key={v.id} value={v.id}>Volume {v.number}{v.title ? `: ${v.title}` : ""}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" name="is_free_preview" defaultChecked={chapter.is_free_preview} className="h-5 w-5 accent-ink" />
            Free preview (readable without a subscription)
          </label>
        </ActionForm>
        <form action={deleteChapter.bind(null, id, series.id)} className="mt-6 border-t-2 border-tone-deep pt-4">
          <button type="submit" className="btn btn-danger">Delete this chapter and its pages</button>
        </form>
      </section>
    </div>
  );
}
