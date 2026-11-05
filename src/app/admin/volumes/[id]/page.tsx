import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { volumeLabel, type Chapter, type Series } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import { Cover, Notice } from "@/components/ui";
import { coverUrl } from "@/lib/storage";
import { ActionForm } from "../../forms";
import { CoverUploader, VolumeUploader } from "../../uploaders";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ApproveForm } from "./approve-form";
import { deleteVolume, unpublishVolume, updateVolumeDetails } from "../../actions";

export default async function AdminVolumePage({ params }: PageProps<"/admin/volumes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("chapters").select("*, series(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { series, ...rest } = data as Chapter & { series: Series };
  const chapter = rest as Chapter;

  const admin = createAdminClient();
  const { data: pages } = await admin.from("pages").select("page_number,image_path,width,height").eq("chapter_id", id).order("page_number");
  const { data: signed } = pages?.length
    ? await admin.storage.from("pages").createSignedUrls(pages.map((p) => p.image_path), 60 * 30)
    : { data: [] };
  const live = chapter.status === "approved";

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/admin/series/${series.id}`} className="hint underline">{series.title}</Link>
        <h1 className="mt-1 text-3xl">{volumeLabel(chapter)}</h1>
      </div>

      {live ? <Notice tone="success">Live for readers since {formatDate(chapter.publish_at)}.</Notice> : null}
      {series.status !== "published" ? <Notice>This series is still a draft, so readers can&apos;t see any volumes yet.</Notice> : null}

      <section className="panel-flat grid gap-5 p-5 sm:grid-cols-[180px_1fr]">
        <div>
          <Cover src={coverUrl(chapter.cover_path)} title={volumeLabel(chapter)} />
          <CoverUploader volumeId={id} hasCover={!!chapter.cover_path} />
        </div>
        <div>
          <h2 className="text-xl">Volume cover</h2>
          <p className="mt-1">Shown on this book everywhere kids and parents see it. JPG, PNG or WebP, up to 5 MB; a 3:4 portrait image works best.</p>
          {series.cover_path ? null : <p className="hint mt-2">The series has no cover of its own, so it uses the first volume&apos;s cover.</p>}
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="text-xl">1. Book PDF</h2>
        <div className="mt-4">
          <VolumeUploader chapterId={id} hasPages={chapter.page_count > 0} />
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
            <h3 className="text-lg">3. Approve and publish</h3>
            {chapter.status === "approved" ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p>Approved {formatDate(chapter.reviewed_at)}.</p>
                <form action={unpublishVolume.bind(null, id)}>
                  <button type="submit" className="btn">Take it down for changes</button>
                </form>
              </div>
            ) : (
              <ApproveForm chapterId={id} />
            )}
          </div>
        </section>
      ) : null}

      <section className="panel-flat p-5">
        <h2 className="text-lg">Volume details</h2>
        <ActionForm action={updateVolumeDetails} submit="Save details" className="mt-3 max-w-md space-y-4">
          <input type="hidden" name="id" value={id} />
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input className="field" id="title" name="title" defaultValue={chapter.title ?? ""} maxLength={120} />
          </div>
        </ActionForm>
        <form action={deleteVolume.bind(null, id, series.id)} className="mt-6 border-t-2 border-tone-deep pt-4">
          <ConfirmSubmit
            label="Delete this volume and its pages"
            warning={`Delete ${volumeLabel(chapter)} for good? Its PDF, pages and cover are removed, and every child's progress on it is lost. This can't be undone.`}
            confirmLabel="Yes, delete this volume"
          />
        </form>
      </section>
    </div>
  );
}
