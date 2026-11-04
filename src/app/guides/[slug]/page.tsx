import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PublicFooter, PublicHeader, PublicSite } from "@/components/public-chrome";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { formatDate } from "@/lib/dates";
import { SITE_NAME, siteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: { type: "article", title: g.title, description: g.description, url: `/guides/${g.slug}` },
  };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const g = guideBySlug(slug);
  if (!g) notFound();
  const others = GUIDES.filter((o) => o.slug !== g.slug);

  return (
    <PublicSite>
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 sm:px-6">
        <nav aria-label="Breadcrumb" className="hint">
          <Link href="/guides" className="underline">Parent guides</Link> › {g.title}
        </nav>
        <article className="mt-4">
          <h1 className="text-3xl sm:text-4xl">{g.title}</h1>
          <p className="hint mt-2">Updated {formatDate(g.updated)}</p>
          <p className="mt-6 text-lg">{g.description}</p>
          {g.sections.map((s) => (
            <section key={s.heading} className="mt-8">
              <h2 className="text-2xl">{s.heading}</h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} className="mt-3 text-lg leading-relaxed">{p}</p>
              ))}
            </section>
          ))}
        </article>

        <aside className="panel mt-12 p-6">
          <h2 className="text-xl">Try MangaAI with your child</h2>
          <p className="mt-2">Age-right manga, no ads, no chat, and a grown-ups area with reading limits. Free for 7 days.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary">Start free trial</Link>
            <Link href="/manga-for-kids" className="btn">Browse by age</Link>
          </div>
        </aside>

        {others.length ? (
          <nav aria-label="More guides" className="mt-10">
            <h2 className="text-lg">More guides</h2>
            <ul className="mt-2 space-y-1">
              {others.map((o) => (
                <li key={o.slug}><Link href={`/guides/${o.slug}`} className="underline">{o.title}</Link></li>
              ))}
            </ul>
          </nav>
        ) : null}
      </main>
      <PublicFooter />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          dateModified: g.updated,
          datePublished: g.updated,
          author: { "@type": "Organization", name: SITE_NAME, url: siteUrl() },
          publisher: { "@type": "Organization", name: SITE_NAME, url: siteUrl() },
          mainEntityOfPage: `${siteUrl()}/guides/${g.slug}`,
        }}
      />
    </PublicSite>
  );
}
