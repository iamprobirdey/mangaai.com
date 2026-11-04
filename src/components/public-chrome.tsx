import "@fontsource/dela-gothic-one/latin-400.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-800.css";
import "@fontsource/nunito/latin-900.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { CookieSettingsButton } from "@/components/analytics";

/** Wraps public (marketing and SEO) pages in the landing-page design. */
export function PublicSite({ children }: { children: ReactNode }) {
  return <div className="site-public flex min-h-full flex-1 flex-col">{children}</div>;
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`font-display text-[26px] leading-none no-underline ${light ? "text-white" : "text-ink"}`} aria-label="MangaAI home">
      Manga<span className="ml-0.5 border-2 border-ink bg-sun px-1.5 text-ink">AI</span>
    </Link>
  );
}

export function PublicHeader() {
  return (
    <header className="border-b-[3px] border-ink bg-white">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Wordmark />
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-x-6 gap-y-2 font-extrabold">
          <Link href="/#library" className="no-underline hover:underline">Library</Link>
          <Link href="/#parents" className="no-underline hover:underline">For parents</Link>
          <Link href="/#pricing" className="no-underline hover:underline">Pricing</Link>
          <Link href="/#faq" className="no-underline hover:underline">FAQ</Link>
          <Link href="/login" className="no-underline hover:underline">Log in</Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center bg-ink px-[18px] py-3 text-white no-underline hover:bg-[#333]"
          >
            Start free trial
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-ink px-6 py-10 text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <span className="font-display text-xl">MangaAI</span>
          <nav aria-label="Footer" className="flex flex-wrap gap-5 font-semibold">
            <Link href="/privacy" className="text-white">Privacy policy</Link>
            <Link href="/privacy#children" className="text-white">Children&apos;s privacy</Link>
            <Link href="/terms" className="text-white">Terms</Link>
            <a href="mailto:hello@mangaai.com" className="text-white">Contact</a>
          </nav>
          <span className="text-sm text-[#cccccc]">© {new Date().getFullYear()} mangaai.com</span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#333] pt-6 text-sm text-[#cccccc]">
          <Link href="/manga-for-kids" className="text-[#cccccc]">Manga for kids by age</Link>
          <Link href="/manga-for-kids/ages-4-6" className="text-[#cccccc]">Ages 4–6</Link>
          <Link href="/manga-for-kids/ages-7-9" className="text-[#cccccc]">Ages 7–9</Link>
          <Link href="/manga-for-kids/ages-10-12" className="text-[#cccccc]">Ages 10–12</Link>
          <Link href="/manga-for-kids/ages-13-and-up" className="text-[#cccccc]">Ages 13+</Link>
          <Link href="/guides/is-manga-ok-for-kids" className="text-[#cccccc]">Is manga OK for kids?</Link>
          <Link href="/guides/how-to-read-manga" className="text-[#cccccc]">How to read manga</Link>
          <span className="[&_button]:text-[#cccccc]"><CookieSettingsButton /></span>
        </div>
        <p className="text-sm text-[#cccccc]">Stories are created with AI tools and every page is reviewed by a person before it&apos;s published.</p>
      </div>
    </footer>
  );
}
