import Link from "next/link";
import { Logo } from "@/components/ui";
import { CookieSettingsButton } from "@/components/analytics";

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
      <Logo />
      <nav aria-label="Main" className="flex flex-wrap items-center gap-2">
        <Link href="/manga-for-kids" className="btn btn-quiet">Browse by age</Link>
        <Link href="/guides" className="btn btn-quiet">Parent guides</Link>
        <Link href="/login" className="btn btn-quiet">Sign in</Link>
        <Link href="/signup" className="btn btn-primary">Start free trial</Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t-[3px] border-ink bg-paper">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-display">MangaAI</p>
          <p className="mt-1">Stories are created with AI and every page is reviewed by people before publishing.</p>
        </div>
        <nav aria-label="Browse" className="flex flex-col gap-1">
          <Link href="/manga-for-kids">Manga for kids by age</Link>
          <Link href="/manga-for-kids/ages-4-6">Ages 4–6</Link>
          <Link href="/manga-for-kids/ages-7-9">Ages 7–9</Link>
          <Link href="/manga-for-kids/ages-10-12">Ages 10–12</Link>
          <Link href="/manga-for-kids/ages-13-and-up">Ages 13 and up</Link>
        </nav>
        <nav aria-label="Help" className="flex flex-col gap-1">
          <Link href="/guides/is-manga-ok-for-kids">Is manga OK for kids?</Link>
          <Link href="/guides/how-to-read-manga">How to read manga</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <CookieSettingsButton />
          <span className="hint">© {new Date().getFullYear()} MangaAI</span>
        </nav>
      </div>
    </footer>
  );
}
