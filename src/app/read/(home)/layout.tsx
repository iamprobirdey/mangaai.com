import Link from "next/link";
import { Logo } from "@/components/ui";
import { requireChild } from "@/lib/dal";
import { childSummary } from "@/lib/reading";
import { avatarEmoji } from "@/lib/constants";

export const metadata = { robots: { index: false, follow: false } };

export default async function KidLayout({ children }: LayoutProps<"/read">) {
  const child = await requireChild();
  const summary = await childSummary(child);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo href="/read" />
          <nav aria-label="Reader" className="flex flex-wrap items-center gap-2">
            <Link href="/read/badges" className="tag gap-1 px-3 py-1 text-base" title="Your reading streak">
              <span aria-hidden>🔥</span> {summary.streak} {summary.streak === 1 ? "day" : "days"}
            </Link>
            <Link href="/read/badges" className="tag gap-1 px-3 py-1 text-base">
              <span aria-hidden>🏅</span> {summary.badges.length} {summary.badges.length === 1 ? "badge" : "badges"}
            </Link>
            <Link href="/profiles" className="flex items-center gap-2 rounded-full border-[3px] border-ink bg-sun py-1 pl-1 pr-3 font-bold" title="Switch reader">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-paper text-xl" aria-hidden>
                {avatarEmoji(child.avatar)}
              </span>
              {child.nickname}
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
