import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cover } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { PublicFooter, PublicHeader, PublicSite } from "@/components/public-chrome";
import { publicSeriesBySlug, samplePages } from "@/lib/public-data";
import { coverUrl } from "@/lib/storage";
import { AGE_BAND_LABELS } from "@/lib/constants";
import { PREVIEW_PAGES, volumeLabel } from "@/lib/content";
import { AGE_RANGE_SCHEMA, AGE_SLUGS, SITE_NAME, siteUrl } from "@/lib/site";

export const revalidate = 600;

function describe(synopsis: string, title: string) {
  const s = synopsis.trim() || `${title}, a kid-friendly manga series on ${SITE_NAME}.`;
  return s.length > 155 ? `${s.slice(0, 152).trimEnd()}…` : s;
}

export async function generateMetadata({ params }: PageProps<"/manga/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await publicSeriesBySlug(slug);
  if (!found) return { title: "Series not found", robots: { index: false } };
  const { series } = found;
  const title = `${series.title} — manga for kids ${AGE_BAND_LABELS[series.age_band].toLowerCase()}`;
  const description = describe(series.synopsis, series.title);
  const image = coverUrl(series.cover_path);
  return {
    title,
    description,
    alternates: { canonical: `/manga/${series.slug}` },
    openGraph: { type: "book", title: series.title, description, url: `/manga/${series.slug}`, images: image ? [{ url: image, alt: `${series.title} cover` }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title: series.title, description },
  };
}

export default async function PublicSeriesPage({ params }: PageProps<"/manga/[slug]">) {
  const { slug } = await params;
  const found = await publicSeriesBySlug(slug);
  if (!found) notFound();
  const { series, chapters } = found;
  const samples = await samplePages(chapters).catch(() => []);
  const base = siteUrl();
  const cover = coverUrl(series.cover_path);

  return (
    <PublicSite>
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        <nav aria-label="Breadcrumb" className="hint">
          <Link href="/manga-for-kids" className="underline">Manga for kids</Link> ›{" "}
          <Link href={`/manga-for-kids/${AGE_SLUGS[series.age_band]}`} className="underline">{AGE_BAND_LABELS[series.age_band]}</Link> › {series.title}
        </nav>

        <div className="mt-6 grid gap-10 md:grid-cols-[280px_1fr]">
          <div>
            <Cover src={cover} title={series.title} alt={`${series.title} cover`} />
            <div className="mt-4 flex flex-col gap-2">
              <Link href="/signup" className="btn btn-primary">{chapters.length ? "Read the whole book free for 7 days" : "Start your free trial"}</Link>
              <Link href={`/read/series/${series.slug}`} className="btn">Already a member? Open it</Link>
            </div>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl">{series.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="tag">{AGE_BAND_LABELS[series.age_band]}</span>
              {series.genres.map((g) => (
                <span key={g} className="tag">{g}</span>
              ))}
              {series.reading_direction === "rtl" ? <span className="tag">Reads right to left</span> : null}
            </div>
            <p className="mt-5 max-w-prose text-lg">{series.synopsis}</p>
            {chapters.length ? (
              <p className="mt-3 font-bold">
                {chapters.length === 1 ? "1 book" : `${chapters.length} books`} · peek at the first {PREVIEW_PAGES} pages of each, or read everything in the free trial.
              </p>
            ) : null}
            {series.is_ai_generated ? <p className="hint mt-2">Made with AI tools and checked page by page by our team.</p> : null}

            {samples.length ? (
              <section className="mt-10">
                <h2 className="text-xl">Take a look inside</h2>
                <ul className="mt-4 grid grid-cols-3 gap-3">
                  {samples.map((p) => (
                    <li key={p.n}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt={`${series.title}, sample page ${p.n}`} width={p.w} height={p.h} loading="lazy" className="h-auto w-full rounded-md border-[3px] border-ink" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="mt-10">
              <h2 className="text-xl">Volumes</h2>
              {chapters.length ? (
                <ul className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3">
                  {chapters.map((c) => (
                    <li key={c.id}>
                      <Cover src={coverUrl(c.cover_path ?? series.cover_path)} title={volumeLabel(c)} alt={`${series.title}, ${volumeLabel(c)} cover`} />
                      <p className="mt-2 font-bold leading-tight">{volumeLabel(c)}</p>
                      <p className="hint">{c.page_count} pages</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2">The first book is coming soon.</p>
              )}
            </section>
          </div>
        </div>
      </main>
      <PublicFooter />

      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ComicSeries",
            name: series.title,
            description: series.synopsis,
            url: `${base}/manga/${series.slug}`,
            image: cover ?? undefined,
            genre: series.genres,
            inLanguage: "en",
            typicalAgeRange: AGE_RANGE_SCHEMA[series.age_band],
            isAccessibleForFree: false,
            publisher: { "@type": "Organization", name: SITE_NAME, url: base },
            hasPart: chapters.slice(0, 50).map((c) => ({
              "@type": "Book",
              name: volumeLabel(c),
              image: coverUrl(c.cover_path) ?? undefined,
              bookEdition: `Volume ${Number(c.number)}`,
              numberOfPages: c.page_count,
              datePublished: c.publish_at,
              isAccessibleForFree: false,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Manga for kids", item: `${base}/manga-for-kids` },
              { "@type": "ListItem", position: 2, name: AGE_BAND_LABELS[series.age_band], item: `${base}/manga-for-kids/${AGE_SLUGS[series.age_band]}` },
              { "@type": "ListItem", position: 3, name: series.title, item: `${base}/manga/${series.slug}` },
            ],
          },
        ]}
      />
    </PublicSite>
  );
}
