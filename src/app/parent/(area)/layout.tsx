import Link from "next/link";
import { Logo } from "@/components/ui";
import { requireParentUnlocked } from "@/lib/dal";
import { lockAndExit } from "../actions";

const NAV = [
  ["/parent", "Overview"],
  ["/parent/readers", "Readers"],
  ["/parent/billing", "Billing"],
  ["/parent/settings", "Settings"],
] as const;

export default async function ParentLayout({ children }: LayoutProps<"/parent">) {
  await requireParentUnlocked();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b-[3px] border-ink bg-paper">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Logo href="/parent" />
          <nav aria-label="Grown-ups" className="flex flex-wrap items-center gap-1">
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="rounded-full px-3 py-2 font-bold hover:bg-tone">
                {label}
              </Link>
            ))}
            <form action={lockAndExit}>
              <button className="btn ml-2" type="submit">Lock and go to readers</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
