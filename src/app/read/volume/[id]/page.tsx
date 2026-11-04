import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccess, requireChild } from "@/lib/dal";
import { PREVIEW_PAGES, volumeLabel, liveCutoff, readableChapter } from "@/lib/content";
import { childSummary, timeLeftSeconds } from "@/lib/reading";
import { avatarEmoji } from "@/lib/constants";
import { Reader } from "./reader";

export async function generateMetadata({ params }: PageProps<"/read/volume/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("chapters").select("number,title,series(title)").eq("id", id).maybeSingle();
  if (!data) return { title: "Reading" };
  const series = data.series as unknown as { title: string } | null;
  return { title: `${series?.title ?? "Manga"} — ${volumeLabel(data)}`, robots: { index: false } };
}

function Stop({ emoji, title, body, child }: { emoji: string; title: string; body: string; child: string }) {
  return (
    <div className="screentone flex flex-1 items-center justify-center px-4 py-16">
      <div className="panel max-w-md p-8 text-center">
        <div className="text-6xl" aria-hidden>{emoji}</div>
        <h1 className="mt-3 text-2xl">{title}</h1>
        <p className="mt-2">{body}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/read" className="btn btn-primary">Back to stories</Link>
          <Link href="/profiles" className="btn">Not {child}?</Link>
        </div>
      </div>
    </div>
  );
}

export default async function VolumePage({ params }: PageProps<"/read/volume/[id]">) {
  const { id } = await params;
  const child = await requireChild();
  const found = await readableChapter(child, id);
  if (!found) notFound();
  const { chapter, series } = found;

  const [access, summary] = await Promise.all([getAccess(child.parent_id), childSummary(child)]);
  // Without a trial or plan, only the first few pages are sent to the browser at all.
  const preview = !access.active;
  const left = timeLeftSeconds(child, summary.secondsToday);
  if (left === 0) {
    return (
      <Stop
        emoji="🌙"
        title="Reading time is done for today"
        body="Great reading! Your story will be right here tomorrow, on the same page."
        child={child.nickname}
      />
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: pageRows }, { data: progress }, { data: nextChapter }] = await Promise.all([
    admin.from("pages").select("page_number,image_path,width,height,image_path_sm,width_sm").eq("chapter_id", chapter.id).order("page_number"),
    supabase.from("reading_progress").select("last_page,completed_at").eq("child_id", child.id).eq("chapter_id", chapter.id).maybeSingle(),
    supabase.from("chapters").select("id,number,title").eq("series_id", series.id).gt("number", chapter.number).eq("status", "approved").lte("publish_at", liveCutoff()).order("number").limit(1).maybeSingle(),
  ]);
  const allRows = pageRows ?? [];
  if (allRows.length === 0) notFound();
  const rows = preview ? allRows.slice(0, PREVIEW_PAGES) : allRows;

  // Short-lived signed URLs: pages are never public and never served as a downloadable PDF.
  const paths = rows.flatMap((p) => (p.image_path_sm ? [p.image_path, p.image_path_sm] : [p.image_path]));
  const { data: signed } = await admin.storage.from("pages").createSignedUrls(paths, 60 * 60);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const pages = rows.map((p) => ({
    n: p.page_number,
    url: urlByPath.get(p.image_path) ?? "",
    w: p.width,
    h: p.height,
    sm: p.image_path_sm ? { url: urlByPath.get(p.image_path_sm) ?? "", w: p.width_sm ?? 800 } : null,
  }));

  const startPage = progress && !progress.completed_at ? Math.min(progress.last_page, pages.length) : 1;

  return (
    <Reader
      chapterId={chapter.id}
      title={series.title}
      chapterTitle={volumeLabel(chapter)}
      direction={series.reading_direction}
      pages={pages}
      startPage={startPage}
      seriesHref={`/read/series/${series.slug}`}
      next={nextChapter ? { href: `/read/volume/${nextChapter.id}`, label: volumeLabel(nextChapter) } : null}
      preview={preview && allRows.length > rows.length ? { totalPages: allRows.length } : null}
      childId={child.id}
      avatar={avatarEmoji(child.avatar)}
    />
  );
}
