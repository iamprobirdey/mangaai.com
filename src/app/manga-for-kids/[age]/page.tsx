import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Cover } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { PublicFooter, PublicHeader, PublicSite } from "@/components/public-chrome";
import { publishedSeries } from "@/lib/public-data";
import { coverUrl } from "@/lib/storage";
import { AGE_BANDS, AGE_BAND_LABELS, bandsUpTo } from "@/lib/constants";
import { AGE_PAGE_COPY } from "@/lib/age-pages";
import { AGE_SLUGS, bandFromSlug, siteUrl } from "@/lib/site";

export const revalidate = 600;
export const dynamicParams = false;

export function generateStaticParams() {
  return AGE_BANDS.map((b) => ({ age: AGE_SLUGS[b] }));
}

export async function generateMetadata({ params }: PageProps<"/manga-for-kids/[age]">): Promise<Metadata> {
  const { age } = await params;
  const band = bandFromSlug(age);
  if (!band) return {};
  const copy = AGE_PAGE_COPY[band];
  return {
    title: copy.title,
    description: `${copy.intro.split(". ")[0]}. Safe, ad-free manga books, free for 7 days.`.slice(0, 160),
    alternates: { canonical: `/manga-for-kids/${age}` },
  };
}

export default async function AgePage({ params }: PageProps<"/manga-for-kids/[age]">) {
  const { age } = await params;
  const band = bandFromSlug(age);
  if (!band) notFound();
  const copy = AGE_PAGE_COPY[band];
  const all = await publishedSeries();
  const exact = all.filter((s) => s.age_band === band);
  const younger = all.filter((s) => s.age_band !== band && bandsUpTo(band).includes(s.age_band));
  const base = siteUrl();

  const grid = (items: typeof all) => (
    <ul className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-5">
      {items.map((s) => (
        <li key={s.id}>
          <Link href={`/manga/${s.slug}`} className="block">
            <Cover src={coverUrl(s.cover_path)} title={s.title} />
            <p className="mt-2 font-bold leading-tight">{s.title}</p>
            <p className="hint">{s.genres.slice(0, 2).join(" · ") || AGE_BAND_LABELS[s.age_band]}</p>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <PublicSite>
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        <nav aria-label="Breadcrumb" className="hint">
          <Link href="/manga-for-kids" className="underline">Manga for kids</Link> › {AGE_BAND_LABELS[band]}
        </nav>
        <h1 className="mt-4 text-3xl sm:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-lg">{copy.intro}</p>

        <section className="mt-10">
          <h2 className="text-2xl">Series for {AGE_BAND_LABELS[band].toLowerCase()}</h2>
          {exact.length ? grid(exact) : <p className="mt-2">New series for this age are on their way. Check back soon.</p>}
        </section>

        {younger.length ? (
          <section className="mt-10">
            <h2 className="text-2xl">Also suitable</h2>
            <p className="hint mt-1">Series for younger readers that this age group can enjoy too.</p>
            {grid(younger)}
          </section>
        ) : null}

        <section className="panel mt-12 max-w-2xl p-6">
          <h2 className="text-xl">Tips for parents</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {copy.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <Link href="/signup" className="btn btn-primary mt-6">Start a 7-day free trial</Link>
        </section>

        <nav aria-label="Other ages" className="mt-12 flex flex-wrap gap-2">
          {AGE_BANDS.filter((b) => b !== band).map((b) => (
            <Link key={b} href={`/manga-for-kids/${AGE_SLUGS[b]}`} className="btn">{AGE_PAGE_COPY[b].title}</Link>
          ))}
        </nav>
      </main>
      <PublicFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: copy.title,
          itemListElement: exact.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: `${base}/manga/${s.slug}`, name: s.title })),
        }}
      />
    </PublicSite>
  );
}
