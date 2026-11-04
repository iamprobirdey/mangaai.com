import Link from "next/link";
import { Cover } from "@/components/ui";
import { JsonLd } from "@/components/json-ld";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { siteUrl } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";
import { coverUrl } from "@/lib/storage";
import { visitorPricing, type RegionPricing } from "@/lib/pricing";
import { AGE_BAND_LABELS, type AgeBand } from "@/lib/constants";

export const metadata = { alternates: { canonical: "/" } };

type ShowcaseSeries = { slug: string; title: string; cover_path: string | null; age_band: AgeBand };

async function getShowcase(): Promise<ShowcaseSeries[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("series")
      .select("slug,title,cover_path,age_band")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(8);
    return (data ?? []) as ShowcaseSeries[];
  } catch {
    return [];
  }
}

const PLACEHOLDER_PANELS = [
  { title: "Moon Cat Detectives", art: "🐱🌙" },
  { title: "Robot Soccer Club", art: "🤖⚽" },
  { title: "The Tiny Dragon Bakery", art: "🐲🍞" },
];

async function getPricing(): Promise<RegionPricing | null> {
  try {
    return await visitorPricing();
  } catch {
    return null; // plans not configured yet
  }
}

export default async function Home() {
  const [series, pricing] = await Promise.all([getShowcase(), getPricing()]);
  const monthly = pricing?.monthly.label;
  const annual = pricing?.annual.label;
  const panels = series.slice(0, 3);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <main className="flex-1">
        {/* Hero: a manga page. Headline in a speech bubble, series in tilted panels. */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="bubble max-w-xl">
              <h1 className="text-3xl sm:text-5xl">Manga made for kids, with new chapters every week.</h1>
            </div>
            <p className="mt-10 max-w-lg text-lg">
              Grown-ups sign up and pay. Kids get their own reader profile with age-right stories, a bookshelf and
              reading streaks. No ads, no chat, no strangers.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary text-lg">
                Try 7 days free
              </Link>
              {pricing ? <span className="hint">Then {monthly}/month or {annual}/year. Cancel anytime.</span> : null}
            </div>
          </div>

          <div className="screentone relative grid h-[420px] grid-cols-2 grid-rows-[1.2fr_1fr] gap-3 rounded-xl border-[3px] border-ink bg-paper p-3 sm:h-[480px]">
            {[0, 1, 2].map((i) => {
              const s = panels[i];
              const ph = PLACEHOLDER_PANELS[i];
              const area = i === 0 ? "col-span-2" : "";
              const tilt = i === 1 ? "-rotate-1" : i === 2 ? "rotate-1" : "";
              return (
                <div key={i} className={`${area} ${tilt} relative overflow-hidden rounded-md border-[3px] border-ink bg-paper`}>
                  {s?.cover_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverUrl(s.cover_path)!} alt={s.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center bg-tone p-4 text-center">
                      <span className="text-5xl sm:text-6xl" aria-hidden>
                        {ph.art}
                      </span>
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 rounded-md border-2 border-ink bg-sun px-2 py-0.5 text-sm font-bold">
                    {s?.title ?? ph.title}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-y-[3px] border-ink bg-paper">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
            <h2 className="text-2xl md:col-span-3">How it works</h2>
            {[
              ["Sign up as a grown-up", "Create the family account and start the free trial. Only you see billing and settings."],
              ["Add your readers", "Pick a nickname, an animal avatar and an age range for each child. That's all we ask."],
              ["They read, you see it", "Kids swipe through real manga pages. Every Sunday you get an email about what they read."],
            ].map(([title, body], i) => (
              <div key={title} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-sun font-display">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg">{title}</h3>
                  <p className="mt-1">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {series.length > 0 ? (
          <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl">On the shelf now</h2>
            <ul className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
              {series.map((s) => (
                <li key={s.slug}>
                  <Link href={`/manga/${s.slug}`} className="block">
                    <Cover src={coverUrl(s.cover_path)} title={s.title} />
                    <p className="mt-2 font-bold">{s.title}</p>
                    <p className="hint">{AGE_BAND_LABELS[s.age_band]}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl">Grown-ups stay in charge</h2>
            <ul className="mt-5 space-y-3 text-lg">
              <li>A 4-digit PIN keeps kids out of billing and settings.</li>
              <li>Each reader only sees stories for their age range. Hide any series you don&apos;t want.</li>
              <li>Set a daily reading time limit per child.</li>
              <li>We never ask for a child&apos;s real name, photo, birthday or email.</li>
            </ul>
          </div>
          <div className="panel p-6" id="pricing">
            <h2 className="text-2xl">One plan for the whole family</h2>
            <p className="mt-2">Up to 5 reader profiles. Every series, every chapter.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="panel-flat p-4">
                <div className="font-display text-3xl">{monthly ?? "—"}</div>
                <div className="hint">per month</div>
              </div>
              <div className="panel-flat border-leaf p-4">
                <div className="font-display text-3xl">{annual ?? "—"}</div>
                <div className="hint">per year, the best value</div>
              </div>
            </div>
            <Link href="/signup" className="btn btn-primary mt-6 w-full">
              Start your 7-day free trial
            </Link>
            <p className="hint mt-3">We remind you before the trial ends. Cancel anytime from the grown-ups area.</p>
          </div>
        </section>
      </main>

      <PublicFooter />
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MangaAI",
            url: siteUrl(),
            logo: `${siteUrl()}/icons/icon-512.png`,
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MangaAI",
            url: siteUrl(),
            description: "Safe, ad-free manga for kids with new chapters every week.",
          },
        ]}
      />
    </div>
  );
}
