import type { Metadata } from "next";
import Link from "next/link";
import { Cover } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { PublicFooter, PublicHeader, PublicSite } from "@/components/public-chrome";
import { publishedSeries } from "@/lib/public-data";
import { coverUrl } from "@/lib/storage";
import { AGE_BANDS, AGE_BAND_LABELS } from "@/lib/constants";
import { AGE_PAGE_COPY } from "@/lib/age-pages";
import { AGE_SLUGS, siteUrl } from "@/lib/site";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Manga for kids, by age: safe, age-right manga series",
  description:
    "Kid-friendly manga sorted by age, from gentle picture stories for 4–6 year olds to adventures for young teens. No ads, no chat, new chapters every week.",
  alternates: { canonical: "/manga-for-kids" },
};

export default async function MangaForKidsHub() {
  const series = await publishedSeries();

  return (
    <PublicSite>
      <PublicHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 sm:px-6">
        <div className="bubble max-w-3xl">
          <h1 className="text-3xl sm:text-4xl">Manga for kids, by age</h1>
        </div>
        <p className="mt-10 max-w-2xl text-lg">
          Every MangaAI series has an age range, and each child&apos;s reader profile only shows stories for their age and
          younger. Pick an age to see what&apos;s on the shelf and what to expect.
        </p>

        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {AGE_BANDS.map((band) => {
            const items = series.filter((s) => s.age_band === band);
            return (
              <li key={band} className="panel p-5">
                <h2 className="text-xl">
                  <Link href={`/manga-for-kids/${AGE_SLUGS[band]}`} className="underline decoration-sun decoration-4 underline-offset-4">
                    {AGE_PAGE_COPY[band].title}
                  </Link>
                </h2>
                <p className="mt-2">{AGE_PAGE_COPY[band].intro}</p>
                {items.length ? (
                  <ul className="mt-4 grid grid-cols-4 gap-3">
                    {items.slice(0, 4).map((s) => (
                      <li key={s.id}>
                        <Link href={`/manga/${s.slug}`} title={s.title}>
                          <Cover src={coverUrl(s.cover_path)} title={s.title} alt={`${s.title} cover`} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-4">
                  <Link href={`/manga-for-kids/${AGE_SLUGS[band]}`} className="btn">
                    See {AGE_BAND_LABELS[band].toLowerCase()} {items.length ? `(${items.length})` : ""}
                  </Link>
                </p>
              </li>
            );
          })}
        </ul>

        <section className="mt-12 max-w-2xl">
          <h2 className="text-2xl">New to manga?</h2>
          <p className="mt-2">
            Read our parent guide, <Link className="underline" href="/guides/is-manga-ok-for-kids">Is manga OK for kids?</Link>, or
            the quick <Link className="underline" href="/guides/how-to-read-manga">how to read manga</Link> explainer to share with
            your child.
          </p>
        </section>
      </main>
      <PublicFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Manga for kids, by age",
          url: `${siteUrl()}/manga-for-kids`,
          hasPart: AGE_BANDS.map((b) => ({ "@type": "WebPage", name: AGE_PAGE_COPY[b].title, url: `${siteUrl()}/manga-for-kids/${AGE_SLUGS[b]}` })),
        }}
      />
    </PublicSite>
  );
}
