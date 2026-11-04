import Link from "next/link";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/json-ld";
import { PublicFooter, PublicHeader, PublicSite } from "@/components/public-chrome";
import { publishedSeries, type PublicSeries } from "@/lib/public-data";
import { coverUrl } from "@/lib/storage";
import { visitorPricing, type RegionPricing } from "@/lib/pricing";
import { AGE_BAND_LABELS } from "@/lib/constants";
import { siteUrl } from "@/lib/site";

export const metadata = { alternates: { canonical: "/" } };

/*
  Built from the "Landing page" artboard in the "Kids Manga Subscription — Plan" design canvas.
  Facts are kept in line with the product: age ranges 4–6 / 7–9 / 10–12 / 13+, up to 5 reader profiles,
  local pricing, and a reminder 2 days before the trial ends.
*/

const MAX_READERS = 5;

/** Shown in the library until real series are published (artwork from the design canvas). */
const SAMPLE_SERIES = [
  {
    title: "Sky Island",
    tag: "Adventure · 10–12",
    blurb: "A girl, a fox and a map to islands nobody has ever reached.",
    cover: "/images/landing/cover-sky-islands.jpg",
    alt: "Cover: a girl adventurer and her fox leaping between floating sky islands",
  },
  {
    title: "Goalkeeper",
    tag: "Sports · 7–9",
    blurb: "The clumsiest kid on the team has one shot at the big final.",
    cover: "/images/landing/cover-goalkeeper.jpg",
    alt: "Cover: a boy goalkeeper diving to save a soccer ball",
  },
  {
    title: "Moon Detectives",
    tag: "Mystery · 10–12",
    blurb: "Two friends and a pocket-sized robot crack the city’s strangest cases.",
    cover: "/images/landing/cover-moon-detectives.jpg",
    alt: "Cover: two kid detectives and a small robot under a full moon",
  },
];

/** Real quotes only. The section stays hidden until there are some. */
const TESTIMONIALS: { quote: string; by: string }[] = [];

const FAQ = [
  {
    q: "Is it safe for my child?",
    a: "Yes. Every series is age-rated and every page is reviewed by a person before it's published. There are no ads, no chat and no links out of the app, and kids never enter personal details: just a nickname and an avatar.",
  },
  {
    q: "What ages is it for?",
    a: "Readers aged 4 to 12, in three age ranges (4–6, 7–9 and 10–12), plus a 13+ shelf for young teens. Each child only sees stories for their age and younger, and you can hide any series.",
  },
  {
    q: "Which devices does it work on?",
    a: "Any modern browser on a tablet, phone or laptop. You can add MangaAI to your home screen like an app, and chapters your child has opened recently keep working offline for a week.",
  },
  {
    q: "How do I cancel?",
    a: "From Billing in the grown-ups area, in two clicks. No calls, no emails. Cancel during the free trial and you pay nothing.",
  },
  {
    q: "Can siblings share one subscription?",
    a: `Yes. One plan covers up to ${MAX_READERS} reader profiles, each with its own progress, shelf, streaks and badges.`,
  },
  {
    q: "Are the stories made with AI?",
    a: "Yes, our stories are created with the help of AI tools, and then reviewed page by page by our team before they're published. Each series page says so.",
  },
];

function Check({ stroke = "#111111", size = 22 }: { stroke?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="text-sm font-black tracking-[0.1em] text-[#555555]">{children}</span>;
}

async function getPricing(): Promise<RegionPricing | null> {
  try {
    return await visitorPricing();
  } catch {
    return null; // plans not configured yet
  }
}

function yearlySaving(p: RegionPricing) {
  const full = p.monthly.amount * 12;
  return full > p.annual.amount ? Math.round((1 - p.annual.amount / full) * 100) : 0;
}

function LibraryCard({ href, cover, alt, tag, title, blurb, soon }: { href: string; cover: string | null; alt: string; tag: string; title: string; blurb: string; soon?: boolean }) {
  return (
    <Link href={href} className="flex flex-col gap-3.5 text-ink no-underline">
      <div className="relative border-4 border-ink bg-white shadow-[8px_8px_0_#111111]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={alt} width={532} height={800} loading="lazy" className="block aspect-[2/3] w-full object-cover" />
        ) : (
          <div className="mx-tone grid aspect-[2/3] w-full place-items-center p-6 text-center font-display text-2xl">{title}</div>
        )}
        <span className="absolute left-3 top-3 border-2 border-ink bg-sun px-2.5 py-1 text-[13px] font-black uppercase">{tag}</span>
        {soon ? <span className="absolute bottom-3 right-3 border-2 border-ink bg-white px-2.5 py-1 text-[13px] font-black">Coming soon</span> : null}
      </div>
      <div className="flex flex-col gap-1">
        <strong className="text-[21px]">{title}</strong>
        <span className="leading-normal text-[#444444]">{blurb}</span>
      </div>
    </Link>
  );
}

function firstSentence(text: string) {
  const s = text.trim();
  if (!s) return "";
  const m = s.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : s).trim().slice(0, 140);
}

export default async function Home() {
  const [series, pricing] = await Promise.all([publishedSeries(), getPricing()]);
  const featured: PublicSeries[] = [...series].sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at)).slice(0, 3);
  const monthly = pricing?.monthly.label;
  const annual = pricing?.annual.label;
  const saving = pricing ? yearlySaving(pricing) : 0;
  const priceLine = monthly ? `Then just ${monthly}/month for the whole family. Cancel anytime in two clicks.` : "Cancel anytime in two clicks.";

  return (
    <PublicSite>
      <PublicHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-burst border-b-[3px] border-ink">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-12 px-6 pb-20 pt-16 sm:pt-[72px]">
            <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6">
              <span className="self-start border-2 border-ink bg-white px-3 py-2 text-sm font-black tracking-[0.08em]">FOR AGES 4–12 · KID-SAFE · AD-FREE</span>
              <h1 className="m-0 text-[clamp(44px,6vw,80px)] leading-[1.02]">
                Turn screen time into <span className="mx-mark">reading time.</span>
              </h1>
              <p className="m-0 max-w-[540px] text-[21px] leading-[1.55] text-[#333333]">
                A whole library of action-packed manga made for kids — with new chapters every Friday, a reader built for little
                thumbs, and controls parents actually trust.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="border-[3px] border-ink bg-ink px-7 py-[18px] text-[19px] font-black text-white no-underline shadow-[6px_6px_0_#FFD23F] active:translate-x-0.5 active:translate-y-0.5"
                >
                  Start your 7-day free trial
                </Link>
                <Link href="#library" className="border-[3px] border-ink bg-white px-[22px] py-[18px] text-[17px] font-extrabold text-ink no-underline">
                  Read a free chapter
                </Link>
              </div>
              <p className="m-0 text-[15px] font-semibold text-[#444444]">{priceLine}</p>
            </div>
            <div className="relative min-w-0 flex-[1_1_420px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/landing/hero-kids-reading.jpg"
                alt="Two kids reading a manga comic together on a tablet"
                width={796}
                height={596}
                fetchPriority="high"
                className="block h-auto w-full border-4 border-ink bg-white shadow-[12px_12px_0_#111111]"
              />
              <div className="absolute -bottom-[22px] -left-3.5 -rotate-3 border-[3px] border-ink bg-white px-4 py-3 text-base font-black">
                NEW CHAPTERS EVERY FRIDAY!
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="bg-ink text-white">
          <ul className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 px-6 py-[22px] text-base font-extrabold">
            {[
              ["No ads, ever", <path key="a" d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />],
              ["No chat with strangers", <path key="b" d="M4 4l16 16M9 5h9a2 2 0 0 1 2 2v8M6 7v8a2 2 0 0 0 2 2h7l4 3" />],
              ["Parent PIN & controls", <g key="c"><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></g>],
              ["Age-rated stories", <path key="d" d="M20 6L9 17l-5-5" />],
            ].map(([label, icon]) => (
              <li key={label as string} className="flex items-center gap-2.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFD23F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {icon}
                </svg>
                {label}
              </li>
            ))}
          </ul>
        </section>

        {/* Library */}
        <section id="library" className="scroll-mt-4 px-6 py-24">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
            <div className="flex max-w-[720px] flex-col gap-3">
              <Eyebrow>THE LIBRARY</Eyebrow>
              <h2 className="m-0 text-[clamp(34px,4vw,52px)] leading-[1.08]">Stories they’ll beg to finish.</h2>
              <p className="m-0 text-[19px] leading-[1.55] text-[#333333]">
                Adventure, sports, mystery and laugh-out-loud comedy — every series hand-picked and age-rated, so your kid can browse
                freely.
              </p>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7">
              {featured.length
                ? featured.map((s) => (
                    <LibraryCard
                      key={s.id}
                      href={`/manga/${s.slug}`}
                      cover={coverUrl(s.cover_path)}
                      alt={`${s.title} cover`}
                      tag={`${s.genres[0] ?? "Manga"} · ${AGE_BAND_LABELS[s.age_band].replace("Ages ", "")}`}
                      title={s.title}
                      blurb={firstSentence(s.synopsis)}
                    />
                  ))
                : SAMPLE_SERIES.map((s) => (
                    <LibraryCard key={s.title} href="/manga-for-kids" cover={s.cover} alt={s.alt} tag={s.tag} title={s.title} blurb={s.blurb} soon />
                  ))}
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/signup" className="border-[3px] border-ink bg-ink px-[26px] py-4 text-lg font-black text-white no-underline">
                Unlock the whole library free for 7 days
              </Link>
              <Link href="/manga-for-kids" className="border-[3px] border-ink bg-white px-[22px] py-4 text-lg font-extrabold text-ink no-underline">
                Browse by age
              </Link>
            </div>
          </div>
        </section>

        {/* Three steps */}
        <section className="mx-tone border-y-[3px] border-ink px-6 py-24">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
            <h2 className="m-0 text-center text-[clamp(34px,4vw,52px)] leading-[1.08]">Reading in 3 steps</h2>
            <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 p-0">
              {[
                ["Parent starts the trial", "Sign up in a minute. You won’t be charged during the 7 free days."],
                ["Create kid profiles", "Pick an avatar and age range for each child. They only see stories right for their age."],
                ["Swipe and read", "On tablet, phone or laptop. They pick up right where they left off, every time."],
              ].map(([title, body], i) => (
                <li key={title} className="flex flex-col gap-3 border-[3px] border-ink bg-white p-7">
                  <span className="self-start border-2 border-ink bg-sun px-3.5 py-1 font-display text-5xl leading-none">{i + 1}</span>
                  <h3 className="m-0 text-[22px]">{title}</h3>
                  <p className="m-0 leading-[1.55] text-[#333333]">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* For parents */}
        <section id="parents" className="scroll-mt-4 px-6 py-24">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-14">
            <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5">
              <Eyebrow>FOR PARENTS</Eyebrow>
              <h2 className="m-0 text-[clamp(34px,4vw,52px)] leading-[1.08]">Screen time you can feel good about.</h2>
              <ul className="m-0 flex list-none flex-col gap-[18px] p-0">
                {[
                  ["Weekly reading report", "— pages read, chapters finished and reading streak, straight to your inbox."],
                  ["Age-rated library", "— every title tagged 4–6, 7–9, 10–12 or 13+. Hide any series, set daily reading limits."],
                  ["Zero ads, zero chat", "— no strangers, no pop-ups, no in-app purchases."],
                  ["Privacy first", "— kids use a nickname only. We never sell or share family data."],
                ].map(([strong, rest]) => (
                  <li key={strong} className="flex gap-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-sun">
                      <Check size={18} />
                    </span>
                    <span className="text-lg leading-normal">
                      <strong>{strong}</strong> {rest}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <figure className="m-0 flex min-w-0 flex-[1_1_380px] flex-col gap-[18px] border-4 border-ink bg-white p-7 shadow-[12px_12px_0_#FFD23F]">
              <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-3.5">
                <strong className="text-lg">Weekly report · Kiki</strong>
                <span className="text-[13px] font-extrabold text-[#555555]">EMAIL PREVIEW</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  ["86", "pages read", "bg-[#F2F2F2]"],
                  ["5", "chapters", "bg-[#F2F2F2]"],
                  ["4", "day streak", "bg-sun"],
                ].map(([n, label, bg]) => (
                  <div key={label} className={`${bg} flex flex-col gap-1 px-2 py-4`}>
                    <span className="font-display text-[28px]">{n}</span>
                    <span className="text-[13px] font-extrabold">{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-extrabold text-[#555555]">FAVOURITE THIS WEEK</span>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/images/landing/cover-sky-islands.jpg" alt="" width={56} height={84} loading="lazy" className="h-[84px] w-14 border-2 border-ink object-cover" />
                  <span className="font-extrabold">Sky Island — Vol. 1 finished</span>
                </div>
              </div>
              <figcaption className="text-sm text-[#555555]">An example of the email parents get every Sunday.</figcaption>
            </figure>
          </div>
        </section>

        {/* Retention features */}
        <section className="bg-ink px-6 py-24 text-white">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
            <h2 className="m-0 text-[clamp(34px,4vw,52px)] leading-[1.08]">
              Built so kids keep coming back <span className="text-sun">— to books.</span>
            </h2>
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 p-0">
              {[
                ["Swipe-to-read", "Real manga page turns, zoom, and right-to-left mode."],
                ["Streaks & badges", "Rewards for reading every other day and finishing a series."],
                ["Friday drops", "Fresh chapters every week give them something to look forward to."],
                ["My shelf", "Save favourites and see their new chapters first."],
              ].map(([title, body]) => (
                <li key={title} className="flex flex-col gap-2 border-2 border-white p-6">
                  <strong className="text-[19px] text-sun">{title}</strong>
                  <span className="leading-[1.55] text-[#E6E6E6]">{body}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Testimonials: only real quotes */}
        {TESTIMONIALS.length ? (
          <section className="px-6 py-24">
            <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
              <h2 className="m-0 text-center text-[clamp(30px,3.5vw,44px)]">What families say</h2>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
                {TESTIMONIALS.map((t) => (
                  <figure key={t.by} className="m-0 flex flex-col gap-3.5 border-[3px] border-ink p-7">
                    <blockquote className="m-0 text-lg leading-[1.55] text-[#333333]">{t.quote}</blockquote>
                    <figcaption className="font-extrabold">{t.by}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* Pricing */}
        <section id="pricing" className="mx-burst scroll-mt-4 border-y-[3px] border-ink px-6 py-24">
          <div className="mx-auto flex max-w-[560px] flex-col gap-7">
            <h2 className="m-0 text-center text-[clamp(34px,4vw,52px)] leading-[1.08]">One plan. Everything included.</h2>
            <div className="flex flex-col border-4 border-ink bg-white shadow-[12px_12px_0_#111111]">
              <div className="border-b-4 border-ink bg-sun px-7 py-3.5 text-center font-black tracking-[0.08em]">7 DAYS FREE · CANCEL ANYTIME</div>
              <div className="flex flex-col gap-[22px] px-7 py-8">
                {monthly ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="font-display text-[72px] leading-none">{monthly}</span>
                      <span className="text-xl font-extrabold text-[#444444]">/ month</span>
                    </div>
                    {annual ? (
                      <span className="font-bold text-[#444444]">
                        or {annual}/year{saving ? ` — save ${saving}%` : ""}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <ul className="m-0 flex list-none flex-col gap-3 p-0 text-[17px]">
                  {[
                    "Unlimited access to the whole library",
                    `Up to ${MAX_READERS} kid profiles`,
                    "New chapters every Friday",
                    "Weekly parent reading report",
                    "No ads, no chat, no in-app purchases",
                  ].map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Check />
                      {f}
                    </li>
                  ))}
                </ul>
                <form action="/signup" method="get" className="flex flex-col gap-2.5">
                  <label htmlFor="trial-email" className="text-[15px] font-extrabold">Parent’s email</label>
                  <input
                    id="trial-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="box-border h-[54px] w-full border-[3px] border-ink px-4 text-[17px]"
                  />
                  <button type="submit" className="h-[60px] cursor-pointer border-[3px] border-ink bg-ink text-[19px] font-black text-white hover:bg-[#333]">
                    Start my free trial
                  </button>
                </form>
                <p className="m-0 text-center text-sm leading-normal text-[#444444]">We’ll remind you 2 days before your trial ends.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-4 px-6 py-24">
          <div className="mx-auto flex max-w-[820px] flex-col gap-7">
            <h2 className="m-0 text-center text-[clamp(30px,3.5vw,44px)]">Questions parents ask</h2>
            <div className="flex flex-col gap-3">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-[3px] border-ink px-6 py-5">
                  <summary className="flex items-center justify-between gap-4 text-lg font-black">
                    {f.q}
                    <span aria-hidden className="font-display text-2xl leading-none group-open:rotate-45">+</span>
                  </summary>
                  <p className="mb-0 mt-3.5 leading-[1.6] text-[#333333]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="border-t-[3px] border-ink bg-sun px-6 py-20">
          <div className="mx-auto flex max-w-[900px] flex-col items-center gap-[22px] text-center">
            <h2 className="m-0 text-[clamp(34px,4.5vw,58px)] leading-[1.05]">Their next favourite story is one tap away.</h2>
            <Link href="/signup" className="border-[3px] border-ink bg-ink px-8 py-5 text-xl font-black text-white no-underline shadow-[6px_6px_0_#FFFFFF]">
              Start your 7-day free trial
            </Link>
            <span className="font-extrabold">{monthly ? `${monthly}/month after · ` : ""}Cancel anytime</span>
          </div>
        </section>
      </main>
      <PublicFooter />

      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "Organization", name: "MangaAI", url: siteUrl(), logo: `${siteUrl()}/icons/icon-512.png` },
          { "@context": "https://schema.org", "@type": "WebSite", name: "MangaAI", url: siteUrl(), description: "Safe, ad-free manga for kids with new chapters every week." },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        ]}
      />
    </PublicSite>
  );
}
